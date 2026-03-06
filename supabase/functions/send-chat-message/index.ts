/**
 * send-chat-message
 * Inner G Complete Agency — Client Intelligence Portal
 *
 * Handles the Growth Assistant AI chat — RAG + Gemini pipeline.
 *
 * Flow:
 *  1. Authenticate user via JWT
 *  2. Validate payload (project_id, message, optional session_id)
 *  3. Get or create chat session for this user + project + model
 *  4. RAG: embed the user's message → search document_embeddings for top-5 chunks
 *  5. Build system prompt: [context chunks] + [recent messages] + [user message]
 *  6. Call Gemini API (Flash or Pro based on session model)
 *  7. Store user message + assistant reply in chat_messages
 *  8. Update session token counts
 *  9. Return assistant reply to client
 *
 * Auth: Requires valid Supabase JWT (Authorization: Bearer <token>)
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
const DEFAULT_CHAT_MODEL = "gemini-1.5-flash"
const DEFAULT_EMBED_MODEL = "text-embedding-004"
const RAG_TOP_K = 5

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders })
    }

    const authHeader = req.headers.get("Authorization")
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

        const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!

        // ── Step 4: RAG — embed the user message ──────────────────────────
        const embedRes = await fetch(
            `${GEMINI_API_BASE}/models/${DEFAULT_EMBED_MODEL}:embedContent?key=${geminiApiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: `models/${DEFAULT_EMBED_MODEL}`, content: { parts: [{ text: message }] } }),
            }
        )
        const embedData = await embedRes.json()
        const queryVector = embedData.embedding?.values ?? []

        // ── Step 4b: Semantic search for context chunks ───────────────────
        let contextChunks: string[] = []
        if (queryVector.length > 0) {
            const { data: chunks, error: matchError } = await supabase.rpc("match_documents", {
                query_embedding: queryVector,
                match_threshold: 0.5,
                match_count: RAG_TOP_K,
                p_project_id: project_id
            })

            if (matchError) {
                console.error("[send-chat-message] RAG match error:", matchError)
            } else {
                contextChunks = chunks?.map((c: any) => c.content_chunk) ?? []
            }
        }

        // ── Step 4.5: Get or create session ───────────────────────────
        const adminSupabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )

        let currentSessionId = session_id
        if (!currentSessionId) {
            const { data: session } = await adminSupabase
                .from("chat_sessions")
                .insert({ project_id, user_id: user.id, model_used: model })
                .select("id")
                .single()
            currentSessionId = session?.id
        }

        // ── Step 5: Build context history ───────────────────────────────
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

        const systemPrompt = [
            "You are the Inner G Complete Growth Assistant — an expert AI analyst specializing in campaign performance, CRM optimization, and business growth strategy.",
            "You have access to this project's real-time data. Answer concisely and specifically using the context below.",
            contextChunks.length > 0 ? "\nRelevant project data context:\n" + contextChunks.join("\n---\n") : "",
            historyPrompt
        ].filter(Boolean).join("\n")

        // ── Step 6: Call Gemini Chat API ──────────────────────────────────
        const chatRes = await fetch(
            `${GEMINI_API_BASE}/models/${model}:generateContent?key=${geminiApiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        { role: "user", parts: [{ text: `${systemPrompt}\n\nUser: ${message}` }] }
                    ],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
                }),
            }
        )
        const chatData = await chatRes.json()
        const reply = chatData.candidates?.[0]?.content?.parts?.[0]?.text ?? "I'm unable to answer right now. Please try again."
        const inputTokens = chatData.usageMetadata?.promptTokenCount ?? 0
        const outputTokens = chatData.usageMetadata?.candidatesTokenCount ?? 0

        // ── Step 7: Persist messages ──────────────────────────────────
        // (adminSupabase and currentSessionId were initialized in Step 4.5)

        // Insert messages
        await adminSupabase.from("chat_messages").insert([
            { session_id: currentSessionId, role: "user", content: message, input_tokens: inputTokens },
            { session_id: currentSessionId, role: "assistant", content: reply, output_tokens: outputTokens },
        ])

        return new Response(
            JSON.stringify({
                data: {
                    session_id: currentSessionId,
                    reply,
                    model_used: model,
                    input_tokens: inputTokens,
                    output_tokens: outputTokens,
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
