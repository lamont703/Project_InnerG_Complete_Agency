import { SupabaseClient } from "@supabase/supabase-js"
import { supabaseAnonKey } from "@/lib/supabase/browser"
import { Signal, RawSignalRecord, ResolveSignalParams } from "./types"

const TYPE_COLORS: Record<string, string> = {
    inventory: "bg-emerald-500",
    conversion: "bg-primary",
    social: "bg-pink-500",
    ai_insight: "bg-violet-500",
}

const SEVERITY_BUTTONS: Record<string, string> = {
    info: "bg-pink-600 hover:bg-pink-700 text-white",
    warning: "bg-emerald-600 hover:bg-emerald-700 text-white",
    critical: "bg-primary text-primary-foreground hover:bg-primary/90",
}

export const DEMO_MOCK_SIGNALS: Signal[] = []

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

    async getActiveSignals(projectId: string, includeAgencyOnly = false): Promise<Signal[]> {
        let query = this.supabase
            .from("ai_signals")
            .select("*")
            .eq("project_id", projectId)
            .eq("is_resolved", false)
            .order("created_at", { ascending: false })

        if (!includeAgencyOnly) {
            query = query.eq("is_agency_only", false)
        }

        const { data, error } = await query

        if (error) throw error

        const records = data as RawSignalRecord[]

        if (!records || records.length === 0) {
            return []
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
            actionUrl: s.action_url || undefined,
            metadata: s.metadata || {}
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
