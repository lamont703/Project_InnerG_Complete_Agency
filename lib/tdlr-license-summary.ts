import { createClient } from "@supabase/supabase-js";

/**
 * Statewide TDLR licence counts, for the citable statistics block on /texas.
 *
 * Reads the materialised aggregate (tdlr_license_type_summary), never the raw
 * lake — the lake holds owner names and phone numbers and stays RLS-locked. The
 * view carries counts and a snapshot date and nothing else.
 *
 * These figures are the reason the page is worth citing. TDLR publishes the
 * rules and the raw licensee extract; nobody publishes "how many licensed
 * cosmetology operators are there in Texas, and how many renew this quarter" in
 * a form a journalist or a school can quote. That's the gap this fills, and why
 * every number here carries the date it was true.
 */

export interface LicenseTypeCount {
  licenseType: string;
  total: number;
  expiring90d: number;
}

export interface TdlrLicenseSummary {
  /** Every licence type, largest first. */
  types: LicenseTypeCount[];
  totalLicenses: number;
  /** Licences held by people who practise. */
  practitioners: number;
  /** Shop, salon and suite licences. */
  establishments: number;
  /** Schools and CE providers. */
  schools: number;
  /** Renewal pressure over the next quarter. */
  expiring90d: number;
  /** The date TDLR's extract was pulled. Every figure is "as of" this. */
  snapshotDate: string | null;
}

/**
 * Classification is by licence-type name, which is TDLR's own vocabulary rather
 * than ours. Kept explicit and inspectable because these roll-ups are the
 * numbers most likely to be quoted, and a silent miscategorisation would be a
 * wrong fact with our name on it.
 */
const ESTABLISHMENT = /establishment/i;
const SCHOOL = /school|junior college|ce provider/i;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function getTdlrLicenseSummary(): Promise<TdlrLicenseSummary | null> {
  if (!url || !key) return null;
  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("tdlr_license_type_summary")
      .select("license_type, total, expiring_90d, snapshot_date")
      .order("total", { ascending: false });

    if (error || !data?.length) {
      if (error) console.warn("[tdlr-summary]", error.message);
      return null;
    }

    const types: LicenseTypeCount[] = data.map((r: any) => ({
      licenseType: r.license_type,
      total: Number(r.total) || 0,
      expiring90d: Number(r.expiring_90d) || 0,
    }));

    let practitioners = 0, establishments = 0, schools = 0;
    for (const t of types) {
      if (SCHOOL.test(t.licenseType)) schools += t.total;
      else if (ESTABLISHMENT.test(t.licenseType)) establishments += t.total;
      else practitioners += t.total;
    }

    return {
      types,
      totalLicenses: types.reduce((s, t) => s + t.total, 0),
      practitioners,
      establishments,
      schools,
      expiring90d: types.reduce((s, t) => s + t.expiring90d, 0),
      snapshotDate: (data[0] as any).snapshot_date ?? null,
    };
  } catch (e: any) {
    console.warn("[tdlr-summary] failed:", e?.message);
    return null;
  }
}
