import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PUBLIC_ENTITY_TYPES,
  buildPublicAudit,
  computeBenchmark,
  type PublicEntityConfig,
  type PublicAuditResult,
} from "@/lib/gbp-audit-public";

/**
 * Scoring a listing from public data alone.
 *
 * Lifted out of app/api/tools/gbp-audit/route.ts so the free-audit endpoint and
 * the member lifecycle job compute the same number. The score goes in an email
 * with our name on it and on a page the same person may read an hour later —
 * two implementations would drift, and the first anyone would notice is a
 * customer being told two different things about their own listing.
 *
 * Needs no Google connection, which is what makes it usable for a member who
 * has claimed a listing but never connected: we can tell them something true
 * about their profile before they have given us anything.
 */

const photoCount = (row: any, cfg: PublicEntityConfig): number | null => {
  if (!cfg.imagesField) return null;
  const v = row[cfg.imagesField];
  if (Array.isArray(v)) return v.length;
  if (typeof v === "string" && v.trim()) {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p.length : 0; } catch { return 0; }
  }
  return 0;
};


/**
 * City values in these tables are inconsistent — a ZIP is appended on many rows,
 * so "Houston" and "Houston 77062" are stored as different cities. Matching
 * exactly found 36 Houston barbershops when there are 591, and produced a median
 * review count of 428 against a true median of 98. That would have told almost
 * every shop in the city it was far below par, from a sample of 6% of its peers.
 *
 * Stripping the trailing ZIP and prefix-matching pulls the real peer set. It
 * also sweeps in neighbouring names like "Houston Heights", which is acceptable
 * — same metro, fair comparison — and far better than the fragmentation.
 */
function normalizeCity(city: string | null | undefined): string | null {
  if (!city) return null;
  const base = String(city).replace(/[\s,]+\d{5}(?:-\d{4})?\s*$/, "").trim();
  return base || null;
}

const hasHours = (row: any) => {
  const h = row.google_hours;
  if (!h) return false;
  if (Array.isArray(h)) return h.length > 0;
  if (typeof h === "object") return Object.keys(h).length > 0;
  if (typeof h === "string") return h.trim().length > 2;
  return false;
};

/**
 * Send-me-my-report. Deliberately a separate call from the audit itself: the
 * score renders whether or not this is ever used, so an address is volunteered
 * by someone who has already seen the value rather than exchanged for it.
 */

export interface ScoredBusiness {
  business: {
    type: string; typeLabel: string; name: string; slug: string;
    city: string | null; address: string | null; category: string | null; href: string;
  };
  audit: PublicAuditResult;
}

/**
 * Score one business.
 *
 * Shared by the page request and the email request so the number in someone's
 * inbox is the number they saw. Computing it twice from different code was how
 * they would drift.
 */
export async function auditPublicEntity(
  admin: ReturnType<typeof createAdminClient>,
  type: string,
  cfg: PublicEntityConfig,
  slug: string
): Promise<ScoredBusiness | null> {
  const cols = [
    cfg.nameField, "slug", "city", "website", "phone", "rating", "formatted_address",
    cfg.reviewField, ...(cfg.imagesField ? [cfg.imagesField] : []), "google_hours", "google_category",
  ];
  const { data: row } = await (admin.from(cfg.table) as any)
    .select(cols.join(", ")).eq("slug", slug).maybeSingle();
  if (!row) return null;

  // Local peers, for the benchmark. Same trade, same city — the comparison a
  // shop owner actually cares about, and the one a single-profile tool can't make.
  let benchmarkPeers: { photos: number; reviews: number }[] = [];
  const cityBase = normalizeCity(row.city);
  if (cityBase) {
    const peerCols = [cfg.reviewField, ...(cfg.imagesField ? [cfg.imagesField] : [])];
    const { data: peers } = await (admin.from(cfg.table) as any)
      .select(peerCols.join(", ")).ilike("city", `${cityBase}%`).limit(800);
    benchmarkPeers = (peers || []).map((p: any) => ({
      photos: photoCount(p, cfg) ?? 0,
      reviews: Number(p[cfg.reviewField] || 0),
    }));
  }

  const audit = buildPublicAudit(
    {
      photos: photoCount(row, cfg),
      reviews: Number(row[cfg.reviewField] || 0),
      rating: row.rating != null ? Number(row.rating) : null,
      hasHours: hasHours(row),
      website: row.website || null,
      phone: row.phone || null,
    },
    computeBenchmark(benchmarkPeers, cityBase)
  );

  return {
    business: {
      type,
      typeLabel: cfg.label,
      name: row[cfg.nameField],
      slug: row.slug,
      city: row.city ?? null,
      address: row.formatted_address ?? null,
      category: row.google_category ?? null,
      href: `${cfg.route}/${row.slug}`,
    },
    audit,
  };
}
