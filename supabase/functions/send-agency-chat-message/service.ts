/**
 * send-agency-chat-message/service.ts
 * Inner G Complete Agency — Agency Intelligence Agent Chat Service
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This file ONLY contains business logic.
 * It must NOT handle CORS, authentication, or HTTP responses.
 * For prompt content, edit prompt-engineer.ts.
 * ─────────────────────────────────────────────────────────
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Logger, embedText, generateContent, GEMINI_MODELS, Repo, TicketWorkflow } from "../_shared/lib/index.ts"
import { buildAgencySystemPrompt, AGENCY_RESPONSE_SCHEMA } from "./prompt-engineer.ts"
import { parseAiResponse, persistSignal, persistTicket, logSignalActivity } from "../send-chat-message/signal-processor.ts"
import { createDefaultRegistry } from "../_shared/lib/tools/registry.ts"

// Agency sentinel project ID — all agency-level sessions are stored here
const AGENCY_PROJECT_SENTINEL = "00000000-0000-0000-0000-000000000001"

export interface AgencyChatInput {
    message: string
    session_id?: string | null
    model?: string
    target_project_id?: string | null
    userId: string
}

export interface AgencyChatResult {
    session_id: string | null
    reply: string
    signal_created: {
        id: string
        title: string
        severity: string
        signal_type: string
        project_id: string
        is_agency_only: boolean
    } | null
    input_tokens: number
    output_tokens: number
    budget_exceeded?: boolean
    budget?: {
        tier: string
        tokens_used: number
        monthly_limit: number
    }
}

export class AgencyChatService {
    constructor(
        private adminClient: SupabaseClient,
        private logger: Logger,
        private geminiApiKey: string
    ) { }

    async chat(input: AgencyChatInput): Promise<AgencyChatResult> {
        const { message, session_id, userId, target_project_id } = input
        const model = input.model ?? GEMINI_MODELS.PRO
        this.logger.info("Starting agency chat execution", { userId, model, hasSessionId: !!session_id })

        // ── Step 1: Token Budget Check ────────────────────────
        this.logger.info("Step 1: Checking token budget")
        let budgetRows = null
        try {
            const { data } = await this.adminClient.rpc("check_token_budget", {
                p_project_id: AGENCY_PROJECT_SENTINEL,
            })
            budgetRows = data
        } catch (err) {
            this.logger.warn("Token budget check failed", { error: err })
        }

        const budget = budgetRows?.[0]

        if (budget?.is_over_budget) {
            this.logger.warn("Agency budget exceeded", { project_id: AGENCY_PROJECT_SENTINEL, usage_percent: budget.usage_percent })
            return {
                reply: budget.tier === 'off' 
                    ? "⚠️ AI access is currently disabled for this project. Please contact your administrator to activate the Growth Assistant."
                    : `⚠️ Your AI usage quota for this month has been reached (${budget.usage_percent}% of your ${budget.tier} plan limit). Please contact your administrator to upgrade your plan or wait until next month.`,
                session_id: session_id ?? null,
                signal_created: null,
                input_tokens: 0,
                output_tokens: 0,
                budget_exceeded: true,
                budget: { tier: budget.tier, tokens_used: budget.tokens_used, monthly_limit: budget.monthly_limit }
            }
        }

        // ── Step 2: Embed the user message for RAG ────────────
        this.logger.info("Step 2: Embedding user message for RAG")
        const queryVector = await embedText(message, this.geminiApiKey).catch(err => {
            this.logger.error("Embedding generation failed", err)
            return null
        }) ?? []

        const contextChunks: string[] = []

        if (queryVector.length > 0) {
            this.logger.info("Performing agency-wide RAG search")
            const { data: chunks, error: rpcErr } = await this.adminClient.rpc("match_documents_agency", {
                query_embedding: queryVector,
                match_threshold: 0.3,
                match_count: 20,
            })

            if (rpcErr) {
                this.logger.warn("RAG RPC search failed", { error: rpcErr })
                contextChunks.push(...chunks.map((c: any) => {
                    const projectLabel = c.project_id ? `[Project: ${c.project_id}]` : "[Agency-Wide]"
                    return `${projectLabel} (${c.source_table}) (ID: ${c.source_id}): ${c.content}`
                }))

                // Layer 2: Agency-wide memory
                try {
                    const { data: pastSummaries, error: summaryErr } = await this.adminClient.rpc("match_session_summaries_agency", {
                        query_embedding: queryVector,
                        p_user_id: userId,
                        match_threshold: 0.45,
                        match_count: 5,
                    })

                    if (summaryErr) {
                        this.logger.warn("Agency session summary search failed", { error: summaryErr })
                    } else if (pastSummaries?.length > 0) {
                        this.logger.info(`Found ${pastSummaries.length} relevant past agency summaries`)
                        contextChunks.push(...pastSummaries.map((s: any) => 
                            `[PAST MEMORY] [Project: ${s.project_id}] ${s.content_chunk}`
                        ))
                    }
                } catch (err) {
                    this.logger.warn("Agency session summary exception", { error: err })
                }
            }
        }

        // ── Step 3: Fetch Agency Knowledge Base ───────────────
        this.logger.info("Step 3: Fetching agency knowledge base")
        const { data: knowledgeEntries, error: knowledgeErr } = await this.adminClient
            .from("agency_knowledge")
            .select("title, body, tags")
            .eq("is_published", true)
            .limit(5)

        if (knowledgeErr) {
            this.logger.warn("Knowledge base fetch failed", { error: knowledgeErr })
        }

        const knowledgeContext = knowledgeEntries?.length
            ? "\n\nInner G Complete Agency Knowledge Base:\n" +
            knowledgeEntries.map((e: any) =>
                `[${(e.tags || []).join(", ")}] ${e.title}: ${e.body.substring(0, 500)}`
            ).join("\n---\n")
            : ""

        // ── Step 4: Get or Create Agency Session ──────────────
        this.logger.info("Step 4: Managing agency chat session")
        let currentSessionId = session_id ?? null
        if (!currentSessionId) {
            this.logger.info("Creating new agency chat session")
            const { data: session, error: sessionErr } = await this.adminClient
                .from("chat_sessions")
                .insert({
                    project_id: AGENCY_PROJECT_SENTINEL,
                    user_id: userId,
                    model_used: model,
                })
                .select("id")
                .single()

            if (sessionErr) {
                this.logger.error("Failed to create agency chat session", sessionErr)
                currentSessionId = null
            } else {
                this.logger.info("New agency session created", { id: session?.id })
                currentSessionId = session?.id ?? null
            }
        }

        // ── Step 5: Fetch Chat History ────────────────────────
        let historyPrompt = ""
        if (currentSessionId) {
            this.logger.info("Step 5: Fetching chat history")
            const { data: history, error: historyErr } = await this.adminClient
                .from("chat_messages")
                .select("role, content")
                .eq("session_id", currentSessionId)
                .order("created_at", { ascending: false })
                .limit(10)

            if (historyErr) {
                this.logger.warn("History fetch failed", { error: historyErr })
            } else if (history && history.length > 0) {
                this.logger.info(`Found ${history.length} history messages`)
                historyPrompt = "\n\nPrevious Conversation:\n" +
                    history.reverse().map((m: any) =>
                        `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
                    ).join("\n")
            }
        }

        // ── Step 6: Build Portfolio Context ───────────────────
        this.logger.info("Step 6: Fetching portfolio context")
        const { data: allProjects, error: projectsErr } = await this.adminClient
            .from("projects")
            .select("id, name, slug, clients(name)")

        if (projectsErr) {
            this.logger.warn("Portfolio projects fetch failed", { error: projectsErr })
        }

        const projectListContext = allProjects?.length
            ? "Active Client Projects (use these IDs for target_project_id in signals):\n" +
            allProjects.map((p: any) =>
                `• ${p.name} [ID: ${p.id}] (${(p.clients as any)?.name ?? "Unknown Client"}) — /dashboard/${p.slug}`
            ).join("\n")
            : "No client projects configured."

        // ── Step 7: Fetch Sales Pipeline Intelligence & Recent Signals/Tickets ─────────
        this.logger.info("Step 7: Fetching sales pipeline intel and live intelligence")
        let pipelineContext = ""
        try {
            const { data: pipelines, error: pipelineErr } = await this.adminClient
                .from("ghl_pipelines")
                .select("id, name, ghl_opportunities(status, monetary_value, title, ghl_updated_at, ghl_contacts(full_name, email, phone))")
                .order("ghl_updated_at", { foreignTable: "ghl_opportunities", ascending: false })

            if (pipelineErr) throw pipelineErr

            if (pipelines?.length) {
                this.logger.info(`Found ${pipelines.length} pipelines`)
                pipelineContext = "Real-Time Sales Pipeline Stats:\n"
                for (const p of pipelines) {
                    const opps = (p as any).ghl_opportunities || []
                    const openOpps = opps.filter((o: any) => o.status === "open")
                    const totalValue = openOpps.reduce((sum: number, o: any) => sum + (Number(o.monetary_value) || 0), 0)
                    pipelineContext += `• Pipeline: "${p.name}"\n`
                    pipelineContext += `  - Open Deals: ${openOpps.length} | Total Value: $${totalValue.toLocaleString()}\n`
                    pipelineContext += `  - Top Deals: ${openOpps.slice(0, 5).map((o: any) => `"${o.title}" ($${(Number(o.monetary_value) || 0).toLocaleString()})`).join(", ") || "None"}\n`
                }
            }
        } catch (err) {
            this.logger.warn("Pipeline intel fetch failed (non-fatal)", { error: String(err) })
        }

        let liveIntelligenceContext = ""
        try {
            const [{ data: signals }, { data: tickets }] = await Promise.all([
                this.adminClient.from("ai_signals")
                    .select("title, body, severity, signal_type, created_at, projects(name)")
                    .eq("is_resolved", false)
                    .order("created_at", { ascending: false })
                    .limit(10),
                this.adminClient.from("software_tickets")
                    .select("title, status, severity, created_at, projects(name)")
                    .neq("status", "closed")
                    .order("created_at", { ascending: false })
                    .limit(5)
            ])

            if (signals?.length || tickets?.length) {
                liveIntelligenceContext = "LIVE Portfolio Intelligence:\n"

                if (signals?.length) {
                    liveIntelligenceContext += "\nActive AI Signals:\n" +
                        signals.map((s: any) => `• [${s.projects?.name}] ${s.title} (${s.severity}) - ${s.body.substring(0, 100)}...`).join("\n")
                }

                if (tickets?.length) {
                    liveIntelligenceContext += "\n\nOpen Software Support Tickets:\n" +
                        tickets.map((t: any) => `• [${t.projects?.name}] ${t.title} [Status: ${t.status}] (${t.severity})`).join("\n")
                }
            }
        } catch (err) {
            this.logger.warn("Live intel fetch failed", { error: String(err) })
        }

        // ── Step 8: Build System Prompt ───────────────────────
        this.logger.info("Step 8: Building system prompt")
        const ragContext = [
            contextChunks.length > 0 ? "Agency Cross-Project Data (Deep Search):\n" + contextChunks.join("\n---\n") : "",
            knowledgeContext,
            historyPrompt
        ].filter(Boolean).join("\n\n")

        const systemPrompt = buildAgencySystemPrompt({
            agentName: "Inner G",
            projectListContext,
            ragContext,
            pipelineContext: pipelineContext || undefined,
            liveIntelligenceContext: liveIntelligenceContext || undefined
        })

        // ── Step 9: Call Gemini (with Tool Loop) ────────────
        this.logger.info(`Step 9: Calling Gemini v1beta API (${model}) with Multi-Step Tool Capabilities`)
        const registry = createDefaultRegistry()
        const tools = [{ functionDeclarations: registry.getDefinitions() }]

        const generateOptions = {
            model: model as any,
            systemPrompt,
            userMessage: message,
            temperature: 0.1,
            maxOutputTokens: 4096,
            history: historyPrompt ? [{ role: "user", parts: [{ text: historyPrompt }] }] : [],
            tools,
        }

        let geminiResult = await generateContent(generateOptions, this.geminiApiKey).catch(err => {
            this.logger.error("Gemini API call failed", err)
            throw err
        })

        const toolHistory: any[] = [{ role: "user", parts: [{ text: message }] }]
        let loopCount = 0
        const MAX_LOOPS = 4 // Allow up to 4 tool-use steps (e.g. Search -> Think -> Create -> Finish)

        while (loopCount < MAX_LOOPS) {
            const modelParts = (geminiResult.rawData as any).candidates?.[0]?.content?.parts || []
            const toolCalls = modelParts.filter((p: any) => p.functionCall)

            if (toolCalls.length === 0) break // No more tools needed

            this.logger.info(`Loop ${loopCount + 1}: Gemini requested ${toolCalls.length} tool calls`)
            toolHistory.push({ role: "model", parts: toolCalls })

            try {
                const functionResponses = await Promise.all(toolCalls.map(async (part: any) => {
                    const { name, args } = part.functionCall
                    this.logger.info(`Executing tool: ${name}`, { args })

                    const result = await registry.call(name, {
                        adminClient: this.adminClient,
                        projectId: target_project_id || AGENCY_PROJECT_SENTINEL,
                        userId
                    }, args)
                    this.logger.info(`Tool ${name} executed successfully`)

                    return {
                        functionResponse: {
                            name,
                            response: { result }
                        }
                    }
                }))

                toolHistory.push({ role: "function", parts: functionResponses as any })

                // Call Gemini again with the tool results
                geminiResult = await generateContent({
                    ...generateOptions,
                    history: toolHistory
                }, this.geminiApiKey)

                loopCount++
            } catch (toolErr) {
                this.logger.error(`Tool loop execution failed at loop ${loopCount}`, toolErr)
                break
            }
        }

        // ── Step 10: Final JSON Pass ─────────────────────────
        // Now that all tools are executed, we force the response into our structured schema.
        this.logger.info("Step 10: Final pass to structure response into JSON schema")
        geminiResult = await generateContent({
            ...generateOptions,
            tools: undefined, // CRITICAL: Cannot use tools and responseSchema together
            history: toolHistory.length > 1 ? toolHistory : undefined,
            userMessage: toolHistory.length > 1 ? "Provide your final response in the required JSON format based on the results above." : message,
            responseSchema: AGENCY_RESPONSE_SCHEMA as any
        }, this.geminiApiKey)


        const { text: rawReply, usage } = geminiResult

        if (!rawReply) {
            this.logger.error("Gemini returned empty response")
            throw new Error("No response from Gemini API.")
        }

        this.logger.info("Gemini response received", { usage })

        // ── Step 11: Parse AI Response ─────────────────────────
        this.logger.info("Step 11: Parsing AI response")
        let parsed = parseAiResponse(rawReply)
        let finalReply = parsed.message || rawReply
        let signalCreated: AgencyChatResult["signal_created"] = null

        // Intent fail-safe: if user asked for action but no signal was returned
        const userAskedForAction = /signal|flag|remind|follow.?up|reach out/i.test(message)
        if (userAskedForAction && !parsed.signal) {
            this.logger.warn("Action intent detected but no signal returned — applying fail-safe")
            parsed = {
                ...parsed,
                signal: {
                    title: "Follow-up Task Requested",
                    body: finalReply,
                    signal_type: "ai_action",
                    severity: "info",
                    action_label: "View Contact",
                    action_url: null,
                    is_agency_only: true,
                    target_project_id: target_project_id ?? null
                }
            }
            finalReply += "\n\n_Note: I've created an agency-only signal for this._"
        }

        // Anti-hallucination: Ensure social signals have a real UUID from a successful tool call
        if (parsed.signal?.signal_type === 'social') {
            const draftId = parsed.signal.metadata?.social_plan_id
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(draftId || "")
            if (!isUuid) {
                this.logger.warn("Social signal blocked: missed tool call or placeholder ID detected", { draftId })
                parsed.signal = null
            }
        }

        // ── Step 12: Persist Signal (if detected) ─────────────
        if (parsed.signal) {
            this.logger.info("Step 12: Persisting agency signal", { title: parsed.signal.title })

            try {
                // Resolve the target project ID — try UUID, name/slug match, then first project
                let signalProjectId = (parsed.signal as any).target_project_id || target_project_id

                if (signalProjectId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(signalProjectId)) {
                    this.logger.info(`Attempting to resolve project slug: ${signalProjectId}`)
                    const matched = allProjects?.find((p: any) =>
                        p.name.toLowerCase().includes(signalProjectId!.toLowerCase()) ||
                        p.slug.toLowerCase().includes(signalProjectId!.toLowerCase())
                    )
                    signalProjectId = matched?.id ?? null
                }

                if (!signalProjectId) {
                    this.logger.info("No target project resolved, defaulting to Agency Sentinel")
                    signalProjectId = AGENCY_PROJECT_SENTINEL
                }

                if (signalProjectId) {
                    this.logger.info("Inserting signal into database", { projectId: signalProjectId })
                    const agencySignal = { ...parsed.signal, is_agency_only: true }
                    const persistedSignal = await persistSignal(this.adminClient, signalProjectId, agencySignal)

                    if (persistedSignal) {
                        this.logger.info("Signal persisted successfully", { id: persistedSignal.id })
                        signalCreated = { ...persistedSignal, project_id: signalProjectId, is_agency_only: true }
                        await logSignalActivity(this.adminClient, signalProjectId, persistedSignal.title, userId)

                        const targetProject = allProjects?.find((p: any) => p.id === signalProjectId)
                        const signalLabel = parsed.signal.signal_type === 'social' ? 'Content Draft Prepared' : 'Signal Created'
                        const icon = parsed.signal.signal_type === 'social' ? '📝' : '📊'
                        finalReply += `\n\n${icon} **${signalLabel}:** I've flagged this on **${targetProject?.name ?? "the project"}** (Agency-Only).`

                        // Create software ticket for bug reports
                        if (parsed.signal.signal_type === "bug_report") {
                            this.logger.info("Creating software ticket for bug report")
                            const ticketId = await persistTicket(this.adminClient, {
                                project_id: signalProjectId,
                                created_by: userId,
                                title: parsed.signal.title,
                                description: parsed.signal.body,
                                repro_steps: (parsed.signal as any).repro_steps ?? null,
                                expected_behavior: (parsed.signal as any).expected_behavior ?? null,
                                actual_behavior: (parsed.signal as any).actual_behavior ?? null,
                                severity: parsed.signal.severity
                            })

                            if (ticketId) {
                                this.logger.info("Ticket created successfully", { id: ticketId })
                                finalReply += `\n\n🎫 **Ticket Opened:** I've officially opened a software support ticket. The agency development team has been notified.`
                            }
                        }
                    } else {
                        this.logger.error("persistSignal returned null")
                    }
                } else {
                    this.logger.warn("Could not resolve a target project for the signal")
                }
            } catch (signalErr) {
                this.logger.error("Agency signal creation failed (non-fatal)", signalErr)
            }
        }

        // ── Step 13: Persist Messages ─────────────────────────
        this.logger.info("Step 13: Persisting chat messages to history")
        const { error: msgErr } = await this.adminClient.from("chat_messages").insert([
            { session_id: currentSessionId, role: "user", content: message, input_tokens: usage.inputTokens },
            { session_id: currentSessionId, role: "assistant", content: finalReply, output_tokens: usage.outputTokens },
        ])

        if (msgErr) {
            this.logger.error("Failed to persist chat messages", msgErr)
        }

        // ── Step 14: Increment Token Usage ───────────────────
        this.logger.info("Step 14: Incrementing token usage")
        try {
            await this.adminClient.rpc("increment_token_usage", {
                p_project_id: AGENCY_PROJECT_SENTINEL,
                p_user_id: userId,
                p_input_tokens: usage.inputTokens || 0,
                p_output_tokens: usage.outputTokens || 0,
            })
        } catch (err) {
            this.logger.error("Token usage update failed (non-fatal)", err)
        }

        this.logger.info("Agency chat execution completed successfully")

        return {
            session_id: currentSessionId,
            reply: finalReply,
            signal_created: signalCreated,
            input_tokens: usage.inputTokens,
            output_tokens: usage.outputTokens,
            budget: budget ? {
                tier: budget.tier,
                tokens_used: (budget.tokens_used ?? 0) + usage.inputTokens + usage.outputTokens,
                monthly_limit: budget.monthly_limit,
            } : undefined
        }
    }
}
