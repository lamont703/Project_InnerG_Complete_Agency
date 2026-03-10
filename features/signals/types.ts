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
}

export interface ResolveSignalParams {
    signalId: string
    projectId: string
    accessToken: string
}
