"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { MetricSlot } from "./types"
import { getAvailableSlots } from "./registry"

interface SlotContextType {
    activeSlotIds: string[]
    availableSlots: MetricSlot[]
    toggleSlot: (id: string) => void
    setActiveSlotIds: (ids: string[]) => void
}

const SlotContext = createContext<SlotContextType | undefined>(undefined)

export function SlotProvider({
    children,
    userRole = 'client'
}: {
    children: React.ReactNode,
    userRole?: 'client' | 'admin' | 'super-admin'
}) {
    const [activeSlotIds, setActiveSlotIds] = useState<string[]>([])
    const [availableSlots, setAvailableSlots] = useState<MetricSlot[]>([])

    useEffect(() => {
        const slots = getAvailableSlots(userRole)
        setAvailableSlots(slots)

        // Default layouts
        if (userRole === 'super-admin') {
            setActiveSlotIds(["active_architectures", "system_health", "agency_intelligence"])
        } else {
            setActiveSlotIds(["total_signups", "app_installs", "funnel_conversion", "social_reach"])
        }
    }, [userRole])

    const toggleSlot = (slotId: string) => {
        setActiveSlotIds(prev =>
            prev.includes(slotId)
                ? prev.filter(id => id !== slotId)
                : [...prev, slotId]
        )
    }

    return (
        <SlotContext.Provider value={{ activeSlotIds, availableSlots, toggleSlot, setActiveSlotIds }}>
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
