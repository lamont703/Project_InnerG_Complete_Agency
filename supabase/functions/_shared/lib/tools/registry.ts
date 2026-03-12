/**
 * _shared/lib/tools/registry.ts
 * Inner G Complete Agency — Tool Registry Configuration
 */

import { ToolRegistry } from "./index.ts"
import { listOpenTicketsTool, updateTicketStatusTool } from "./ticket-tools.ts"

/**
 * Creates and configures the default tool registry for AI agents.
 */
export function createDefaultRegistry(): ToolRegistry {
    const registry = new ToolRegistry()

    // Register Ticket Tools
    registry.register(listOpenTicketsTool)
    registry.register(updateTicketStatusTool)

    return registry
}
