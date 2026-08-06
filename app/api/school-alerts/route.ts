import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { upsertGhlContact, addGhlTags } from "@/lib/ghl-contacts";

/**
 * "Tell me when this school's next pass rates publish."
 *
 * Fired from the panel that appears after someone clicks through to a
 * school's own site or phone number — the moment the directory has already
 * done its job. See the migration for why the capture sits there rather than
 * in front of the outbound link.
 */

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const hits = new Map<string, number[]>();

function rateLimited(request: NextRequest): boolean {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < RATE_LIMIT_WINDOW_MS)) hits.delete(k);
  }
  return recent.length > RATE_LIMIT_MAX;
}

const clean = (v: unknown, max = 300): string | null => {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  if (rateLimited(request)) {
    return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });
  }

  let body: any;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "Request too large." }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Honeypot — 200 so a bot cannot tell it was caught.
  if (clean(body.website)) return NextResponse.json({ ok: true });

  const email = clean(body.email, 320);
  const school_id = clean(body.school_id, 64);
  const school_name = clean(body.school_name);
  const school_slug = clean(body.school_slug);
  const exam_state = clean(body.exam_state, 2);

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "That email looks wrong." }, { status: 400 });
  }
  if (!school_id || !UUID.test(school_id)) {
    return NextResponse.json({ ok: false, error: "Missing school." }, { status: 400 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Store first, sync second — a CRM outage must not lose the signup.
  // onConflict matches the unique (lower(email), school_id) index, so asking
  // twice is a no-op rather than a duplicate send next spring.
  const { error } = await db
    .from("school_pass_rate_alerts")
    .upsert(
      { email, school_id, school_name, school_slug, exam_state, source: "school_outbound" },
      { onConflict: "email,school_id", ignoreDuplicates: true }
    );

  if (error) {
    console.error("[school-alerts] insert failed:", error.message);
    return NextResponse.json({ ok: false, error: "Couldn't save that." }, { status: 500 });
  }

  // Best-effort. Tags go on separately because a GHL upsert REPLACES the tag
  // array — passing them to the upsert would strip every other tag an
  // existing contact carries.
  try {
    const res = await upsertGhlContact({ email, source: "website: school pass-rate alert" });
    if (res.ok && res.contactId) {
      const tags = ["school pass-rate alert", "student"];
      if (school_name) tags.push(`school: ${school_name.slice(0, 60)}`);
      await addGhlTags(res.contactId, tags);
      await db
        .from("school_pass_rate_alerts")
        .update({ ghl_contact_id: res.contactId, ghl_synced: true })
        .eq("email", email)
        .eq("school_id", school_id);
    }
  } catch (err) {
    console.error("[school-alerts] GHL sync failed (non-fatal):", err);
  }

  return NextResponse.json({ ok: true });
}
