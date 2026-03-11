/**
 * _shared/lib/tools/index.ts
 * Inner G Complete Agency — AI Tool Registry
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This is the ONLY place to register new 
 * "Capabilities" (Tools) for the AI agents.
 * 
 * A Tool is a standalone module that allows the AI to 
 * take action (e.g., check a status, send an email).
 * ─────────────────────────────────────────────────────────
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

export interface ToolDefinition {
    name: string
    description: string
    parameters: Record<string, unknown>
}

export interface ToolContext {
    adminClient: SupabaseClient
    projectId: string
    userId?: string
}

export type ToolExecutor = (context: ToolContext, args: any) => Promise<any>

export interface RegisteredTool {
    definition: ToolDefinition
    execute: ToolExecutor
}

/**
 * The Registry contains all tools that AI agents are permitted to use.
 * This prevents the AI from "inventing" unauthorized actions.
 */
export class ToolRegistry {
    private tools: Map<string, RegisteredTool> = new Map()

    /**
     * Registers a new tool capability.
     */
    register(tool: RegisteredTool) {
        this.tools.set(tool.definition.name, tool)
    }

    /**
     * Returns the definitions for all registered tools (to send to Gemini).
     */
    getDefinitions(): ToolDefinition[] {
        return Array.from(this.tools.values()).map(t => t.definition)
    }

    /**
     * Executes a tool by name with provided arguments.
     */
    async call(name: string, context: ToolContext, args: any): Promise<any> {
        const tool = this.tools.get(name)
        if (!tool) {
            throw new Error(`TOOL_NOT_FOUND: The tool '${name}' is not in the authorized registry.`)
        }

        console.log(`[ToolRegistry] Executing ${name}...`)
        return await tool.execute(context, args)
    }
}
