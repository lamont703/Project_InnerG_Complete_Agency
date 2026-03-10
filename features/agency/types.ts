import { LucideIcon } from "lucide-react"

export interface AgencyProject {
    id: string
    name: string
    slug: string
    status: string
    type: string
    active_campaign_name?: string
    clients?: {
        name: string
        industry: string
    }
}

export interface StrategicSignal {
    id: string
    title: string
    body: string
    severity: "critical" | "warning" | "info"
    created_at: string
    projects?: {
        name: string
    }
}

export interface ActivityLogEntry {
    id: string
    action: string
    category: string
    created_at: string
    projects?: {
        name: string
    }
}

export interface OperationalSignal {
    id: string
    title: string
    signal_type: string
    severity: "critical" | "warning" | "info"
    created_at: string
    is_resolved: boolean
    projects?: {
        name: string
    }
}

export interface PortfolioMetric {
    label: string
    value: string | number
    change?: string
    trend?: "up" | "down" | "neutral"
    icon: LucideIcon
    color: string
}

export interface AgencyUserData {
    name: string
    role: string
}

export interface AgencyChatMessage {
    id: string
    role: "user" | "assistant"
    content: string
    timestamp: Date
    signalCreated?: {
        id: string
        title: string
        severity: string
        signal_type: string
        project_id?: string
    } | null
}
