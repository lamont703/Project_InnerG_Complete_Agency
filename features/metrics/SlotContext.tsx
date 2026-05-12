"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { MetricSlot } from "./types"
import { getAvailableSlots } from "./registry"
import { createBrowserClient } from "@/lib/supabase/browser"

import { toast } from "sonner"

interface SlotContextType {
    activeSlotIds: string[]
    availableSlots: MetricSlot[]
    toggleSlot: (id: string) => void
    setActiveSlotIds: (ids: string[]) => void
    saveChanges: () => Promise<void>
    isSaving: boolean
    isInitialLoading: boolean
}

const SlotContext = createContext<SlotContextType | undefined>(undefined)

export function SlotProvider({
    children,
    userRole = 'client-admin',
    projectSlug
}: {
    children: React.ReactNode,
    userRole?: 'client-admin' | 'client-viewer' | 'super-admin'
    projectSlug?: string
}) {
    const [activeSlotIds, setActiveSlotIds] = useState<string[]>([])
    const [availableSlots, setAvailableSlots] = useState<MetricSlot[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [isInitialLoading, setIsInitialLoading] = useState(true)
    const [projectId, setProjectId] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        const slots = getAvailableSlots(userRole, projectSlug)
        console.log("[SlotContext] Initialized available slots:", slots.length, "for role:", userRole, "slug:", projectSlug)
        setAvailableSlots(slots)

        const load = async () => {
            try {
                const supabase = createBrowserClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    setIsInitialLoading(false)
                    return
                }
                setUserId(user.id)

                // 1. Resolve Project ID
                const { data: project } = await supabase
                    .from("projects")
                    .select("id, type")
                    .eq("slug", projectSlug || "innergcomplete")
                    .maybeSingle() as any
                
                if (project?.id) {
                    setProjectId(project.id)
                    console.log("[SlotContext] Resolved projectId:", project.id, "for slug:", projectSlug || "innergcomplete")

                    // 2. Fetch Project Entitlements (What the agency allows for this project)
                    const { data: entitlements } = await (supabase
                        .from("project_slot_entitlements") as any)
                        .select("slot_id")
                        .eq("project_id", project.id)

                    let allowedSlotIds = (entitlements || []).map((e: any) => e.slot_id)

                    // --- SELF-HEALING PROVISIONING GATE (Barber Intelligence Hardening) ---
                    // If this is a barber student project, we ensure the 13 official slots are active.
                    // This fixes cases where legacy projects or manual registrations are missing ports.
                    const BARBER_STUDENT_BLUEPRINT = [
                        'board_readiness_index',
                        'pass_probability',
                        'protected_career_wages',
                        'syntax_mastery_accuracy',
                        'naccas_compliance_buffer',
                        'barber_licensing_mastery',
                        'barber_health_safety_mastery',
                        'barber_hair_scalp_care_mastery',
                        'barber_haircutting_styling_mastery',
                        'barber_haircoloring_mastery',
                        'barber_chemical_texture_mastery',
                        'barber_nail_skin_care_mastery',
                        'barber_shaving_mastery'
                    ];

                    const isBarberStudent = projectSlug?.includes('barber-student') || 
                                          projectSlug?.includes('barber-school') ||
                                          (project as any).type === 'barber_student';

                    if (isBarberStudent) {
                        const missingSlots = BARBER_STUDENT_BLUEPRINT.filter(id => !allowedSlotIds.includes(id));
                        if (missingSlots.length > 0) {
                            console.log("[SlotContext] Hardening architecture: Provisioning missing slots:", missingSlots);
                            
                            // Auto-provision in DB for persistence
                            const provisioningPayload = missingSlots.map(slotId => ({
                                project_id: project.id,
                                slot_id: slotId
                            }));
                            
                            await (supabase.from("project_slot_entitlements") as any).insert(provisioningPayload);
                            
                            // Update local state immediately
                            allowedSlotIds = [...allowedSlotIds, ...missingSlots];
                        }
                    }
                    // --- END PROVISIONING GATE ---

                    // 3. Mirror the Exactly Enabled Architecture (Source of Truth: Agency Hub)
                    setActiveSlotIds(allowedSlotIds)
                    
                    if (userRole !== 'super-admin') {
                        setAvailableSlots(prev => prev.filter(slot => allowedSlotIds.includes(slot.id)))
                    }
                } else {
                    console.warn("[SlotContext] FAILED to resolve project for slug:", projectSlug || "agency-global")
                }
            } catch (err) {
                console.error("Failed to load dashboard config", err)
            } finally {
                setIsInitialLoading(false)
            }
        }

        load()
    }, [userRole, projectSlug])

    const saveChanges = async () => {
        if (!userId || !projectId) {
            console.error("Cannot save: Missing credentials", { userId, projectId })
            toast.error("Unable to identify session or project. Please refresh and try again.")
            return
        }
        
        setIsSaving(true)
        try {
            const supabase = createBrowserClient()
            
            // Log for debugging
            console.log("[SlotContext] Attempting to save dashboard config:", { userId, projectId, slot_ids: activeSlotIds })

            const { data, error } = await (supabase.from("user_dashboard_configs" as any) as any)
                .upsert({
                    user_id: userId,
                    project_id: projectId,
                    slot_ids: activeSlotIds,
                    updated_at: new Date().toISOString()
                }, { 
                    onConflict: 'user_id,project_id'
                } as any) as any

            if (error) {
                console.error("[SlotContext] Upsert ERROR:", error)
                throw error
            }
            
            console.log("[SlotContext] Upsert SUCCESS:", data)
            toast.success("Dashboard layout synchronized successfully.")
        } catch (err) {
            console.error("Failed to save dashboard config", err)
            toast.error("Cloud synchronization failed. Please check your connection.")
        } finally {
            setIsSaving(false)
        }
    }

    const toggleSlot = (slotId: string) => {
        setActiveSlotIds(prev =>
            prev.includes(slotId)
                ? prev.filter(id => id !== slotId)
                : [...prev, slotId]
        )
    }

    return (
        <SlotContext.Provider value={{ 
            activeSlotIds, 
            availableSlots, 
            toggleSlot, 
            setActiveSlotIds: (ids) => setActiveSlotIds(ids),
            saveChanges,
            isSaving,
            isInitialLoading
        }}>
            {children}
        </SlotContext.Provider>
    )
}

export function useSlotContext() {
    const context = useContext(SlotContext)
    if (context === undefined) {
        throw new Error("useSlotContext must be used within a SlotProvider")
    }
    return context
}
