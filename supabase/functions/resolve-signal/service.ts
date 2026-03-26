/**
 * resolve-signal/service.ts
 * Inner G Complete Agency — Resolve Signal Service
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This file ONLY contains the business logic
 * for resolving a signal. It must NOT handle CORS, 
 * authentication, or raw HTTP responses.
 * ─────────────────────────────────────────────────────────
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SignalRepo, ActivityRepo, TicketRepo } from "../_shared/lib/db/index.ts"

export interface ResolveSignalPayload {
    signal_id: string
    project_id: string
    platforms?: string[]
    scheduled_at?: string
}

/**
 * Orchestrates the signal resolution and activity logging.
 */
export async function resolveSignal(
    adminClient: SupabaseClient,
    userId: string,
    payload: ResolveSignalPayload
) {
    const { signal_id, project_id } = payload

    const signalRepo = new SignalRepo(adminClient)
    const activityRepo = new ActivityRepo(adminClient)
    const ticketRepo = new TicketRepo(adminClient)

    // 1. Fetch signal to get title for logging
    const signal = await signalRepo.getById(signal_id, project_id)
    if (!signal) {
        throw new Error(`Signal not found: ${signal_id}`)
    }

    // 2. Mark as resolved
    await signalRepo.resolve(signal_id, project_id, userId)

    // 3. Log activity
    await activityRepo.log({
        project_id,
        action: `Signal resolved: ${signal.title}`,
        category: "ai",
        triggered_by: userId
    })

    // 4. If this signal was a bug report, close the associated ticket
    try {
        const openTickets = await ticketRepo.getOpenByProject(project_id)
        const matchedTicket = openTickets.find(t => t.title === signal.title)

        if (matchedTicket) {
            await ticketRepo.updateStatus(matchedTicket.id, "closed")

            await activityRepo.log({
                project_id,
                action: `Support ticket closed: ${matchedTicket.title}`,
                category: "system",
                triggered_by: userId
            })
        }
    } catch (err) {
        // Non-fatal, just log and continue
        console.warn("[resolveSignal] Could not sync ticket status:", err)
    }

    // 5. If social signal, update the content plan status
    if (signal.signal_type === 'social' && signal.metadata?.social_plan_id) {
        // Fetch current status to avoid overwriting scheduled posts
        const { data: currentDraft } = await adminClient
            .from("social_content_plan")
            .select("status")
            .eq("id", signal.metadata.social_plan_id)
            .single()

        const status = payload.scheduled_at ? 'scheduled' : 'published'
        
        // ONLY update if it's currently a draft OR if we are explicitly scheduling it now.
        // If it's ALREADY 'scheduled', and we're just acknowledging the signal without a time, keep it scheduled.
        if (currentDraft?.status === 'draft' || payload.scheduled_at) {
            const updateData: any = {
                status,
                scheduled_at: payload.scheduled_at || new Date().toISOString()
            }
            
            await adminClient
                .from("social_content_plan")
                .update(updateData)
                .eq("id", signal.metadata.social_plan_id)

            await activityRepo.log({
                project_id,
                action: `Social content ${status}: ${signal.title}`,
                category: "marketing",
                triggered_by: userId
            })
        }
    }

    return { signal_id, resolved: true }
}
