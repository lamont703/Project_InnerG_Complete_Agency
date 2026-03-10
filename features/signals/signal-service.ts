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

export const KANES_MOCK_SIGNALS: Signal[] = [
    {
        id: "sig-inventory-001",
        signalType: "inventory",
        title: "High Demand Prediction",
        body: "Database analysis indicates 'The Midnight Library' is trending. Current stock will deplete in 48 hours based on current velocity.",
        actionLabel: "Automate Restock Order",
        severity: "warning",
        color: "bg-orange-500",
        buttonColor: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
    {
        id: "sig-conversion-001",
        signalType: "conversion",
        title: "342 Stalled Checkouts",
        body: "GHL Data identifies a high-intent segment stuck at Step 2 of the 'Komet Card' funnel. Potential revenue gap: $12,400.",
        actionLabel: "Trigger Retargeting Flow",
        severity: "critical",
        color: "bg-primary",
        buttonColor: "bg-primary text-primary-foreground hover:bg-primary/90",
    },
    {
        id: "sig-social-001",
        signalType: "social",
        title: "Engagement Spike (+48%)",
        body: "Your latest Reel on 'Special Edition Hardcovers' is viral. Instagram API reports over 500+ comments asking for purchase links.",
        actionLabel: "Deploy Bio-Link Update",
        severity: "info",
        color: "bg-pink-500",
        buttonColor: "bg-pink-600 hover:bg-pink-700 text-white",
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

        if (error) throw error
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
            return KANES_MOCK_SIGNALS
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
