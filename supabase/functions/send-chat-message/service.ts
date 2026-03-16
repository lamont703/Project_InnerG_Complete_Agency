/**
 * send-chat-message/service.ts
 * Inner G Complete Agency — Client Growth Assistant Chat Service
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This file ONLY contains business logic.
 * It must NOT handle CORS, authentication, or HTTP responses.
 * For prompt content, edit prompt-engineer.ts.
 * For signal/ticket persistence, see signal-processor.ts.
 * ─────────────────────────────────────────────────────────
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Logger, generateContent, embedText, GEMINI_MODELS } from "../_shared/lib/index.ts"
import { buildSystemPrompt, RESPONSE_SCHEMA } from "./prompt-engineer.ts"
import { parseAiResponse, persistSignal, persistTicket, logSignalActivity } from "./signal-processor.ts"
import { CONFIG_TO_SOURCE_TABLES, ChatFunctionResponse } from "./types.ts"
import { createDefaultRegistry } from "../_shared/lib/tools/registry.ts"

export interface ChatServiceInput {
    project_id: string
    message: string
    model?: string
    session_id?: string | null
    userId: string
    authHeader: string
}

const AGENCY_PROJECT_ID = "00000000-0000-0000-0000-000000000001"

export class ChatService {
    constructor(
        private adminClient: SupabaseClient,
        private logger: Logger,
        private geminiApiKey: string
    ) { }

    async chat(input: ChatServiceInput): Promise<{
        data: ChatFunctionResponse & {
            model_used: string
            input_tokens: number
            output_tokens: number
            sources_enabled: number
            context_chunks_used: number
            budget_exceeded?: boolean
            budget?: object
        }
    }> {
        const { project_id, message, session_id, userId, authHeader } = input
        const model = input.model ?? GEMINI_MODELS.FLASH_LITE
        this.logger.info("Starting growth assistant chat execution", { project_id, userId, model, hasSessionId: !!session_id })

        // ── Step 1: Token Budget Check ────────────────────────
        this.logger.info("Step 1: Checking token budget")
        let budgetRows = null
        try {
            const { data } = await this.adminClient.rpc("check_token_budget", {
                p_project_id: project_id,
            })
            budgetRows = data
        } catch (err) {
            this.logger.warn("Token budget check failed", { error: err })
        }

        const budget = budgetRows?.[0]

        if (budget?.is_over_budget) {
            this.logger.warn("Budget exceeded", { project_id, usage_percent: budget.usage_percent })
            return {
                data: {
                    reply: `⚠️ Your AI usage quota for this month has been reached (${budget.usage_percent}% of your ${budget.tier} plan limit). Please contact your administrator to upgrade your plan or wait until next month.`,
                    session_id: session_id ?? null,
                    signal_created: null,
                    model_used: model,
                    input_tokens: 0,
                    output_tokens: 0,
                    sources_enabled: 0,
                    context_chunks_used: 0,
                    budget_exceeded: true,
                    budget: { tier: budget.tier, tokens_used: budget.tokens_used, monthly_limit: budget.monthly_limit }
                }
            }
        }

        // ── Step 2: Fetch Active Integrations & Agent Config ──
        this.logger.info("Step 2: Fetching active project integrations & agent configuration")
        
        // Fetch active integrations from current project
        const { data: projectIntegrations } = await this.adminClient
            .from("client_db_connections")
            .select("db_type")
            .eq("project_id", project_id)
            .eq("is_active", true)

        // Fetch active integrations from Agency project (Shared/Master tools)
        const { data: agencyIntegrations } = await this.adminClient
            .from("client_db_connections")
            .select("db_type")
            .eq("project_id", AGENCY_PROJECT_ID)
            .eq("is_active", true)

        const connectedPlatforms = new Set([
            ...(projectIntegrations || []).map((i: any) => i.db_type.toLowerCase()),
            ...(agencyIntegrations || []).map((i: any) => i.db_type.toLowerCase())
        ])

        const isAgencyPortal = project_id === AGENCY_PROJECT_ID

        const { data: agentConfig, error: configErr } = await this.adminClient
            .from("project_agent_config")
            .select("*")
            .eq("project_id", project_id)
            .single()

        if (configErr && configErr.code !== "PGRST116") { // Ignore not found
            this.logger.warn("Agent config fetch failed", { error: configErr })
        }

        const allowedSourceTables: string[] = []
        const disabledSources: string[] = []

        // Map config keys to their required platform identifier in client_db_connections
        const PLATFORM_MAP: Record<string, string> = {
            ghl_contacts_enabled: "ghl",
            campaign_metrics_enabled: "ghl",
            youtube_data_enabled: "youtube",
            linkedin_data_enabled: "linkedin",
            notion_data_enabled: "notion",
            tiktok_data_enabled: "tiktok",
            github_data_enabled: "github",
            news_intelligence_enabled: "newsapi"
        }

        for (const [configKey, sourceTables] of Object.entries(CONFIG_TO_SOURCE_TABLES)) {
            let isEnabled = agentConfig ? (agentConfig as any)[configKey] !== false : true
            
            // For client portals, additional check: is the platform connected LOCALLY or via AGENCY?
            const requiredPlatform = PLATFORM_MAP[configKey]
            if (!isAgencyPortal && requiredPlatform && isEnabled) {
                if (!connectedPlatforms.has(requiredPlatform)) {
                    this.logger.info(`Auto-disabling ${configKey} - No active connection found for ${requiredPlatform} (Checked Local & Agency)`)
                    isEnabled = false
                }
            }

            if (isEnabled) {
                allowedSourceTables.push(...sourceTables)
            } else {
                disabledSources.push(configKey.replace("_enabled", "").replace(/_/g, " "))
            }
        }

        this.logger.info("Data sources configured after connection filtering", { 
            enabledCount: allowedSourceTables.length, 
            allowed: allowedSourceTables,
            disabled: disabledSources,
            platformsDetected: Array.from(connectedPlatforms)
        })

        // ── Step 3: RAG — Embed & Search ─────────────────────
        this.logger.info("Step 3: Embedding user message for RAG")
        const queryVector = await embedText(message, this.geminiApiKey).catch(err => {
            this.logger.error("Embedding generation failed", err)
            return null
        }) ?? []

        const contextChunks: string[] = []
        const pastSessionContext: string[] = []

        if (queryVector.length > 0) {
            const isAgencyPortal = project_id === AGENCY_PROJECT_ID
            this.logger.info(`Performing vector search (${isAgencyPortal ? "Agency Global" : "Project Local"})`, { project_id })

            if (isAgencyPortal) {
                // Global Agency Search
                const { data: chunks, error: matchErr } = await this.adminClient.rpc("match_documents_agency", {
                    query_embedding: queryVector,
                    match_threshold: 0.4, // Slightly lower threshold for global discovery
                    match_count: 20
                })

                if (matchErr) {
                    this.logger.warn("Global vector search RPC failed", { error: matchErr })
                } else if (chunks) {
                    this.logger.info(`Global search found ${chunks.length} relevant chunks`)
                    contextChunks.push(...chunks.slice(0, 10).map((c: any) => {
                        const content = c.content_chunk || c.content
                        return `[Project: ${c.project_id}] [${c.source_table}] (ID: ${c.source_id}) ${content}`
                    }))
                }

                // Global Memory Search
                if (allowedSourceTables.includes("session_summaries")) {
                    try {
                        const { data: pastSummaries, error: summaryErr } = await this.adminClient.rpc("match_session_summaries_agency", {
                            query_embedding: queryVector,
                            p_user_id: userId,
                            match_threshold: 0.45,
                            match_count: 5,
                        })

                        if (summaryErr) {
                            this.logger.warn("Global session summary search failed", { error: summaryErr })
                        } else if (pastSummaries?.length > 0) {
                            pastSessionContext.push(...pastSummaries.map((s: any) => `[Project: ${s.project_id}] ${s.content_chunk}`))
                        }
                    } catch (err) {
                        this.logger.warn("Global session summary exception", { error: err })
                    }
                }
            } else {
                // Hybrid Search: Local Project + Agency (for shared integrations)
                const searchTasks = [
                    this.adminClient.rpc("match_documents", {
                        query_embedding: queryVector,
                        match_threshold: 0.35,
                        match_count: 12,
                        p_project_id: project_id,
                    }),
                    this.adminClient.rpc("match_documents", {
                        query_embedding: queryVector,
                        match_threshold: 0.4,
                        match_count: 8,
                        p_project_id: AGENCY_PROJECT_ID,
                    })
                ]

                const results = await Promise.all(searchTasks)
                const combinedChunks = results.flatMap((r: any) => r.data || [])

                if (combinedChunks.length > 0) {
                    this.logger.info(`RAG Search: Found ${combinedChunks.length} raw combined chunks`)
                    const filtered = combinedChunks.filter((c: any) => allowedSourceTables.includes(c.source_table))
                    this.logger.info(`RAG Search: Found ${filtered.length} relevant chunks after filtering`, {
                        allowedTables: allowedSourceTables,
                        returnedTables: [...new Set(combinedChunks.map((c: any) => c.source_table))]
                    })
                    contextChunks.push(...filtered.slice(0, 10).map((c: any) => {
                        const status = c.is_processed ? "[PROCESSED] " : ""
                        const label = c.source_table === "project_knowledge" ? "KNOWLEDGE BASE" : c.source_table.toUpperCase()
                        const projectStub = c.project_id === AGENCY_PROJECT_ID ? "[AGENCY] " : ""
                        return `${projectStub}[${label}] ${status}(ID: ${c.source_id}) ${c.content}`
                    }))
                }

                // Isolated Memory Search
                if (allowedSourceTables.includes("session_summaries")) {
                    try {
                        const { data: pastSummaries, error: summaryErr } = await this.adminClient.rpc("match_session_summaries", {
                            query_embedding: queryVector,
                            p_user_id: userId,
                            p_project_id: project_id,
                            match_threshold: 0.45,
                            match_count: 3,
                        })

                        if (summaryErr) {
                            this.logger.warn("Isolated session summary search failed", { error: summaryErr })
                        } else if (pastSummaries?.length > 0) {
                            pastSessionContext.push(...pastSummaries.map((s: any) => s.content_chunk))
                        }
                    } catch (err) {
                        this.logger.warn("Isolated session summary exception", { error: err })
                    }
                }
            }
        }

        // ── Step 4: Get or Create Chat Session ───────────────
        this.logger.info("Step 4: Managing chat session")
        let currentSessionId = session_id
        if (!currentSessionId) {
            this.logger.info("Creating new chat session")
            const { data: session, error: sessionErr } = await this.adminClient
                .from("chat_sessions")
                .insert({ project_id, user_id: userId, model_used: model })
                .select("id")
                .single()

            if (sessionErr) {
                this.logger.error("Failed to create user chat session", sessionErr)
                currentSessionId = null
            } else {
                this.logger.info("New session created", { id: session?.id })
                currentSessionId = session?.id ?? null
            }
        }

        // ── Step 5: Fetch Recent Chat History ────────────────
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
                    history.reverse().map((m: any) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n")
            }
        }

        // ── Step 6: Fetch Project Name ────────────────────────
        this.logger.info("Step 6: Fetching project metadata")
        const { data: project, error: projErr } = await this.adminClient
            .from("projects")
            .select("name")
            .eq("id", project_id)
            .single()

        if (projErr) {
            this.logger.warn("Project metadata fetch failed", { error: projErr })
        }

        // ── Step 7: Build System Prompt ───────────────────────
        this.logger.info("Step 7: Building system prompt")
        const activeSourceList = allowedSourceTables
            .filter(t => !t.includes("_daily"))
            .map(t => t.replace(/_/g, " "))

        const ragContext = [
            contextChunks.length > 0 ? "Project Data:\n" + contextChunks.join("\n---\n") : "",
            pastSessionContext.length > 0 ? "Project Memory:\n" + pastSessionContext.join("\n---\n") : "",
            historyPrompt,
        ].filter(Boolean).join("\n\n")

        const disabledNote = disabledSources.length > 0
            ? `Note: The following data sources are DISABLED: ${disabledSources.join(", ")}. Do not reference them.`
            : undefined

        const systemPrompt = buildSystemPrompt({
            projectName: project?.name ?? "Your Project",
            enabledSources: activeSourceList,
            ragContext,
            recentSummary: disabledNote
        })

        this.logger.info("System prompt constructed", { 
            ragContextLength: ragContext.length,
            contextChunksCount: contextChunks.length,
            historyPromptLength: historyPrompt.length
        })

        // ── Step 8: Call Gemini (with Tool Loop) ────────────
        this.logger.info(`Step 8: Calling Gemini v1beta API (${model}) with Multi-Step Tool Capabilities`)
        const registry = createDefaultRegistry()
        
        // Strictly filter tools so the AI only sees capabilities for active sources
        const filteredToolDefinitions = registry.getFilteredDefinitions(allowedSourceTables)
        const tools = [{ functionDeclarations: filteredToolDefinitions }]

        this.logger.info(`Tool registry filtered: ${filteredToolDefinitions.length} of ${registry.getDefinitions().length} tools enabled`)

        const generateOptions = {
            model: model as any,
            systemPrompt,
            userMessage: message,
            temperature: 0.1, // Lower temperature for more accurate tool calling
            maxOutputTokens: 2048,
            history: historyPrompt ? [{ role: "user", parts: [{ text: historyPrompt }] }] : [],
            tools,
        }

        let geminiResult = await generateContent(generateOptions, this.geminiApiKey).catch(err => {
            this.logger.error("Gemini API call failed", err)
            throw err
        })

        const toolHistory: any[] = [{ role: "user", parts: [{ text: message }] }]
        let loopCount = 0
        const MAX_LOOPS = 4

        while (loopCount < MAX_LOOPS) {
            const modelParts = (geminiResult.rawData as any).candidates?.[0]?.content?.parts || []
            const toolCalls = modelParts.filter((p: any) => p.functionCall)

            if (toolCalls.length === 0) break

            this.logger.info(`Loop ${loopCount + 1}: Gemini requested ${toolCalls.length} tool calls`)
            toolHistory.push({ role: "model", parts: toolCalls })

            try {
                const functionResponses = await Promise.all(toolCalls.map(async (part: any) => {
                    const { name, args } = part.functionCall
                    this.logger.info(`Executing tool: ${name}`, { args })

                    const result = await registry.call(name, {
                        adminClient: this.adminClient,
                        projectId: project_id,
                        userId
                    }, args)

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

        // ── Step 9: Final JSON Pass ─────────────────────────
        this.logger.info("Step 9: Final pass to structure response into JSON schema")
        geminiResult = await generateContent({
            ...generateOptions,
            tools: undefined,
            history: toolHistory.length > 1 ? toolHistory : undefined,
            userMessage: toolHistory.length > 1 ? "Provide your final response in the required JSON format based on the results above." : message,
            responseSchema: RESPONSE_SCHEMA as any
        }, this.geminiApiKey)


        const { text: rawReply, usage } = geminiResult

        if (!rawReply) {
            this.logger.error("Gemini returned empty response")
            throw new Error("No response from Gemini API.")
        }

        this.logger.info("Gemini response received", { usage })

        // ── Step 9: Parse AI Response ─────────────────────────
        this.logger.info("Step 9: Parsing AI response")
        const parsed = parseAiResponse(rawReply)
        let finalReply = parsed.message || rawReply
        let signalCreated: any = null

        // ── Step 10: Persist Signal (if detected) ─────────────
        if (parsed.signal) {
            this.logger.info("Step 10: Persisting growth signal", { type: parsed.signal.signal_type, severity: parsed.signal.severity })

            try {
                const persistedSignal = await persistSignal(this.adminClient, project_id, parsed.signal)

                if (persistedSignal) {
                    this.logger.info("Signal persisted successfully", { id: persistedSignal.id })
                    signalCreated = persistedSignal
                    await logSignalActivity(this.adminClient, project_id, persistedSignal.title, userId)

                    finalReply += `\n\n📊 **Signal Created:** I've flagged a ${parsed.signal.severity} ${parsed.signal.signal_type} signal: "${parsed.signal.title}". It will appear on your dashboard.`

                    // If bug report, also create a software ticket
                    if (parsed.signal.signal_type === "bug_report") {
                        this.logger.info("Creating software ticket for bug report")
                        const ticketId = await persistTicket(this.adminClient, {
                            project_id,
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
                            finalReply += `\n\n🎫 **Ticket Opened:** I've officially opened a software support ticket for this issue. The agency development team has been notified.`
                        }
                    }
                } else {
                    this.logger.error("persistSignal returned null")
                }
            } catch (signalErr) {
                this.logger.error("Signal creation failed (non-fatal)", signalErr)
            }
        }

        // ── Step 11: Persist Messages ─────────────────────────
        this.logger.info("Step 11: Persisting chat messages to history")
        const { error: msgErr } = await this.adminClient.from("chat_messages").insert([
            { session_id: currentSessionId, role: "user", content: message, input_tokens: usage.inputTokens },
            { session_id: currentSessionId, role: "assistant", content: finalReply, output_tokens: usage.outputTokens },
        ])

        if (msgErr) {
            this.logger.error("Failed to persist chat messages", msgErr)
        }

        // ── Step 12: Increment Token Usage ───────────────────
        this.logger.info("Step 12: Incrementing token usage")
        if (usage.inputTokens > 0 || usage.outputTokens > 0) {
            try {
                await this.adminClient.rpc("increment_token_usage", {
                    p_project_id: project_id,
                    p_user_id: userId,
                    p_input_tokens: usage.inputTokens,
                    p_output_tokens: usage.outputTokens,
                })
            } catch (err) {
                this.logger.error("Token usage update failed (non-fatal)", err)
            }
        }

        this.logger.info("Growth assistant chat execution completed successfully")

        return {
            data: {
                session_id: currentSessionId ?? null,
                reply: finalReply,
                model_used: model,
                input_tokens: usage.inputTokens,
                output_tokens: usage.outputTokens,
                sources_enabled: allowedSourceTables.length,
                context_chunks_used: contextChunks.length,
                signal_created: signalCreated,
                budget: budget ? {
                    tier: budget.tier,
                    tokens_used: (budget.tokens_used ?? 0) + usage.inputTokens + usage.outputTokens,
                    monthly_limit: budget.monthly_limit,
                } : undefined
            }
        }
    }
}
