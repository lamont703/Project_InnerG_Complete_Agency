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
const DEFAULT_CHAT_MODEL = "gemini-2.5-flash-lite"
const DEFAULT_EMBED_MODEL = "text-embedding-004"
const RAG_TOP_K = 8

const AGENCY_PROJECT_SENTINEL = "00000000-0000-0000-0000-000000000001"

// Valid signal types and severities (must match DB enums)
const VALID_SIGNAL_TYPES = ["inventory", "conversion", "social", "system", "ai_insight", "ai_action"]
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
    "signal_type": "inventory|conversion|social|system|ai_insight|ai_action",
    "severity": "info|warning|critical",
    "action_label": "Optional CTA button text (e.g. 'Compare Projects')",
    "action_url": null,
    "target_project_id": "uuid-of-relevant-project or null for first active project"
  }
}

CREATE a signal when:
- Cross-project trends show divergence or alignment worth noting
- A portfolio-wide risk or opportunity is identified
- The user explicitly asks you to flag something
- An agency-level strategic insight emerges

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
    const allHeaders = Object.fromEntries(req.headers.entries())
    console.log("[send-agency-chat-message] Headers received:", JSON.stringify({
        ...allHeaders,
        authorization: authHeader ? "Bearer (hidden)" : "missing"
    }))

    // ── Auth: Support both header-based and cookie-based auth ──
    const supabaseAuthHeaders: Record<string, string> = {}
    if (authHeader) {
        supabaseAuthHeaders["Authorization"] = authHeader
    }
    // Forward all request headers (important for SSR cookie-based auth)
    req.headers.forEach((value, key) => {
        if (key.toLowerCase() !== "authorization") {
            supabaseAuthHeaders[key] = value
        }
    })

    try {
        const body = await req.json()
        const { message, session_id, model = DEFAULT_CHAT_MODEL, target_project_id } = body

        if (!message) {
            return new Response(
                JSON.stringify({ data: null, error: { code: "VALIDATION_ERROR", message: "message is required." } }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

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

        const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!

        // ── Step 4: RAG — embed the user message ──────────────────
        const embedRes = await fetch(
            `${GEMINI_API_BASE}/models/${DEFAULT_EMBED_MODEL}:embedContent?key=${geminiApiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: `models/${DEFAULT_EMBED_MODEL}`,
                    content: { parts: [{ text: message }] },
                }),
            }
        )
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

        // ── Step 9: Build system prompt ───────────────────────────
        const systemPrompt = [
            "You are the Inner G Complete Agency Agent — a senior strategic AI analyst for the Inner G Complete digital services agency.",
            "You have cross-project visibility across ALL client portfolios. You help the agency owner (Lamont) make strategic decisions about services, resource allocation, and client growth.",
            "",
            "Your capabilities:",
            "• Analyse campaign metrics, AI signals, funnel performance, and CRM data across ALL projects.",
            "• Reference agency methodology, SOPs, and best practices from the knowledge base.",
            "• Compare project performance, identify trends, and recommend cross-project strategies.",
            "• Flag risks and opportunities across the entire portfolio.",
            "• Create AI Signals that appear on specific project dashboards.",
            "",
            "Response style:",
            "• Be concise, data-driven, and actionable.",
            "• When referencing data, cite the source (e.g., 'From project XYZ's campaign metrics').",
            "• If you don't have data for a specific question, say so — don't fabricate numbers.",
            projectListContext,
            AGENCY_SIGNAL_INSTRUCTIONS,
            contextChunks.length > 0 ? "\nCross-Project Data Context:\n" + contextChunks.join("\n---\n") : "",
            knowledgeContext,
            historyPrompt,
        ].filter(Boolean).join("\n")

        // ── Step 10: Call Gemini Chat API ──────────────────────────
        console.log(`[send-agency-chat-message] Calling Gemini (${model}) with signal creation...`)

        const geminiPayload = {
            contents: [
                { role: "user", parts: [{ text: `${systemPrompt}\n\nUser: ${message}` }] },
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096,
                responseMimeType: "application/json",
            },
        }

        let chatRes = await fetch(
            `${GEMINI_API_BASE}/models/${model}:generateContent?key=${geminiApiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(geminiPayload),
            }
        )

        let chatData = await chatRes.json()

        if (chatRes.status === 404 && model !== "gemini-1.5-flash") {
            const fallbackModel = "gemini-1.5-flash"
            console.warn(`[send-agency-chat-message] Model ${model} failed (404). Falling back to ${fallbackModel}...`)
            chatRes = await fetch(
                `${GEMINI_API_BASE}/models/${fallbackModel}:generateContent?key=${geminiApiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(geminiPayload),
                }
            )
            chatData = await chatRes.json()
        }

        if (!chatRes.ok) {
            console.error("[send-agency-chat-message] Gemini API Error:", chatData)
            throw new Error(`Gemini API returned ${chatRes.status}: ${chatData.error?.message || "Unknown error"}`)
        }

        const rawReply = chatData.candidates?.[0]?.content?.parts?.[0]?.text

        if (!rawReply && chatData.promptFeedback?.blockReason) {
            return new Response(
                JSON.stringify({
                    data: { reply: "I'm sorry, I cannot answer that due to safety restrictions.", session_id: currentSessionId, signal_created: null },
                    error: null,
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        // ── Step 11: Parse response for message + signal ──────────
        const parsed = parseGeminiResponse(rawReply ?? "")
        let finalReply = parsed.message || rawReply || "I'm unable to answer right now. Please try again."
        let signalCreated: any = null

        // ── Step 12: If signal detected, create it ────────────────
        if (parsed.signal) {
            console.log(`[send-agency-chat-message] Signal detected: [${parsed.signal.severity}] ${parsed.signal.title}`)

            try {
                // Determine target project — fallback to first active project if none specified
                let signalProjectId = parsed.signal.target_project_id || target_project_id
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
                        })
                        .select("id, title, severity, signal_type, project_id")
                        .single()

                    if (signalError) {
                        console.error("[send-agency-chat-message] Signal insert error:", signalError)
                    } else if (newSignal) {
                        signalCreated = newSignal

                        // Log to activity_log
                        await adminSupabase
                            .from("activity_log")
                            .insert({
                                project_id: signalProjectId,
                                action: `Agency Agent created ${parsed.signal.severity} signal: "${parsed.signal.title}"`,
                                category: "system",
                                triggered_by: user.id,
                            })

                        // Find project name for confirmation message
                        const targetProject = allProjects?.find((p: any) => p.id === signalProjectId)
                        const projectName = targetProject?.name || "target project"

                        finalReply += `\n\n📊 **Signal Created:** I've flagged a ${parsed.signal.severity} ${parsed.signal.signal_type} signal on **${projectName}**: "${parsed.signal.title}". It will appear on that project's dashboard.`
                    }
                } else {
                    console.warn("[send-agency-chat-message] No target project for signal — skipping creation")
                }
            } catch (signalErr) {
                console.error("[send-agency-chat-message] Signal creation failed:", signalErr)
            }
        }

        const inputTokens = chatData.usageMetadata?.promptTokenCount ?? 0
        const outputTokens = chatData.usageMetadata?.candidatesTokenCount ?? 0

        // ── Step 13: Persist messages ─────────────────────────────
        await adminSupabase.from("chat_messages").insert([
            { session_id: currentSessionId, role: "user", content: message, input_tokens: inputTokens },
            { session_id: currentSessionId, role: "assistant", content: finalReply, output_tokens: outputTokens },
        ])

        // ── Step 14: Track token usage (agency-level) ─────────────
        if (inputTokens > 0 || outputTokens > 0) {
            try {
                await adminSupabase.rpc("increment_token_usage", {
                    p_project_id: AGENCY_PROJECT_SENTINEL,
                    p_user_id: user.id,
                    p_input_tokens: inputTokens,
                    p_output_tokens: outputTokens,
                })
            } catch (tokenErr) {
                console.error("[send-agency-chat-message] Token usage update failed:", tokenErr)
            }
        }

        return new Response(
            JSON.stringify({
                data: {
                    session_id: currentSessionId,
                    reply: finalReply,
                    model_used: model,
                    input_tokens: inputTokens,
                    output_tokens: outputTokens,
                    context_chunks_used: contextChunks.length,
                    knowledge_entries_used: knowledgeEntries?.length ?? 0,
                    signal_created: signalCreated,
                },
                error: null,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )

    } catch (err) {
        console.error("[send-agency-chat-message] Error:", err)
        return new Response(
            JSON.stringify({ data: null, error: { code: "SERVER_ERROR", message: String(err) } }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }
})
