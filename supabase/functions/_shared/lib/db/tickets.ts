/**
 * _shared/lib/db/tickets.ts
 * Inner G Complete Agency — Software Tickets Repository
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This is the ONLY place where raw Supabase 
 * calls for the 'software_tickets' table should live.
 * ─────────────────────────────────────────────────────────
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SoftwareTicketPayload, TicketStatus } from "../types.ts"

export interface SoftwareTicketRow extends SoftwareTicketPayload {
    id: string
    created_at: string
    updated_at: string
    assigned_to?: string | null
}

export class TicketRepo {
    constructor(private client: SupabaseClient) { }

    /**
     * Creates a new software ticket.
     */
    async create(payload: SoftwareTicketPayload): Promise<SoftwareTicketRow> {
        const { data, error } = await this.client
            .from("software_tickets")
            .insert({
                project_id: payload.project_id,
                created_by: payload.created_by,
                title: payload.title,
                description: payload.description,
                repro_steps: payload.repro_steps || null,
                expected_behavior: payload.expected_behavior || null,
                actual_behavior: payload.actual_behavior || null,
                severity: payload.severity,
                status: payload.status || "open",
            })
            .select("*")
            .single()

        if (error) throw error
        return data as SoftwareTicketRow
    }

    /**
     * Updates the status of a ticket.
     */
    async updateStatus(ticketId: string, status: TicketStatus): Promise<SoftwareTicketRow> {
        const { data, error } = await this.client
            .from("software_tickets")
            .update({ status, updated_at: new Date().toISOString() })
            .eq("id", ticketId)
            .select("*")
            .single()

        if (error) throw error
        return data as SoftwareTicketRow
    }

    /**
     * Fetches a ticket by ID.
     */
    async getById(ticketId: string): Promise<SoftwareTicketRow | null> {
        const { data, error } = await this.client
            .from("software_tickets")
            .select("*")
            .eq("id", ticketId)
            .maybeSingle()

        if (error) throw error
        return data as SoftwareTicketRow | null
    }

    /**
     * Fetches all open tickets for a project.
     */
    async getOpenByProject(projectId: string): Promise<SoftwareTicketRow[]> {
        const { data, error } = await this.client
            .from("software_tickets")
            .select("*")
            .eq("project_id", projectId)
            .neq("status", "closed")
            .order("created_at", { ascending: false })

        if (error) throw error
        return (data || []) as SoftwareTicketRow[]
    }
}
