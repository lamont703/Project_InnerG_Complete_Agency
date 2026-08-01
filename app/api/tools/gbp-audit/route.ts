import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PUBLIC_ENTITY_TYPES,
  buildPublicAudit,
  computeBenchmark,
  type PublicEntityConfig,
  type PublicAuditResult,
} from "@/lib/gbp-audit-public";
import { buildPublicAuditEmail } from "@/lib/gbp-public-audit-email";
import { sendGhlEmail } from "@/lib/ghl-email";
import { addGhlTags, TAG_AUDIT_RUN } from "@/lib/ghl-contacts";

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
async function auditBusiness(
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

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();
  const type = String(body?.type || "");
  const slug = String(body?.slug || "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ success: false, error: "That doesn't look like an email address." }, { status: 400 });
  }
  const cfg = PUBLIC_ENTITY_TYPES[type];
  if (!cfg || !slug) {
    return NextResponse.json({ success: false, error: "Which business was that?" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Recomputed here rather than taken from the request. The client's copy could
  // be stale or edited, and this score is going into someone's inbox with our
  // name on it.
  const scored = await auditBusiness(admin, type, cfg, slug);
  if (!scored) {
    return NextResponse.json({ success: false, error: "That business is no longer in our directory." }, { status: 404 });
  }

  const { data: row } = await (admin.from("gbp_public_audit_runs") as any)
    .insert({
      entity_type: type,
      entity_slug: slug,
      business_name: scored.business.name,
      city: scored.business.city,
      score: scored.audit.score,
      email,
      referrer: req.headers.get("referer")?.slice(0, 500) ?? null,
    })
    .select("id")
    .single();

  const message = buildPublicAuditEmail({
    businessName: scored.business.name,
    city: scored.business.city,
    audit: scored.audit,
  });

  const sent = await sendGhlEmail({
    email,
    name: scored.business.name,
    subject: message.subject,
    html: message.html,
  });

  if (row?.id) {
    await (admin.from("gbp_public_audit_runs") as any)
      .update(sent.ok ? { emailed_at: new Date().toISOString() } : { email_error: sent.error })
      .eq("id", row.id);
  }

  // Tag the contact sendGhlEmail just resolved. These people aren't members —
  // this is the free tool, no account required — but the tag matches on the
  // same email address, so someone who runs the audit first and joins later
  // arrives already marked and skips the "run your audit" branch. Non-fatal.
  if (sent.contactId) {
    const tagged = await addGhlTags(sent.contactId, [TAG_AUDIT_RUN, "Free Audit Lead"]);
    if (!tagged.ok && !tagged.skipped) console.warn("[gbp-audit] tagging failed:", tagged.error);
  }

  if (!sent.ok) {
    // Said plainly rather than claiming success. The previous version told
    // people their report was on the way when nothing had been sent.
    console.warn("[gbp-audit] report email failed:", sent.error);
    return NextResponse.json(
      { success: false, error: "We saved your details but couldn't send the email just now. We'll follow it up." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}

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

    const scored = await auditBusiness(admin, type, cfg, slug);
    if (!scored) return NextResponse.json({ success: false, error: "Business not found." }, { status: 404 });

    // Recorded because the free tool otherwise forgets everyone who doesn't
    // connect. This half is just "someone looked up this shop" — no personal
    // data — and it fails quietly, because a logging problem must never take
    // down the one genuinely useful free thing on the site.
    void (admin.from("gbp_public_audit_runs") as any)
      .insert({
        entity_type: type,
        entity_slug: slug,
        business_name: scored.business.name,
        city: scored.business.city,
        score: scored.audit.score,
        referrer: req.headers.get("referer")?.slice(0, 500) ?? null,
      })
      .then(({ error }: any) => {
        if (error) console.warn("[gbp-audit] run not logged:", error.message);
      });

    return NextResponse.json({ success: true, ...scored });
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
