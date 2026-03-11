import { SupabaseClient } from "@supabase/supabase-js"
import { supabaseAnonKey } from "@/lib/supabase/browser"
import { Signal, RawSignalRecord, ResolveSignalParams } from "./types"

const TYPE_COLORS: Record<string, string> = {
    inventory: "bg-emerald-500",
    conversion: "bg-primary",
    social: "bg-pink-500",
}

const SEVERITY_BUTTONS: Record<string, string> = {
    info: "bg-pink-600 hover:bg-pink-700 text-white",
    warning: "bg-emerald-600 hover:bg-emerald-700 text-white",
    critical: "bg-primary text-primary-foreground hover:bg-primary/90",
}

export const DEMO_MOCK_SIGNALS: Signal[] = [
    {
        id: "sig-inventory-001",
        signalType: "inventory",
        title: "Growth Opportunity Identified",
        body: "System analysis indicates a surge in interest for your primary service. Current capacity is optimal, but expansion is recommended.",
        actionLabel: "ANALYZE SCALING PLAN",
        severity: "warning",
        color: "bg-emerald-500",
        buttonColor: "bg-emerald-600 hover:bg-emerald-500 text-white",
    },
    {
        id: "sig-conversion-001",
        signalType: "conversion",
        title: "Conversion Optimization Signal",
        body: "Real-time data identifies a high-intent segment stalling at the final conversion step. Potential impact: Significant revenue lift.",
        actionLabel: "OPTIMIZE CONVERSION FLOW",
        severity: "critical",
        color: "bg-primary",
        buttonColor: "bg-primary text-primary-foreground hover:bg-primary/90",
    },
    {
        id: "sig-agency-pipeline-001",
        signalType: "strategic",
        title: "Inner G Complete Agency Pipeline Status",
        body: "The current pipeline for the Inner G Complete Agency Growth Portal indicates a strong influx of early-stage opportunities. Detailed review of conversion rates and sales cycle progression is recommended to optimize the pipeline's efficiency.",
        actionLabel: "ACKNOWLEDGE",
        severity: "info",
        color: "bg-violet-500",
        buttonColor: "bg-violet-600 hover:bg-violet-500 text-white",
        isAgencyOnly: true
    },
]

export class SignalService {
    constructor(private supabase: SupabaseClient) { }

    async getProjectId(projectSlug: string): Promise<string | undefined> {
        const { data, error } = await this.supabase
            .from("projects")
            .select("id")
            .eq("slug", projectSlug)
            .maybeSingle()

        if (error) return undefined
        return data?.id
    }

    async getActiveSignals(projectId: string): Promise<Signal[]> {
        const { data, error } = await this.supabase
            .from("ai_signals")
            .select("*")
            .eq("project_id", projectId)
            .eq("is_resolved", false)
            .eq("is_agency_only", false)
            .order("created_at", { ascending: false })

        if (error) throw error

        const records = data as RawSignalRecord[]

        if (!records || records.length === 0) {
            return DEMO_MOCK_SIGNALS
        }

        return records.map(s => ({
            id: s.id,
            signalType: s.signal_type,
            title: s.title,
            body: s.body,
            actionLabel: s.action_label || "Resolve",
            severity: s.severity,
            color: TYPE_COLORS[s.signal_type] || "bg-muted",
            buttonColor: SEVERITY_BUTTONS[s.severity] || "bg-secondary",
        }))
    }

    async resolveSignal(params: ResolveSignalParams): Promise<void> {
        const { error } = await this.supabase.functions.invoke("resolve-signal", {
            body: {
                signal_id: params.signalId,
                project_id: params.projectId
            },
            headers: {
                Authorization: `Bearer ${params.accessToken}`,
                apikey: supabaseAnonKey
            }
        })

        if (error) throw error
    }
}
