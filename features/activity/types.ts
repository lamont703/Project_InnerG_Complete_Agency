export interface ActivityEntry {
    action: string
    category: string
    time: string
    created_at?: string
}

export interface RawActivityLog {
    id: string
    project_id: string
    action: string
    category: string
    created_at: string
}

export interface ActivityServiceConfig {
    projectSlug: string
    limit?: number
}
