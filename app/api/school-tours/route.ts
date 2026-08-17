import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendGhlEmail } from "@/lib/ghl-email";
import { SITE_URL } from "@/lib/site";
import {
  isTourTooSoonAnywhere,
  isValidTourSlot,
  TOUR_TOO_SOON_MESSAGE,
  TOUR_WINDOW_DAYS,
} from "@/lib/school-tour-slots";

/**
 * Campus tour requests from the Request A School Tour CTA on /schools/[slug].
 *
 * SAME ORDERING DISCIPLINE AS app/api/bookings/route.ts: the row is written
 * before anything else can fail, and the visitor is only told "sent" once it
 * exists. A tour request lost to an email outage is a student who thinks a
 * school is expecting them.
 *
 * IT DOES NOT BOOK A TOUR. Nothing here reserves anything. Schools do not
 * maintain availability with us, so a confirmed time is not ours to promise —
 * the copy says "request sent" and the row starts at status 'new'.
 *
 * ============================================================================
 * WHY THE SCHOOL IS NOT NOTIFIED AUTOMATICALLY
 * ============================================================================
 * It cannot be. Across 1,185 schools we hold FOUR email addresses — 4 of 244
 * barber schools, and the cosmetology table has no email column at all. Phone
 * is on 98.1%. So there is no automated channel that reaches a school, and SMS
 * to a campus main line is the wrong instrument for a tour request anyway.
 *
 * The row is therefore queued for A HUMAN PHONE CALL (`notify_channel =
 * 'phone_call'`), and `notified_business_at` stays NULL until a person makes
 * it. That is deliberate: the call is also the only conversation we get with a
 * school that has not claimed its listing.
 *
 * THE CUSTOMER EMAIL IS STILL SENT IMMEDIATELY, because we have that address —
 * the visitor just typed it. They must never be left wondering whether the
 * form worked while a call is queued.
 *
 * NO SMS IS SENT ANYWHERE FROM THIS ROUTE. That is a product decision, not an
 * oversight: sendGhlSms is deliberately not imported so it cannot be added by
 * reflex when someone copies this file.
 */

export const dynamic = "force-dynamic";

const MAX_FIELD = 2_000;
const MAX_BODY_BYTES = 16 * 1024;

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
  return recent.length > RATE_LIMIT_MAX;
}

const clean = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, MAX_FIELD) : null;
};

/**
 * Schools live in two tables, split by trade, and the /schools/[slug] page
 * already reads both. Neither carries a usable email column — see the header.
 */
const SCHOOL_TABLES = [
  "agent_barber_school_leads",
  "agent_cosmetology_school_leads",
] as const;

function todayInCentral(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  if (rateLimited(request)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again in a minute." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: any;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "Request too long." }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Honeypot — 200 so a bot cannot tell it was caught. Same contract as the
  // bookings and contact routes.
  if (clean(body.company_website)) {
    return NextResponse.json({ ok: true, tour_id: null });
  }

  const entityId = clean(body.entity_id);
  const requestedDate = clean(body.requested_date);
  const requestedTime = clean(body.requested_time);
  const customerPhone = clean(body.customer_phone);
  const customerEmail = clean(body.customer_email);
  const customerName = clean(body.customer_name);
  const customerNotes = clean(body.customer_notes);

  if (!entityId || !requestedDate || !requestedTime) {
    return NextResponse.json({ ok: false, error: "Please choose a date and time." }, { status: 400 });
  }
  if (!customerName) {
    return NextResponse.json({ ok: false, error: "Please tell us your name." }, { status: 400 });
  }
  if (!customerPhone || !customerEmail) {
    return NextResponse.json({ ok: false, error: "Phone number and email are both required." }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customerEmail)) {
    return NextResponse.json({ ok: false, error: "That email address looks wrong." }, { status: 400 });
  }
  if ((customerPhone.match(/\d/g) || []).length < 10) {
    return NextResponse.json({ ok: false, error: "That phone number looks too short." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
    return NextResponse.json({ ok: false, error: "Invalid date." }, { status: 400 });
  }

  const today = todayInCentral();
  if (requestedDate < today || requestedDate > addDays(today, TOUR_WINDOW_DAYS + 1)) {
    return NextResponse.json(
      { ok: false, error: `Please pick a date within the next ${TOUR_WINDOW_DAYS} days.` },
      { status: 400 }
    );
  }

  /**
   * Weekday + on-the-hour + inside 10:00–16:00. Unlike the lead-time floor
   * below, this one is STRICT: a Saturday is a Saturday in every timezone this
   * directory serves, so there is no permissive reading to preserve.
   */
  if (!isValidTourSlot(requestedDate, requestedTime)) {
    return NextResponse.json(
      { ok: false, error: "Tours run Monday to Friday, on the hour between 10:00 AM and 4:00 PM." },
      { status: 400 }
    );
  }

  // The permissive 48-hour guard. The picker is the real gate; this refuses
  // only what no timezone we serve could make reasonable.
  if (isTourTooSoonAnywhere(requestedDate, requestedTime, new Date())) {
    return NextResponse.json({ ok: false, error: TOUR_TOO_SOON_MESSAGE }, { status: 400 });
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // The page resolves a school from either table, so this must too.
  let school: any = null;
  let sourceTable: string | null = null;
  for (const table of SCHOOL_TABLES) {
    const { data } = await db
      .from(table)
      .select("id, slug, school_name, phone, city, website")
      .eq("id", entityId)
      .maybeSingle();
    if (data) {
      school = data;
      sourceTable = table;
      break;
    }
  }

  if (!school) {
    return NextResponse.json({ ok: false, error: "We couldn't find that school." }, { status: 404 });
  }

  /**
   * Written before any send. If the email below fails, we still hold the
   * request and the call queue still surfaces it.
   */
  const { data: inserted, error: insertError } = await db
    .from("booking_requests")
    .insert({
      entity_type: "school",
      entity_id: String(school.id),
      entity_slug: school.slug ?? null,
      entity_name: school.school_name ?? null,
      entity_phone: school.phone ?? null,
      request_type: "tour",
      notify_channel: "phone_call",
      service_name: "Campus Tour",
      requested_date: requestedDate,
      requested_time: requestedTime,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      customer_notes: customerNotes,
      status: "new",
      source: sourceTable,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { ok: false, error: "We couldn't save your request. Please try again." },
      { status: 500 }
    );
  }

  /**
   * The visitor's confirmation. Sent after the row exists, and a failure here
   * is recorded rather than surfaced — the request is safe either way, and
   * telling someone their request failed when it did not is the worse error.
   *
   * The copy must not imply the school has been told. It has not been; a human
   * still has to call.
   */
  try {
    await sendGhlEmail({
      email: customerEmail,
      name: customerName,
      subject: `Tour request sent — ${school.school_name ?? "your school"}`,
      html: `
        <p>Hi ${customerName},</p>
        <p>We've received your request to tour <strong>${school.school_name ?? "this school"}</strong>${
          school.city ? ` in ${school.city}` : ""
        }.</p>
        <p><strong>Requested:</strong> ${requestedDate} at ${requestedTime}</p>
        <p>This is a request, not a confirmed booking. Someone from our team will
        contact the school and follow up with you to confirm a time.</p>
        ${
          /*
           * THE SCHOOL'S OWN CONTACT DETAILS, and this block is now load-bearing
           * rather than a courtesy. The Call and Website buttons were removed
           * from /schools/[slug] when this CTA replaced them, so this email and
           * the modal's confirmation step are the ONLY places a visitor gets the
           * direct route. If this ever stops sending, the page becomes a dead
           * end for anyone whose request goes unanswered.
           */
          school.phone || school.website
            ? `<p><strong>Reach the school directly:</strong><br/>
                ${school.phone ? `Phone: <a href="tel:${school.phone}">${school.phone}</a><br/>` : ""}
                ${
                  school.website
                    ? `Website: <a href="${
                        school.website.startsWith("http") ? school.website : `https://${school.website}`
                      }">${school.website}</a>`
                    : ""
                }
               </p>`
            : ""
        }
        <p><a href="${SITE_URL}/schools/${school.slug ?? ""}">View the school listing</a></p>
      `,
    });
    await db
      .from("booking_requests")
      .update({ notified_customer_at: new Date().toISOString() })
      .eq("id", inserted.id);
  } catch (err) {
    await db
      .from("booking_requests")
      .update({ notify_error: String((err as Error)?.message ?? err).slice(0, 500) })
      .eq("id", inserted.id);
  }

  return NextResponse.json({
    ok: true,
    tour_id: inserted.id,
    school_phone: school.phone ?? null,
    school_website: school.website ?? null,
  });
}
