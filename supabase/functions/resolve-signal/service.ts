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

    // 5. If social signal, handle multi-platform content plan orchestration
    if (signal.signal_type === 'social' && signal.metadata?.social_plan_id) {
        const draftId = signal.metadata.social_plan_id
        
        // Fetch current draft to use as a template for cloning
        const { data: currentDraft } = await adminClient
            .from("social_content_plan")
            .select("*")
            .eq("id", draftId)
            .single()

        if (currentDraft) {
            const status = payload.scheduled_at ? 'scheduled' : 'published'
            const targetPlatforms = payload.platforms && payload.platforms.length > 0 
                ? payload.platforms 
                : [currentDraft.platform]

            // 5a. Update the original draft with the first platform
            const primaryPlatform = targetPlatforms[0]
            await adminClient
                .from("social_content_plan")
                .update({
                    status,
                    platform: primaryPlatform,
                    scheduled_at: payload.scheduled_at || new Date().toISOString()
                })
                .eq("id", draftId)

            // 5b. For additional platforms, create NEW records (clones)
            if (targetPlatforms.length > 1) {
                const clones = targetPlatforms.slice(1).map(p => ({
                    project_id,
                    platform: p,
                    content_text: currentDraft.content_text,
                    ai_reasoning: currentDraft.ai_reasoning,
                    source_type: currentDraft.source_type,
                    status,
                    scheduled_at: payload.scheduled_at || new Date().toISOString(),
                    media_url: currentDraft.media_url,
                    metadata: {
                        ...currentDraft.metadata,
                        cloned_from: draftId,
                        cloned_at: new Date().toISOString()
                    }
                }))

                await adminClient
                    .from("social_content_plan")
                    .insert(clones)
            }

            await activityRepo.log({
                project_id,
                action: `Social content ${status} for ${targetPlatforms.join(', ')}`,
                category: "marketing",
                triggered_by: userId
            })
        }
    }

    return { signal_id, resolved: true }
}
