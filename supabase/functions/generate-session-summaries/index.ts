/**
 * generate-session-summaries
 * Inner G Complete Agency — Client Intelligence Portal
 *
 * Nightly batch job that generates narrative summaries for chat sessions.
 * This is Layer 2 of the Hybrid Memory System.
 *
 * Flow:
 *  1. Find all chat sessions that have messages but no summary yet
 *  2. For each eligible session:
 *     a. Fetch all messages
 *     b. Call Gemini to generate a narrative summary
 *     c. INSERT summary into session_summaries
 *     d. The DB trigger auto-queues an embedding job for the summary
 *  3. Return count of summaries generated
 *
 * Invocation: POST with optional { "limit": 50 } to cap batch size
 * Schedule: Nightly via Supabase cron or external scheduler
 * Auth: Requires service role key (no user auth — this is a system job)
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
const SUMMARY_MODEL = "gemini-2.5-flash-lite"
const MIN_MESSAGES_FOR_SUMMARY = 4  // Don't summarize tiny conversations

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const body = req.method === "POST" ? await req.json().catch(() => ({})) : {}
        const batchLimit = body.limit ?? 50

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )
        const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!

        console.log("[generate-session-summaries] Starting batch job...")

        // ── Step 1: Find sessions that need summaries ─────────────
        // Sessions that:
        //   - Have at least MIN_MESSAGES_FOR_SUMMARY messages
        //   - Don't already have a summary
        //   - Were updated more than 1 hour ago (session is likely "done")
        const { data: eligibleSessions, error: queryError } = await supabase
            .from("chat_sessions")
            .select(`
                id,
                project_id,
                user_id,
                updated_at,
                chat_messages(count)
            `)
            .lt("updated_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()) // >1 hour old
            .order("updated_at", { ascending: true })
            .limit(batchLimit * 2) // Fetch extra to filter

        if (queryError) {
            console.error("[generate-session-summaries] Query error:", queryError)
            throw queryError
        }

        if (!eligibleSessions || eligibleSessions.length === 0) {
            console.log("[generate-session-summaries] No eligible sessions found.")
            return new Response(
                JSON.stringify({ data: { summaries_generated: 0, message: "No eligible sessions." }, error: null }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        // Filter out sessions that already have summaries
        const sessionIds = eligibleSessions.map((s: any) => s.id)
        const { data: existingSummaries } = await supabase
            .from("session_summaries")
            .select("session_id")
            .in("session_id", sessionIds)

        const summarizedSessionIds = new Set(
            (existingSummaries || []).map((s: any) => s.session_id)
        )

        // Filter to sessions without summaries and with enough messages
        const sessionsToProcess = eligibleSessions.filter((s: any) => {
            if (summarizedSessionIds.has(s.id)) return false
            const messageCount = s.chat_messages?.[0]?.count ?? 0
            return messageCount >= MIN_MESSAGES_FOR_SUMMARY
        }).slice(0, batchLimit)

        console.log(`[generate-session-summaries] ${sessionsToProcess.length} sessions to summarize`)

        let summariesGenerated = 0
        const errors: string[] = []

        // ── Step 2: Process each session ──────────────────────────
        for (const session of sessionsToProcess) {
            try {
                // 2a. Fetch all messages for this session
                const { data: messages, error: msgError } = await supabase
                    .from("chat_messages")
                    .select("role, content, created_at")
                    .eq("session_id", session.id)
                    .order("created_at", { ascending: true })

                if (msgError || !messages || messages.length < MIN_MESSAGES_FOR_SUMMARY) {
                    continue
                }

                // 2b. Build the conversation text for summarization
                const conversationText = messages.map((m: any) =>
                    `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
                ).join("\n\n")

                const summaryPrompt = `You are a summarization assistant. Generate a concise narrative summary of the following conversation between a user and an AI Growth Assistant.

The summary should:
- Be 2-4 paragraphs
- Capture the main topics discussed
- Note any key insights, data points, or decisions made
- Mention any AI Signals created during the conversation
- Be written in third person past tense ("The user asked about...", "The agent recommended...")
- Include specific numbers and metrics if they were discussed

Conversation (${messages.length} messages):

${conversationText}`

                // 2c. Call Gemini for summary generation
                let summaryRes = await fetch(
                    `${GEMINI_API_BASE}/models/${SUMMARY_MODEL}:generateContent?key=${geminiApiKey}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{ role: "user", parts: [{ text: summaryPrompt }] }],
                            generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
                        }),
                    }
                )

                if (!summaryRes.ok) {
                    const errText = await summaryRes.text()
                    console.error(`[generate-session-summaries] Gemini error for session ${session.id} (${summaryRes.status}):`, errText)
                    errors.push(`Session ${session.id}: Gemini API error ${summaryRes.status}`)
                    continue
                }

                const summaryData = await summaryRes.json()

                const summaryText = summaryData.candidates?.[0]?.content?.parts?.[0]?.text
                if (!summaryText) {
                    errors.push(`Session ${session.id}: Empty summary from Gemini`)
                    continue
                }

                // 2d. INSERT into session_summaries
                const { error: insertError } = await supabase
                    .from("session_summaries")
                    .insert({
                        session_id: session.id,
                        project_id: session.project_id,
                        user_id: session.user_id,
                        summary: summaryText,
                        message_count: messages.length,
                    })

                if (insertError) {
                    // Could be a duplicate — the UNIQUE constraint on session_id prevents duplicates
                    if (insertError.code === "23505") {
                        console.log(`[generate-session-summaries] Summary already exists for session ${session.id}, skipping`)
                    } else {
                        console.error(`[generate-session-summaries] Insert error for session ${session.id}:`, insertError)
                        errors.push(`Session ${session.id}: Insert error — ${insertError.message}`)
                    }
                    continue
                }

                // 2e. The embedding job is auto-queued by the DB trigger (session_summaries_queue_embedding)
                summariesGenerated++
                console.log(`[generate-session-summaries] ✅ Summary generated for session ${session.id} (${messages.length} messages)`)

                // Rate limit: Small delay between Gemini calls
                await new Promise(r => setTimeout(r, 200))

            } catch (sessionErr) {
                console.error(`[generate-session-summaries] Error processing session ${session.id}:`, sessionErr)
                errors.push(`Session ${session.id}: ${String(sessionErr)}`)
            }
        }

        console.log(`[generate-session-summaries] Complete. ${summariesGenerated}/${sessionsToProcess.length} summaries generated.`)

        return new Response(
            JSON.stringify({
                data: {
                    summaries_generated: summariesGenerated,
                    sessions_processed: sessionsToProcess.length,
                    errors: errors.length > 0 ? errors : undefined,
                },
                error: null,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    } catch (err) {
        console.error("[generate-session-summaries] Fatal error:", err)
        return new Response(
            JSON.stringify({ data: null, error: { code: "SERVER_ERROR", message: String(err) } }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }
})
