export type SignalType = "inventory" | "conversion" | "social" | string
export type SignalSeverity = "info" | "warning" | "critical" | string

export interface Signal {
    id: string
    signalType: SignalType
    title: string
    body: string
    actionLabel: string
    severity: SignalSeverity
    color: string
    buttonColor: string
    isAgencyOnly?: boolean
    projectName?: string
    createdAt?: string
    actionUrl?: string
    metadata?: Record<string, any>
}

export interface RawSignalRecord {
    id: string
    project_id: string
    signal_type: string
    title: string
    body: string
    action_label: string | null
    severity: string
    is_resolved: boolean
    is_agency_only: boolean
    created_at: string
    action_url: string | null
    metadata: Record<string, any>
}

export interface SignalSlot {
    id: string
    label: string
    description: string
    category: 'agency' | 'marketing' | 'operations' | 'education'
    permissions: ('client' | 'admin' | 'super-admin')[]
    iconName: string
    defaultLimit: number
}

export interface ResolveSignalParams {
    signalId: string
    projectId: string
    accessToken: string
    platforms?: string[]
    scheduledAt?: string
}
