/**
 * send-chat-message (Phase D — Signal Creation)
 * Inner G Complete Agency — Client Intelligence Portal
 *
 * Handles the Growth Assistant AI chat — RAG + Gemini pipeline.
 * Now includes:
 *  - project_agent_config data source filtering (Phase C)
 *  - Structured output for signal creation (Phase D)
 *  - Auto-insert signals into ai_signals
 *  - Auto-queue embedding jobs for new signals
 *  - Activity log entries for signal creation
 *
 * Flow:
 *  1.  Authenticate user via JWT
 *  2.  Validate payload (project_id, message, optional session_id)
 *  3.  Fetch project_agent_config — determine which data sources are enabled
 *  4.  RAG: embed the user's message → search document_embeddings
 *  4b. Filter RAG results to only include enabled source_table values
 *  5.  Get or create chat session for this user + project + model
 *  6.  Build context: [RAG chunks] + [recent messages]
 *  7.  Build system prompt with data source awareness + signal creation instructions
 *  8.  Call Gemini Chat API with JSON response format (with model fallback)
 *  9.  Parse response — extract message and optional signal
 *  10. If signal detected: INSERT into ai_signals, queue embedding, log to activity_log
 *  11. Store user message + assistant reply in chat_messages
 *  12. Return assistant reply + signal metadata to client
 *
 * Auth: Requires valid Supabase JWT (Authorization: Bearer <token>)
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
const DEFAULT_CHAT_MODEL = "gemini-2.5-flash-lite"
const DEFAULT_EMBED_MODEL = "text-embedding-004"
const RAG_TOP_K = 8

// Valid signal types and severities (must match DB enums)
const VALID_SIGNAL_TYPES = ["inventory", "conversion", "social", "system", "ai_insight", "ai_action"]
const VALID_SEVERITIES = ["info", "warning", "critical"]

// ─────────────────────────────────────────────
// DATA SOURCE → source_table MAPPING
// ─────────────────────────────────────────────
const CONFIG_TO_SOURCE_TABLES: Record<string, string[]> = {
    campaign_metrics_enabled: ["campaign_metrics"],
    ai_signals_enabled: ["ai_signals"],
    activity_log_enabled: ["activity_log", "activity_log_daily"],
    ghl_contacts_enabled: ["ghl_contacts", "ghl_contacts_daily"],
    funnel_data_enabled: ["funnel_events", "funnel_events_daily"],
    integration_sync_enabled: ["integration_sync_log"],
    system_connections_enabled: ["system_connections"],
    chat_history_enabled: ["session_summaries"],
}

// ─────────────────────────────────────────────
// SIGNAL CREATION PROMPT ADDITION
// ─────────────────────────────────────────────
const SIGNAL_CREATION_INSTRUCTIONS = `
IMPORTANT: You have the ability to create AI Signals — actionable intelligence cards that appear on the project dashboard.

You MUST respond in the following JSON structure (always valid JSON, no markdown fences):

{
  "message": "Your conversational response to the user",
  "signal": null
}

If you identify a significant insight, trend, or actionable finding, include a signal:

{
  "message": "Your conversational response explaining the insight",
  "signal": {
    "title": "Short, descriptive signal title (max 80 chars)",
    "body": "Detailed signal description with supporting data",
    "signal_type": "inventory|conversion|social|system|ai_insight|ai_action",
    "severity": "info|warning|critical",
    "action_label": "Optional CTA button text (e.g. 'Review Campaign')",
    "action_url": null
  }
}

CREATE a signal when:
- A KPI has changed significantly (>5% decline or >10% growth)
- A pattern or anomaly is detected across data points
- The user explicitly asks you to flag or track something
- You identify an actionable growth opportunity
- A system or integration issue needs attention

Do NOT create a signal for:
- Routine questions with stable data
- General knowledge inquiries
- When you don't have enough data to justify the signal

Signal type guide:
- "ai_insight": Data patterns, trends, or analytical findings
- "ai_action": Specific recommended actions or optimizations
- "conversion": Signup/activation/funnel-related findings
- "inventory": Stock or product availability findings
- "social": Social media or engagement findings
- "system": Technical or integration health issues

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
    } | null
}

function parseGeminiResponse(rawText: string): ParsedResponse {
    // Try to parse as JSON first
    try {
        // Strip markdown code fences if present
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
                // Validate signal fields
                const signalType = VALID_SIGNAL_TYPES.includes(parsed.signal.signal_type)
                    ? parsed.signal.signal_type
                    : "ai_insight"
                const severity = VALID_SEVERITIES.includes(parsed.signal.severity)
                    ? parsed.signal.severity
                    : "info"

                signal = {
                    title: String(parsed.signal.title).substring(0, 200),
                    body: String(parsed.signal.body || ""),
                    signal_type: signalType,
                    severity: severity,
                    action_label: parsed.signal.action_label || null,
                    action_url: parsed.signal.action_url || null,
                }
            }
            return { message: parsed.message, signal }
        }
    } catch {
        // Not JSON — fall through to plain text handling
    }

    // Fallback: treat the entire response as a plain message (no signal)
    return { message: rawText, signal: null }
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders })
    }

    const authHeader = req.headers.get("Authorization")
    console.log("[send-chat-message] Request received. Auth header present:", !!authHeader)

    if (!authHeader) {
        return new Response(
            JSON.stringify({ data: null, error: { code: "UNAUTHORIZED", message: "Missing Authorization header." } }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }

    try {
        const body = await req.json()
        const { project_id, message, session_id, model = DEFAULT_CHAT_MODEL } = body

        if (!project_id || !message) {
            return new Response(
                JSON.stringify({ data: null, error: { code: "VALIDATION_ERROR", message: "project_id and message are required." } }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        // Authenticated user client (respects RLS)
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error("Unauthorized")

        // Service-role client for admin operations
        const adminSupabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )

        const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!

        // ── Step 2b: Token budget check ────────────────────────────
        const { data: budgetRows } = await adminSupabase.rpc("check_token_budget", {
            p_project_id: project_id,
        })
        const budget = budgetRows?.[0]

        if (budget?.is_over_budget) {
            console.warn(`[send-chat-message] Budget exceeded for project ${project_id}: ${budget.tokens_used}/${budget.monthly_limit} (${budget.usage_percent}%)`)
            return new Response(
                JSON.stringify({
                    data: {
                        reply: `⚠️ Your AI usage quota for this month has been reached (${budget.usage_percent}% of your ${budget.tier} plan limit). Please contact your administrator to upgrade your plan or wait until next month.`,
                        session_id: session_id || null,
                        budget_exceeded: true,
                        tier: budget.tier,
                        tokens_used: budget.tokens_used,
                        monthly_limit: budget.monthly_limit,
                    },
                    error: null,
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        // ── Step 3: Fetch project_agent_config ────────────────────
        const { data: agentConfig } = await adminSupabase
            .from("project_agent_config")
            .select("*")
            .eq("project_id", project_id)
            .single()

        // Build list of allowed source_table values based on config
        const allowedSourceTables: string[] = []
        const disabledSources: string[] = []

        for (const [configKey, sourceTables] of Object.entries(CONFIG_TO_SOURCE_TABLES)) {
            const isEnabled = agentConfig ? (agentConfig as any)[configKey] !== false : true
            if (isEnabled) {
                allowedSourceTables.push(...sourceTables)
            } else {
                disabledSources.push(configKey.replace("_enabled", "").replace(/_/g, " "))
            }
        }

        console.log(`[send-chat-message] Enabled sources: ${allowedSourceTables.join(", ")}`)

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

        // ── Step 4b: Semantic search + filter by enabled sources ───
        let contextChunks: string[] = []
        if (queryVector.length > 0) {
            const { data: chunks, error: matchError } = await adminSupabase.rpc("match_documents", {
                query_embedding: queryVector,
                match_threshold: 0.45,
                match_count: RAG_TOP_K * 2,
                p_project_id: project_id,
            })

            if (matchError) {
                console.error("[send-chat-message] RAG match error:", matchError)
            } else if (chunks) {
                const filtered = chunks.filter((c: any) => allowedSourceTables.includes(c.source_table))
                contextChunks = filtered.slice(0, RAG_TOP_K).map((c: any) =>
                    `[${c.source_table}] ${c.content_chunk}`
                )
            }
        }

        // ── Step 4c: Layer 2 — Past session summaries (user-scoped) ──
        let pastSessionContext: string[] = []
        if (queryVector.length > 0 && allowedSourceTables.includes("session_summaries")) {
            try {
                const { data: pastSummaries, error: summaryError } = await adminSupabase.rpc("match_session_summaries", {
                    query_embedding: queryVector,
                    p_user_id: user.id,
                    p_project_id: project_id,
                    match_threshold: 0.45,
                    match_count: 3,
                })

                if (summaryError) {
                    console.error("[send-chat-message] Session summary search error:", summaryError)
                } else if (pastSummaries && pastSummaries.length > 0) {
                    pastSessionContext = pastSummaries.map((s: any) => s.content_chunk)
                    console.log(`[send-chat-message] Layer 2: Found ${pastSessionContext.length} relevant past session summaries`)
                }
            } catch (summaryErr) {
                console.error("[send-chat-message] Layer 2 memory search failed:", summaryErr)
            }
        }

        // ── Step 5: Get or create session ─────────────────────────
        let currentSessionId = session_id
        if (!currentSessionId) {
            const { data: session } = await adminSupabase
                .from("chat_sessions")
                .insert({ project_id, user_id: user.id, model_used: model })
                .select("id")
                .single()
            currentSessionId = session?.id
        }

        // ── Step 6: Build context history ─────────────────────────
        let historyPrompt = ""
        if (currentSessionId) {
            const { data: history } = await supabase
                .from("chat_messages")
                .select("role, content")
                .eq("session_id", currentSessionId)
                .order("created_at", { ascending: false })
                .limit(10)

            if (history && history.length > 0) {
                historyPrompt = "\n\nPrevious Conversation:\n" +
                    history.reverse().map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join("\n")
            }
        }

        // ── Step 7: Build system prompt with signal creation ──────
        const activeSourceList = allowedSourceTables
            .filter(t => !t.includes("_daily"))
            .map(t => t.replace(/_/g, " "))
            .join(", ")

        const disabledNote = disabledSources.length > 0
            ? `\n\nNote: The following data sources are currently DISABLED: ${disabledSources.join(", ")}. Do not reference them.`
            : ""

        const systemPrompt = [
            "You are the Inner G Complete Growth Assistant — an expert AI analyst specializing in campaign performance, CRM optimization, and business growth strategy.",
            `You have access to this project's real-time data from these sources: ${activeSourceList}.`,
            "Answer concisely and specifically using the context below. Cite which data source you're referencing when possible.",
            disabledNote,
            SIGNAL_CREATION_INSTRUCTIONS,
            contextChunks.length > 0 ? "\nRelevant project data context:\n" + contextChunks.join("\n---\n") : "",
            pastSessionContext.length > 0 ? "\nRelevant past conversation context (from your previous sessions with this user):\n" + pastSessionContext.join("\n---\n") : "",
            historyPrompt,
        ].filter(Boolean).join("\n")

        // ── Step 8: Call Gemini Chat API ──────────────────────────
        console.log(`[send-chat-message] Calling Gemini (${model}) with signal creation support...`)

        const geminiPayload = {
            contents: [
                { role: "user", parts: [{ text: `${systemPrompt}\n\nUser: ${message}` }] },
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
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

        // Fallback: If model fails (404), try without JSON mode on stable model
        if (chatRes.status === 404 && model !== "gemini-1.5-flash") {
            const fallbackModel = "gemini-1.5-flash"
            console.warn(`[send-chat-message] Model ${model} failed (404). Falling back to ${fallbackModel}...`)

            // Gemini 1.5 Flash supports responseMimeType
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
            console.error("[send-chat-message] Gemini API Error:", chatData)
            throw new Error(`Gemini API returned ${chatRes.status}: ${chatData.error?.message || "Unknown error"}`)
        }

        const rawReply = chatData.candidates?.[0]?.content?.parts?.[0]?.text

        if (!rawReply) {
            console.warn("[send-chat-message] No reply in Gemini response:", chatData)
            if (chatData.promptFeedback?.blockReason) {
                return new Response(
                    JSON.stringify({
                        data: {
                            reply: "I'm sorry, I cannot answer that due to safety restrictions. Please try a different question.",
                            session_id: currentSessionId,
                            signal_created: null,
                        },
                        error: null,
                    }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                )
            }
        }

        // ── Step 9: Parse response for message + signal ───────────
        const parsed = parseGeminiResponse(rawReply ?? "")
        let finalReply = parsed.message || rawReply || "I'm unable to answer right now. Please try again."
        let signalCreated: any = null

        // ── Step 10: If signal detected, create it ────────────────
        if (parsed.signal) {
            console.log(`[send-chat-message] Signal detected: [${parsed.signal.severity}] ${parsed.signal.title}`)

            try {
                // 10a. INSERT into ai_signals
                const { data: newSignal, error: signalError } = await adminSupabase
                    .from("ai_signals")
                    .insert({
                        project_id,
                        signal_type: parsed.signal.signal_type,
                        title: parsed.signal.title,
                        body: parsed.signal.body,
                        severity: parsed.signal.severity,
                        action_label: parsed.signal.action_label,
                        action_url: parsed.signal.action_url,
                    })
                    .select("id, title, severity, signal_type")
                    .single()

                if (signalError) {
                    console.error("[send-chat-message] Signal insert error:", signalError)
                } else if (newSignal) {
                    signalCreated = newSignal
                    console.log(`[send-chat-message] Signal created: ${newSignal.id}`)

                    // 10b. The embedding job is auto-queued by the database trigger
                    // (ai_signals_queue_embedding trigger from migration 010)

                    // 10c. Log signal creation to activity_log
                    await adminSupabase
                        .from("activity_log")
                        .insert({
                            project_id,
                            action: `AI Agent created ${parsed.signal.severity} signal: "${parsed.signal.title}"`,
                            category: "system",
                            triggered_by: user.id,
                        })

                    // 10d. Append confirmation to the reply
                    finalReply += `\n\n📊 **Signal Created:** I've flagged a ${parsed.signal.severity} ${parsed.signal.signal_type} signal: "${parsed.signal.title}". It will appear on your dashboard.`
                }
            } catch (signalErr) {
                console.error("[send-chat-message] Signal creation failed:", signalErr)
                // Don't fail the whole response — just skip signal creation
            }
        }

        const inputTokens = chatData.usageMetadata?.promptTokenCount ?? 0
        const outputTokens = chatData.usageMetadata?.candidatesTokenCount ?? 0

        // ── Step 11: Persist messages ─────────────────────────────
        await adminSupabase.from("chat_messages").insert([
            { session_id: currentSessionId, role: "user", content: message, input_tokens: inputTokens },
            { session_id: currentSessionId, role: "assistant", content: finalReply, output_tokens: outputTokens },
        ])

        // ── Step 12: Increment token usage ────────────────────────
        if (inputTokens > 0 || outputTokens > 0) {
            try {
                await adminSupabase.rpc("increment_token_usage", {
                    p_project_id: project_id,
                    p_user_id: user.id,
                    p_input_tokens: inputTokens,
                    p_output_tokens: outputTokens,
                })
                console.log(`[send-chat-message] Token usage updated: +${inputTokens} in, +${outputTokens} out`)
            } catch (tokenErr) {
                console.error("[send-chat-message] Token usage update failed:", tokenErr)
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
                    sources_enabled: allowedSourceTables.length,
                    context_chunks_used: contextChunks.length,
                    signal_created: signalCreated,
                    budget: budget ? {
                        tier: budget.tier,
                        tokens_used: (budget.tokens_used ?? 0) + inputTokens + outputTokens,
                        monthly_limit: budget.monthly_limit,
                        usage_percent: budget.monthly_limit > 0
                            ? Math.round(((budget.tokens_used ?? 0) + inputTokens + outputTokens) / budget.monthly_limit * 1000) / 10
                            : 0,
                    } : undefined,
                },
                error: null,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    } catch (err) {
        console.error("[send-chat-message] Error:", err)
        return new Response(
            JSON.stringify({ data: null, error: { code: "SERVER_ERROR", message: String(err) } }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }
})
