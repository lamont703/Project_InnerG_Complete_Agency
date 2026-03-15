/**
 * _shared/lib/tools/tickets/index.ts
 * Inner G Complete Agency — Software Ticket Tools
 */

import { RegisteredTool, ToolContext } from "../index.ts"
import { TicketRepo } from "../../db/operations/tickets.ts"
import { TicketStatus } from "../../types/index.ts"

/**
 * Tool: list_open_tickets
 */
export const listOpenTicketsTool: RegisteredTool = {
    definition: {
        name: "list_open_tickets",
        description: "Fetches all active software support tickets (open, in_progress, testing, fixed) for a project or the entire portfolio.",
        parameters: {
            type: "object",
            properties: {
                project_id: {
                    type: "string",
                    description: "Optional. UUID of the project to filter by."
                },
                status: {
                    type: "string",
                    description: "Optional. Specific status to filter by.",
                    enum: ["open", "in_progress", "testing", "fixed"]
                }
            }
        }
    },
    execute: async (context: ToolContext, args: any) => {
        const repo = new TicketRepo(context.adminClient)

        if (args.project_id) {
            return await repo.getOpenByProject(args.project_id)
        }

        // Fetch all open across portfolio
        let query = context.adminClient
            .from("software_tickets")
            .select("*, projects(name)")
            .neq("status", "closed")
            .order("created_at", { ascending: false })

        if (args.status) {
            query = query.eq("status", args.status)
        }

        const { data, error } = await query
        if (error) throw error
        return data
    }
}

/**
 * Tool: update_ticket_status
 */
export const updateTicketStatusTool: RegisteredTool = {
    definition: {
        name: "update_ticket_status",
        description: "Updates the status of a software support ticket. Use this when you resolve an issue, start working on a bug, or need to close a ticket.",
        parameters: {
            type: "object",
            properties: {
                ticket_id: {
                    type: "string",
                    description: "The UUID of the ticket to update."
                },
                status: {
                    type: "string",
                    description: "The new status for the ticket.",
                    enum: ["open", "in_progress", "testing", "fixed", "closed"]
                }
            },
            required: ["ticket_id", "status"]
        }
    },
    execute: async (context: ToolContext, args: any) => {
        const { ticket_id, status } = args
        const repo = new TicketRepo(context.adminClient)

        await repo.updateStatus(ticket_id, status as TicketStatus)

        return {
            success: true,
            message: `Ticket ${ticket_id} updated to ${status}.`
        }
    }
}
