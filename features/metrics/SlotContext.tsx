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
                    .select("id")
                    .eq("slug", projectSlug || "innergcomplete")
                    .maybeSingle() as any
                
                if (project?.id) {
                    setProjectId(project.id)
                    console.log("[SlotContext] Resolved projectId:", project.id, "for slug:", projectSlug || "innergcomplete")

                    // 2. Fetch Project Entitlements (What the agency allows for this project)
                    const { data: entitlements } = await supabase
                        .from("project_slot_entitlements")
                        .select("slot_id")
                        .eq("project_id", project.id) as any

                    const allowedSlotIds = (entitlements || []).map((e: any) => e.slot_id)

                    // 3. Mirror the Exactly Enabled Architecture (Source of Truth: Agency Hub)
                    // This creates unity across all roles as requested.
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
