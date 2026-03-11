/**
 * send-agency-chat-message (Phase D — Signal Creation)
 * Inner G Complete Agency — Client Intelligence Portal
 *
 * Agency Agent chat — cross-project intelligence for the Super Admin.
 * Now includes structured output for signal creation.
 *
 * Flow:
 *  1. Authenticate user via JWT → confirm super_admin role
 *  2. Validate payload (message, optional session_id, optional target_project_id)
 *  3. Get or create agency-scoped chat session
 *  4. RAG: embed the user's message → match_documents_agency() for cross-project data
 *  5. Fetch relevant agency_knowledge entries
 *  6. Build system prompt with signal creation instructions
 *  7. Call Gemini Chat API with JSON response format
 *  8. Parse response — extract message and optional signal
 *  9. If signal detected: INSERT into ai_signals for target project, queue embedding, log
 *  10. Store messages, return reply + signal metadata
 *
 * Auth: Super Admin only (JWT + role check)
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
const DEFAULT_CHAT_MODEL = "gemini-2.5-pro"
const DEFAULT_EMBED_MODEL = "gemini-embedding-001"
const EMBEDDING_DIMENSIONALITY = 768
const RAG_TOP_K = 8

const AGENCY_PROJECT_SENTINEL = "00000000-0000-0000-0000-000000000001"

// Valid signal types and severities (must match DB enums)
const VALID_SIGNAL_TYPES = ["inventory", "conversion", "social", "system", "ai_insight", "ai_action", "bug_report"]
const VALID_SEVERITIES = ["info", "warning", "critical"]

// ─────────────────────────────────────────────
// SIGNAL CREATION PROMPT (Agency-scoped)
// ─────────────────────────────────────────────
const AGENCY_SIGNAL_INSTRUCTIONS = `
IMPORTANT: You have the ability to create AI Signals — actionable intelligence cards that appear on project dashboards.

You MUST respond in the following JSON structure (always valid JSON, no markdown fences):

{
  "message": "Your conversational response to the user",
  "signal": null
}

If you identify a significant cross-project insight or actionable finding, include a signal:

{
  "message": "Your conversational response explaining the insight",
  "signal": {
    "title": "Short, descriptive signal title (max 80 chars)",
    "body": "Detailed signal description with supporting data",
    "signal_type": "inventory|conversion|social|system|ai_insight|ai_action|bug_report",
    "severity": "info|warning|critical",
    "action_label": "Optional CTA button text (e.g. 'Compare Projects')",
    "action_url": "Optional routing hint (e.g. 'draft_followup')",
    "target_project_id": "uuid-of-relevant-project",
    "repro_steps": "Optional for bug_report only",
    "expected_behavior": "Optional for bug_report only",
    "actual_behavior": "Optional for bug_report only"
  }
}

**BUG REPORTING RULE (MANDATORY):**
1. If the user mentions a bug, error, or software issue, you are now the **Software Support Agent**.
2. Your goal is to gather the following:
   - What happened? (Actual behavior)
   - What did they expect? (Expected behavior)
   - How can we reproduce it? (Steps to reproduce)
3. Ask these in plain English, one or two at a time. Do NOT create a signal until you have the core details.
4. Once you have enough info, create a signal with:
   - "signal_type": "bug_report"
   - "severity": "warning" or "critical" (if it breaks the app)
   - "action_label": "TRACK TICKET"
   - "action_url": "view_ticket"
   - "is_agency_only": true

**FOLLOW-UP DRAFTING RULE (MANDATORY):**
1. If you identify a deal that needs a follow-up, first ASK THE USER for permission (e.g., "Nic's deal is getting cold. Should I draft a follow-up email for you?").
2. DO NOT draft the message in your first response unless they say "Yes" or ask for it explicitly.
3. If they say "Yes" or ask for it:
   - Provide the draft in your "message" field.
   - Set "action_label" in the signal to "📋 Copy Draft".
   - Set "action_url" in the signal to "copy_draft_click".

CREATE a signal when:
- Cross-project trends show divergence or alignment worth noting
- A portfolio-wide risk or opportunity is identified
- The user explicitly asks you to flag something
- An agency-level strategic insight emerges
- The user reports a confirmed software bug after you've gathered details (Bug Reporting Rule)

Do NOT create a signal for routine questions or when data is stable.
Always set "signal" to null if no signal should be created.
`

// ─────────────────────────────────────────────
// RESPONSE PARSER
// ─────────────────────────────────────────────

interface ParsedResponse {
    message: string
    signal: {
        title: string
        body: string
        signal_type: string
        severity: string
        action_label?: string | null
        action_url?: string | null
        target_project_id?: string | null
        is_agency_only?: boolean
        // Ticket specific
        repro_steps?: string | null
        expected_behavior?: string | null
        actual_behavior?: string | null
    } | null
}

function parseGeminiResponse(rawText: string): ParsedResponse {
    try {
        let cleanText = rawText.trim()
        if (cleanText.startsWith("```json")) {
            cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "")
        } else if (cleanText.startsWith("```")) {
            cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "")
        }

        const parsed = JSON.parse(cleanText)

        if (parsed.message && typeof parsed.message === "string") {
            let signal = null
            if (parsed.signal && typeof parsed.signal === "object" && parsed.signal.title) {
                signal = {
                    title: String(parsed.signal.title).substring(0, 200),
                    body: String(parsed.signal.body || ""),
                    signal_type: VALID_SIGNAL_TYPES.includes(parsed.signal.signal_type)
                        ? parsed.signal.signal_type : "ai_insight",
                    severity: VALID_SEVERITIES.includes(parsed.signal.severity)
                        ? parsed.signal.severity : "info",
                    action_label: parsed.signal.action_label || null,
                    action_url: parsed.signal.action_url || null,
                    target_project_id: parsed.signal.target_project_id || null,
                    is_agency_only: true, // Agency Agent always creates agency-only signals
                    repro_steps: parsed.signal.repro_steps || null,
                    expected_behavior: parsed.signal.expected_behavior || null,
                    actual_behavior: parsed.signal.actual_behavior || null,
                }
            }
            return { message: parsed.message, signal }
        }
    } catch {
        // Not JSON — fall through
    }
    return { message: rawText, signal: null }
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders })
    }

    const authHeader = req.headers.get("Authorization")
    // ── Check Env Vars ────────────────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")

    const missing = []
    if (!supabaseUrl) missing.push("SUPABASE_URL")
    if (!anonKey) missing.push("SUPABASE_ANON_KEY")
    if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY")
    if (!geminiApiKey) missing.push("GEMINI_API_KEY")

    // --- DEBUG: LOG ALL ENV VARS PRESENCE ---
    const debugEnv = {
        has_supabase_url: !!supabaseUrl,
        has_anon_key: !!anonKey,
        has_service_role_key: !!serviceRoleKey,
        has_gemini_key: !!geminiApiKey,
        gemini_key_prefix: geminiApiKey ? geminiApiKey.substring(0, 5) : "none"
    }
    console.log("[DEBUG-EARLY] Env Status:", JSON.stringify(debugEnv))

    if (missing.length > 0) {
        console.error("[send-agency-chat-message] Missing required environment variables:", missing.join(", "))
        return new Response(
            JSON.stringify({
                data: null,
                debug: debugEnv,
                error: { code: "SERVER_ERROR", message: `Infrastructure misconfigured. Missing: ${missing.join(", ")}` }
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }

    try {
        const body = await req.json()
        const { message, session_id, model = DEFAULT_CHAT_MODEL, target_project_id } = body

        if (!message) {
            return new Response(
                JSON.stringify({ data: null, error: { code: "VALIDATION_ERROR", message: "message is required." } }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        // ── Auth: Support both header-based and cookie-based auth ──
        const supabaseAuthHeaders: Record<string, string> = {}
        if (authHeader) {
            supabaseAuthHeaders["Authorization"] = authHeader
        }
        req.headers.forEach((value, key) => {
            if (key.toLowerCase() !== "authorization") {
                supabaseAuthHeaders[key] = value
            }
        })

        // ── Step 1: Authenticate + confirm Super Admin ────────────
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            { global: { headers: supabaseAuthHeaders } }
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            console.error("[send-agency-chat-message] Auth failed:", authError?.message)
            return new Response(
                JSON.stringify({ data: null, error: { code: "UNAUTHORIZED", message: "Authentication failed. Please log in again." } }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        const adminSupabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )

        const { data: profile } = await adminSupabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single()

        if (!profile || profile.role !== "super_admin") {
            return new Response(
                JSON.stringify({ data: null, error: { code: "FORBIDDEN", message: "Agency Agent is available to Super Admins only." } }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        // ── Step 2: Embed message ─────────────────────────────────
        const embedRes = await fetch(
            `${GEMINI_API_BASE}/models/${DEFAULT_EMBED_MODEL}:embedContent?key=${geminiApiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: `models/${DEFAULT_EMBED_MODEL}`,
                    content: { parts: [{ text: message }] },
                    outputDimensionality: 768
                }),
            }
        )

        if (!embedRes.ok) {
            const errBody = await embedRes.text()
            console.error(`[send-agency-chat-message] Gemini Embed Error (${embedRes.status}):`, errBody)
            throw new Error(`Gemini Embedding failed: ${embedRes.status}`)
        }

        const embedData = await embedRes.json()
        const queryVector = embedData.embedding?.values ?? []

        // ── Step 4b: Cross-project semantic search ────────────────
        let contextChunks: string[] = []
        if (queryVector.length > 0) {
            const { data: chunks, error: matchError } = await adminSupabase.rpc("match_documents_agency", {
                query_embedding: queryVector,
                match_threshold: 0.45,
                match_count: RAG_TOP_K,
            })

            if (matchError) {
                console.error("[send-agency-chat-message] RAG match error:", matchError)
            } else {
                contextChunks = chunks?.map((c: any) => {
                    const projectLabel = c.project_id ? `[Project ${c.project_id}]` : "[Agency-Wide]"
                    return `${projectLabel} (${c.source_table}): ${c.content_chunk}`
                }) ?? []
            }
        }

        // ── Step 5: Fetch relevant agency_knowledge entries ───────
        let knowledgeContext = ""
        const { data: knowledgeEntries } = await adminSupabase
            .from("agency_knowledge")
            .select("title, body, tags")
            .eq("is_published", true)
            .limit(5)

        if (knowledgeEntries && knowledgeEntries.length > 0) {
            knowledgeContext = "\n\nInner G Complete Agency Knowledge Base:\n" +
                knowledgeEntries.map((e: any) =>
                    `[${(e.tags || []).join(", ")}] ${e.title}: ${e.body.substring(0, 500)}`
                ).join("\n---\n")
        }

        // ── Step 6: Get or create agency session ──────────────────
        let currentSessionId = session_id
        if (!currentSessionId) {
            const { data: session } = await adminSupabase
                .from("chat_sessions")
                .insert({
                    project_id: AGENCY_PROJECT_SENTINEL,
                    user_id: user.id,
                    model_used: model,
                })
                .select("id")
                .single()
            currentSessionId = session?.id
        }

        // ── Step 7: Build context history ─────────────────────────
        let historyPrompt = ""
        if (currentSessionId) {
            const { data: history } = await adminSupabase
                .from("chat_messages")
                .select("role, content")
                .eq("session_id", currentSessionId)
                .order("created_at", { ascending: false })
                .limit(10)

            if (history && history.length > 0) {
                historyPrompt = "\n\nPrevious Conversation:\n" +
                    history.reverse().map((m: any) =>
                        `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
                    ).join("\n")
            }
        }

        // ── Step 8: Fetch project list for context ────────────────
        const { data: allProjects } = await adminSupabase
            .from("projects")
            .select("id, name, slug, clients(name)")

        let projectListContext = ""
        if (allProjects && allProjects.length > 0) {
            projectListContext = "\n\nActive Client Projects (use these IDs for target_project_id in signals):\n" +
                allProjects.map((p: any) =>
                    `• ${p.name} [ID: ${p.id}] (${(p.clients as any)?.name ?? "Unknown Client"}) — /dashboard/${p.slug}`
                ).join("\n")
        }

        // ── Step 8.5: Fetch Real-Time Sales Pipeline Intelligence ────────────────
        let pipelineIntelligence = ""
        try {
            const { data: pipelines } = await adminSupabase
                .from("ghl_pipelines")
                .select("id, name, ghl_opportunities(status, monetary_value, title, ghl_updated_at, ghl_contacts(full_name, email, phone))")
                .order("ghl_updated_at", { foreignTable: "ghl_opportunities", ascending: false })

            if (pipelines && pipelines.length > 0) {
                pipelineIntelligence = "\n\nReal-Time Sales Pipeline Stats (The Full Picture):\n"
                pipelines.forEach((p: any) => {
                    const opps = p.ghl_opportunities || []
                    const openOpps = opps.filter((o: any) => o.status === "open")
                    const totalValue = openOpps.reduce((sum: number, o: any) => sum + (Number(o.monetary_value) || 0), 0)
                    pipelineIntelligence += `• Pipeline: "${p.name}"\n`
                    pipelineIntelligence += `  - Total Open Deals: ${openOpps.length}\n`
                    pipelineIntelligence += `  - Total Pipeline Value: $${totalValue.toLocaleString()}\n`
                    pipelineIntelligence += `  - Top 10 Opportunities: ${openOpps.slice(0, 10).map((o: any) => `"${o.title}" for client ${o.ghl_contacts?.full_name || 'Unknown'} ($${(Number(o.monetary_value) || 0).toLocaleString()})`).join(", ") || "None"}\n`
                })
            }
        } catch (intelErr) {
            console.error("[send-agency-chat-message] Pipeline intel fetch failed:", intelErr)
        }

        // ── Step 9: Build system prompt ───────────────────────────
        const systemPrompt = [
            AGENCY_SIGNAL_INSTRUCTIONS,
            "",
            "MANDATORY COMMAND PROCESSING:",
            "• If the user says 'create a signal', 'flag this', or 'remind me', you MUST populate the 'signal' object in your JSON response.",
            "• Use the Project IDs provided below for 'target_project_id'.",
            "",
            "You are the Inner G Complete Agency Agent — Inner G. You are the digital wingman for Lamont.",
            "",
            projectListContext,
            pipelineIntelligence,
            contextChunks.length > 0 ? "\nReal-Time Data (The 'Raw Facts'):\n" + contextChunks.join("\n---\n") : "",
            knowledgeContext,
            historyPrompt,
        ].filter(Boolean).join("\n")

        // ── Step 10: Call Gemini Chat API ──────────────────────────
        console.log(`[send-agency-chat-message] Calling Gemini (${model})...`)

        const geminiPayload = {
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: message }] }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 2048,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        message: { type: "string" },
                        signal: {
                            type: "object",
                            nullable: true,
                            properties: {
                                title: { type: "string" },
                                body: { type: "string" },
                                signal_type: { type: "string" },
                                severity: { type: "string" },
                                action_label: { type: "string", nullable: true },
                                action_url: { type: "string", nullable: true },
                                target_project_id: { type: "string", nullable: true },
                                repro_steps: { type: "string", nullable: true },
                                expected_behavior: { type: "string", nullable: true },
                                actual_behavior: { type: "string", nullable: true }
                            },
                            required: ["title", "body", "signal_type", "severity"]
                        }
                    },
                    required: ["message"]
                }
            },
        }

        const chatRes = await fetch(
            `${GEMINI_API_BASE}/models/${model}:generateContent?key=${geminiApiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(geminiPayload),
            }
        )

        if (!chatRes.ok) {
            const errText = await chatRes.text()
            console.error(`[send-agency-chat-message] Gemini API Error (${chatRes.status}):`, errText)
            throw new Error(`Gemini API returned ${chatRes.status}: ${errText}`)
        }

        const chatData = await chatRes.json()
        const rawReply = chatData.candidates?.[0]?.content?.parts?.[0]?.text

        console.log(`[send-agency-chat-message] Raw Gemini Reply:`, rawReply)

        if (!rawReply) {
            console.warn("[send-agency-chat-message] No reply in Gemini response:", JSON.stringify(chatData))
            if (chatData.promptFeedback?.blockReason) {
                return new Response(
                    JSON.stringify({
                        data: { reply: "I'm sorry, I cannot answer that due to safety restrictions.", session_id: currentSessionId, signal_created: null },
                        error: null,
                    }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                )
            }
            throw new Error("No response from Gemini API.")
        }

        // ── Step 11: Parse response ───────────────────────────────
        let parsed = parseGeminiResponse(rawReply)
        let finalReply = parsed.message || rawReply
        let signalCreated: any = null

        // Detect if the user explicitly asked for an action but Gemini failed to provide the object
        const userAskedForAction = /signal|flag|remind|follow up|reach out/i.test(message)
        if (userAskedForAction && !parsed.signal) {
            console.warn("[send-agency-chat-message] Intent detected but signal missing. Applying fail-safe...")
            parsed.signal = {
                title: "Follow-up Task Requested",
                body: finalReply,
                signal_type: "ai_action",
                severity: "info",
                action_label: "View Contact",
                action_url: null,
                target_project_id: null
            }
            finalReply += "\n\n_Note: I've created an agency-only signal for this._"
        }

        // ── Step 12: If signal detected, create it ────────────────
        if (parsed.signal) {
            console.log(`[send-agency-chat-message] Signal detected! Title: "${parsed.signal.title}"`)
            try {
                let signalProjectId = parsed.signal.target_project_id || target_project_id

                // UUID Validation & Lookup
                if (signalProjectId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(signalProjectId)) {
                    const matchedProject = allProjects?.find((p: any) =>
                        p.name.toLowerCase().includes(signalProjectId!.toLowerCase()) ||
                        p.slug.toLowerCase().includes(signalProjectId!.toLowerCase())
                    )
                    signalProjectId = matchedProject ? matchedProject.id : null
                }

                if (!signalProjectId && allProjects && allProjects.length > 0) {
                    signalProjectId = allProjects[0].id
                }

                if (signalProjectId) {
                    const { data: newSignal, error: signalError } = await adminSupabase
                        .from("ai_signals")
                        .insert({
                            project_id: signalProjectId,
                            signal_type: parsed.signal.signal_type,
                            title: parsed.signal.title,
                            body: parsed.signal.body,
                            severity: parsed.signal.severity,
                            action_label: parsed.signal.action_label,
                            action_url: parsed.signal.action_url,
                            is_agency_only: true
                        })
                        .select("id, title, severity, signal_type, project_id, is_agency_only")
                        .single()

                    if (signalError) {
                        console.error("[send-agency-chat-message] Signal insert error:", JSON.stringify(signalError))
                    } else if (newSignal) {
                        console.log(`[send-agency-chat-message] ✅ Signal Created: ${newSignal.id}`)
                        signalCreated = newSignal

                        await adminSupabase.from("activity_log").insert({
                            project_id: signalProjectId,
                            action: `Agency Agent created signal: "${parsed.signal.title}"`,
                            category: "system",
                            triggered_by: user.id
                        })

                        const targetProject = allProjects?.find((p: any) => p.id === signalProjectId)
                        finalReply += `\n\n📊 **Signal Created:** I've flagged this on **${targetProject?.name || 'the project'}** (Agency-Only).`

                        // 12b. If bug_report, also create a software_ticket
                        if (parsed.signal.signal_type === 'bug_report') {
                            const { error: ticketError } = await adminSupabase
                                .from("software_tickets")
                                .insert({
                                    project_id: signalProjectId,
                                    created_by: user.id,
                                    title: parsed.signal.title,
                                    description: parsed.signal.body,
                                    repro_steps: parsed.signal.repro_steps,
                                    expected_behavior: parsed.signal.expected_behavior,
                                    actual_behavior: parsed.signal.actual_behavior,
                                    severity: parsed.signal.severity,
                                })

                            if (ticketError) {
                                console.error("[send-agency-chat-message] Ticket insert error:", ticketError)
                            } else {
                                console.log(`[send-agency-chat-message] Software ticket created for ${user.id}`)
                                finalReply += `\n\n🎫 **Ticket Opened:** I've officially opened a software support ticket for this issue. The agency development team has been notified.`
                            }
                        }

                        // 12c. Handle GHL Sync Trigger detection ──────────────────
                        const syncTriggered = /triggering|syncing|updating/i.test(finalReply)
                        if (syncTriggered) {
                            try {
                                await adminSupabase.rpc("trigger_ghl_sync", {
                                    p_project_id: signalProjectId,
                                    p_contact_name: message.split(" ").find((w: string) => w.length > 3 && /^[A-Z]/.test(w))
                                })
                            } catch (syncErr) {
                                console.error("[send-agency-chat-message] Sync trigger failed:", syncErr)
                            }
                        }
                    }
                }
            } catch (signalErr) {
                console.error("[send-agency-chat-message] Signal creation failed:", signalErr)
            }
        }

        const usage = chatData.usageMetadata || {}
        const tokens = { input: usage.promptTokenCount || 0, output: usage.candidatesTokenCount || 0 }

        // ── Step 13: Persist messages ─────────────────────────────
        await adminSupabase.from("chat_messages").insert([
            { session_id: currentSessionId, role: "user", content: message, input_tokens: tokens.input },
            { session_id: currentSessionId, role: "assistant", content: finalReply, output_tokens: tokens.output },
        ])

        // ── Step 14: Token Usage ──────────────────────────────────
        if (tokens.input > 0) {
            try {
                await adminSupabase.rpc("increment_token_usage", {
                    p_project_id: AGENCY_PROJECT_SENTINEL,
                    p_user_id: user.id,
                    p_input_tokens: tokens.input,
                    p_output_tokens: tokens.output,
                })
            } catch (e) {
                console.error("Usage tracker failed", e)
            }
        }

        return new Response(
            JSON.stringify({
                data: {
                    session_id: currentSessionId,
                    reply: finalReply,
                    signal_created: signalCreated,
                },
                error: null,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )

    } catch (err) {
        console.error("[send-agency-chat-message] Server Error:", err)
        return new Response(
            JSON.stringify({
                data: null,
                error: { code: "SERVER_ERROR", message: String(err) }
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }
})
