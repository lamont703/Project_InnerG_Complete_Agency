"use client"

import { useState, useEffect } from "react"
import { MetricSlot } from "./types"
import { getAvailableSlots } from "./registry"

/**
 * useSlotConfiguration
 * 
 * Manages the user's dashboard layout and which slots are active.
 * In a production system, this would fetch from a 'dashboard_configs' table.
 */
export function useSlotConfiguration(userRole: 'client-admin' | 'client-viewer' | 'super-admin' = 'client-admin') {
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

    return {
        activeSlotIds,
        availableSlots,
        toggleSlot,
        setActiveSlotIds
    }
}
