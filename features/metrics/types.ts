export interface Metric {
    label: string
    value: string
    growth: string
    icon: any
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

export interface MetricsData {
    campaignName: string
    metrics: Metric[]
}
