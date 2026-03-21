import { LucideIcon } from "lucide-react"

export interface Metric {
    id?: string
    label: string
    value: string | number
    growth?: string
    change?: string
    trend?: "up" | "down" | "neutral"
    icon: LucideIcon | any
    color: string
}

export interface RawMetricRecord {
    id: string
    campaign_id: string
    total_signups: number
    reader_app_installs: number
    funnel_conversion_rate: number
    social_reach_total: number
    snapshot_date: string
}

export interface MetricSlot {
    id: string
    label: string
    description: string
    category: 'agency' | 'marketing' | 'operations' | 'finance'
    type: 'kpi' | 'chart' | 'list'
    permissions: ('client-admin' | 'client-viewer' | 'super-admin')[]
    iconName: string // Lucide icon name as string for serializable registry
    allowedProjectSlugs?: string[] // Optional: restrict this slot to specific projects
}

export interface MetricsData {
    campaignName: string
    metrics: Metric[]
}
