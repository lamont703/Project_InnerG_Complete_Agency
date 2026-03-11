import { SupabaseClient } from "@supabase/supabase-js"
import { AgencyProject, StrategicSignal, OperationalSignal, AgencyUserData } from "./types"
import { DEMO_MOCK_SIGNALS } from "@/features/signals/signal-service"

/**
 * AgencyService - Handles all database and API interactions for the Super Admin dashboard.
 */
export class AgencyService {
    constructor(private supabase: SupabaseClient) { }

    /**
     * Fetch user profile and verify super_admin status
     */
    async getAdminProfile(userId: string): Promise<AgencyUserData | null> {
        const { data: profile } = await this.supabase
            .from("users")
            .select("full_name, role")
            .eq("id", userId)
            .single()

        if (!profile || profile.role !== "super_admin") return null

        return {
            name: profile.full_name || "Admin",
            role: "SUPER ADMIN"
        }
    }

    /**
     * Fetch all active projects across the portfolio
     */
    async getActiveProjects(): Promise<AgencyProject[]> {
        const { data } = await this.supabase
            .from("projects")
            .select("id, name, slug, status, type, active_campaign_name, clients(name, industry)")
            .eq("status", "active")
            .order("name")

        return (data as any[]) || []
    }

    /**
     * Fetch recent signals, split into Strategic (Agency Only) and Operational
     */
    async getAllAgencySignals(): Promise<{ strategic: StrategicSignal[], operational: OperationalSignal[] }> {
        const { data } = await this.supabase
            .from("ai_signals")
            .select("id, project_id, signal_type, title, body, severity, is_resolved, is_agency_only, created_at, projects(name)")
            .order("created_at", { ascending: false })
            .limit(50)

        const signals = (data as any[]) || []

        if (signals.length === 0) {
            return {
                strategic: DEMO_MOCK_SIGNALS.filter(s => s.isAgencyOnly).map(s => ({
                    id: s.id,
                    project_id: '',
                    signal_type: s.signalType,
                    title: s.title,
                    body: s.body,
                    severity: s.severity as any,
                    is_resolved: false,
                    is_agency_only: true,
                    created_at: new Date().toISOString()
                })),
                operational: DEMO_MOCK_SIGNALS.filter(s => !s.isAgencyOnly).map(s => ({
                    id: s.id,
                    project_id: '',
                    signal_type: s.signalType,
                    title: s.title,
                    body: s.body,
                    severity: s.severity as any,
                    is_resolved: false,
                    is_agency_only: false,
                    created_at: new Date().toISOString()
                }))
            }
        }

        return {
            strategic: signals.filter(s => s.is_agency_only),
            operational: signals.filter(s => !s.is_agency_only)
        }
    }


    /**
     * Trigger the GHL Sync function via Supabase Edge Function
     */
    async syncGHL(accessToken: string, anonKey: string): Promise<void> {
        const { error } = await this.supabase.functions.invoke("sync-ghl-pipeline", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                apikey: anonKey
            }
        })

        if (error) {
            const responseBody = await error.context?.json()
            throw new Error(responseBody?.error?.message || error.message)
        }
    }
}
