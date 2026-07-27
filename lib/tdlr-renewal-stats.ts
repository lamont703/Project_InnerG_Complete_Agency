import { createClient } from "@supabase/supabase-js"

// Live renewal counts from the TDLR raw lake, via the aggregate-only RPC
// (tdlr_renewal_stats) — the lake table itself is RLS-locked. Server-only.

export interface RenewalStats {
  totalLicensed: number
  renewalsDue90d: number
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function getRenewalStats(licenseTypes: string[], fallback: RenewalStats): Promise<RenewalStats> {
  if (!url || !key) return fallback
  try {
    const supabase = createClient(url, key)
    const { data, error } = await supabase.rpc("tdlr_renewal_stats", { p_types: licenseTypes })
    if (error || !data) return fallback
    const row = Array.isArray(data) ? data[0] : data
    if (!row) return fallback
    return {
      totalLicensed: Number(row.total_licensed) || fallback.totalLicensed,
      renewalsDue90d: Number(row.renewals_due_90d) || fallback.renewalsDue90d,
    }
  } catch {
    return fallback
  }
}
