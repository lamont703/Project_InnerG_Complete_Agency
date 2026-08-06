import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { upsertGhlContact, addGhlTags } from "@/lib/ghl-contacts";

/**
 * Contact form submissions.
 *
 * Replaces the submit-growth-audit-lead Edge Function, which required
 * budget_range / project_stage / project_type — agency qualification fields
 * the current form has no business asking a barber school about.
 *
 * The page this serves previously had no handler at all: it awaited a 1500ms
 * timer and rendered a success message. Every submission was discarded while
 * the visitor was told it had gone through. That is the failure this route
 * exists to end, so the ordering below matters — the row is written before
 * anything else can fail, and the caller is only told "sent" once it is.
 */

export const dynamic = "force-dynamic";

const MAX_FIELD = 5_000;
const MAX_BODY_BYTES = 32 * 1024;

/** Same reasoning as the MCP endpoint: an unauthenticated public writer needs a ceiling. */
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

const clean = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, MAX_FIELD) : null;
};

export async function POST(request: NextRequest) {
  if (rateLimited(request)) {
    return NextResponse.json(
      { ok: false, error: "Too many submissions. Please try again in a minute." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: any;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "Message too long." }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Honeypot. Bots fill every field they find; a real person never sees this
  // one. Answer 200 rather than an error so a bot cannot tell it was caught
  // and retry with the field left blank.
  if (clean(body.website)) {
    return NextResponse.json({ ok: true });
  }

  const name = clean(body.name);
  const email = clean(body.email);
  const business_name = clean(body.business_name);
  const phone = clean(body.phone);
  const message = clean(body.message);
  const source = clean(body.source) || "contact_page";

  if (!name || !email) {
    return NextResponse.json({ ok: false, error: "Name and email are required." }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "That email address looks wrong." }, { status: 400 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Store first, sync second. If GHL is down or unconfigured the enquiry is
  // still captured — losing a lead to a CRM outage would repeat the bug this
  // route was written to fix, in a subtler form.
  const { data: row, error } = await db
    .from("contact_form")
    .insert({ name, email, business_name, phone, message, source })
    .select("id")
    .single();

  if (error) {
    console.error("[contact] insert failed:", error.message);
    return NextResponse.json(
      { ok: false, error: "We couldn't save that. Please email us directly." },
      { status: 500 }
    );
  }

  // GHL is best-effort and never blocks the response.
  try {
    const res = await upsertGhlContact({
      name,
      email,
      phone,
      source: `website: ${source}`,
    });
    if (res.ok && res.contactId) {
      // Tags are added separately rather than passed to the upsert: a GHL
      // upsert REPLACES the tag array, so tagging an existing contact through
      // it would silently strip every other tag they carry.
      await addGhlTags(res.contactId, ["contact form", `source: ${source}`]);
      await db
        .from("contact_form")
        .update({ ghl_contact_id: res.contactId, ghl_synced: true })
        .eq("id", row.id);
    } else {
      // upsertGhlContact reports most failures by RETURNING {ok:false},
      // not by throwing — missing credentials, a non-2xx from GHL, a
      // timeout, a response with no contact id. The catch below never sees
      // those, so without this branch the row just lands with
      // ghl_synced=false and no trace of why.
      //
      // That is exactly how the first real submission failed: GHL_API_KEY and
      // GHL_LOCATION_ID are set in .env.local but were never added to Vercel,
      // so on staging and production this returns skipped=true immediately.
      console.warn(
        `[contact] GHL not synced (row ${row.id}): ${res.error || "unknown"}${res.skipped ? " [skipped]" : ""}`
      );
    }
  } catch (err) {
    console.error("[contact] GHL sync failed (non-fatal):", err);
  }

  return NextResponse.json({ ok: true });
}
