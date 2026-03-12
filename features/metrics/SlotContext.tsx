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
    const storageKey = `dashboard_active_slots_${userRole}`
    const [activeSlotIds, setActiveSlotIds] = useState<string[]>([])
    const [availableSlots, setAvailableSlots] = useState<MetricSlot[]>([])
    const [isInitialized, setIsInitialized] = useState(false)

    useEffect(() => {
        const slots = getAvailableSlots(userRole)
        setAvailableSlots(slots)

        // Load from persistence
        const saved = localStorage.getItem(storageKey)
        if (saved) {
            try {
                setActiveSlotIds(JSON.parse(saved))
            } catch (e) {
                console.error("Failed to parse saved slots", e)
            }
        }
        setIsInitialized(true)
    }, [userRole, storageKey])

    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem(storageKey, JSON.stringify(activeSlotIds))
        }
    }, [activeSlotIds, isInitialized, storageKey])

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
