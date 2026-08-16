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
import { auditPublicEntity, type ScoredBusiness } from "@/lib/gbp-audit-public-fetch";

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
  const scored = await auditPublicEntity(admin, type, cfg, slug);
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

  return NextResponse.json({ success: true, audit_id: row?.id ?? null });
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

    const scored = await auditPublicEntity(admin, type, cfg, slug);
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
