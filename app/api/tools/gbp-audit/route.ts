import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PUBLIC_ENTITY_TYPES,
  buildPublicAudit,
  computeBenchmark,
  type PublicEntityConfig,
} from "@/lib/gbp-audit-public";

/**
 * Public, unauthenticated endpoint behind the free audit tool.
 *
 * Deliberately under /api/tools/, which middleware.ts skips the session check
 * for — this is the first thing a cold visitor from search touches and it must
 * not require a login. Everything it returns is already published on the
 * public directory pages, so there's nothing here a visitor couldn't read by
 * browsing the site.
 *
 *   GET ?q=name[&city=]   → matching businesses
 *   GET ?type=&slug=      → the public audit for one business
 */

export const dynamic = "force-dynamic";

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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const city = (url.searchParams.get("city") || "").trim();
  const type = (url.searchParams.get("type") || "").trim();
  const slug = (url.searchParams.get("slug") || "").trim();
  const admin = createAdminClient();

  // ── audit one business ──
  if (type && slug) {
    const cfg = PUBLIC_ENTITY_TYPES[type];
    if (!cfg) return NextResponse.json({ success: false, error: "Unknown business type." }, { status: 400 });

    const cols = [
      cfg.nameField, "slug", "city", "website", "phone", "rating", "formatted_address",
      cfg.reviewField, ...(cfg.imagesField ? [cfg.imagesField] : []), "google_hours", "google_category",
    ];
    const { data: row, error } = await (admin.from(cfg.table) as any)
      .select(cols.join(", ")).eq("slug", slug).maybeSingle();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    if (!row) return NextResponse.json({ success: false, error: "Business not found." }, { status: 404 });

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

    return NextResponse.json({
      success: true,
      business: {
        type,
        typeLabel: cfg.label,
        name: row[cfg.nameField],
        slug: row.slug,
        city: row.city,
        address: row.formatted_address,
        category: row.google_category,
        href: `${cfg.route}/${row.slug}`,
      },
      audit,
    });
  }

  // ── search ──
  if (q.length < 2) {
    return NextResponse.json({ success: false, error: "Type at least two characters." }, { status: 400 });
  }

  // Searched across every business type at once: an owner knows their name, not
  // which of our tables they're in.
  const results = await Promise.all(
    Object.entries(PUBLIC_ENTITY_TYPES).map(async ([key, cfg]) => {
      let query = (admin.from(cfg.table) as any)
        .select(`${cfg.nameField}, slug, city, formatted_address`)
        .ilike(cfg.nameField, `%${q}%`)
        .limit(8);
      if (city) query = query.ilike("city", `%${city}%`);
      const { data } = await query;
      return (data || [])
        .filter((r: any) => r.slug)
        .map((r: any) => ({
          type: key,
          typeLabel: cfg.label,
          name: r[cfg.nameField],
          slug: r.slug,
          city: r.city,
          address: r.formatted_address,
        }));
    })
  );

  const flat = results.flat();
  // Exact-ish matches first, then alphabetical — an owner searching their own
  // name should see it at the top, not buried behind partial matches.
  const needle = q.toLowerCase();
  flat.sort((a, b) => {
    const aStarts = String(a.name || "").toLowerCase().startsWith(needle) ? 0 : 1;
    const bStarts = String(b.name || "").toLowerCase().startsWith(needle) ? 0 : 1;
    return aStarts - bStarts || String(a.name).localeCompare(String(b.name));
  });

  return NextResponse.json({ success: true, results: flat.slice(0, 20) });
}
