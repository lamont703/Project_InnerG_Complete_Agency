import { SignalSlot } from "./types"

/**
 * SIGNAL_REGISTRY
 * 
 * Master registry for intelligent signal feeds.
 * Defines how different types of AI insights are categorized and displayed.
 */
export const SIGNAL_REGISTRY: SignalSlot[] = [
    // --- CLIENT SIGNAL SLOTS ---
    {
        id: "marketing_intelligence",
        label: "Marketing Intelligence",
        description: "Live signals regarding conversion rates, lead quality, and funnel performance.",
        category: 'marketing',
        permissions: ['client', 'admin', 'super-admin'],
        iconName: "Zap",
        defaultLimit: 5
    },
    {
        id: "operational_alerts",
        label: "Operational Alerts",
        description: "Critical alerts for inventory levels, system uptime, and retail handshake stability.",
        category: 'operations',
        permissions: ['client', 'admin', 'super-admin'],
        iconName: "AlertTriangle",
        defaultLimit: 3
    },

    // --- AGENCY SIGNAL SLOTS ---
    {
        id: "agency_portfolio_intelligence",
        label: "Portfolio Intelligence",
        description: "God Mode stream showing strategic patterns across all managed client architectures.",
        category: 'agency',
        permissions: ['super-admin'],
        iconName: "Sparkles",
        defaultLimit: 10
    },
    {
        id: "cross_project_health",
        label: "Cross-Architecture Health",
        description: "Unified feed of operational issues occurring across the entire agency portfolio.",
        category: 'operations',
        permissions: ['super-admin'],
        iconName: "Activity",
        defaultLimit: 10
    },
    {
        id: "global_portfolio_monitoring",
        label: "Global Portfolio Monitoring",
        description: "Unified command stream for both strategic patterns and operational health across all deployments.",
        category: 'agency',
        permissions: ['super-admin'],
        iconName: "Target",
        defaultLimit: 20
    },
    {
        id: "software_support",
        label: "Software Support",
        description: "Direct stream of bug reports and feature requests from client portals.",
        category: 'operations',
        permissions: ['super-admin'],
        iconName: "Bug",
        defaultLimit: 10
    }
]

export function getAvailableSignalSlots(userRole: 'client' | 'admin' | 'super-admin'): SignalSlot[] {
    return SIGNAL_REGISTRY.filter(slot => slot.permissions.includes(userRole))
}

export function getSignalSlotById(id: string): SignalSlot | undefined {
    return SIGNAL_REGISTRY.find(slot => slot.id === id)
}
