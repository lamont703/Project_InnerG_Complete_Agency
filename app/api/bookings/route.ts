import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendGhlSms } from "@/lib/ghl-sms";
import { sendGhlEmail } from "@/lib/ghl-email";
import { servicesForEntity, type BookingEntityType } from "@/lib/booking-services";
import { SITE_URL } from "@/lib/site";

/**
 * Appointment requests from the Book Appointment modal on the four entity
 * page types.
 *
 * ORDERING IS THE POINT, and it is lifted from app/api/contact/route.ts: the
 * row is written before anything else can fail, and the visitor is only told
 * "sent" once it exists. A booking request lost to a GHL outage is a customer
 * who thinks a barber is expecting them.
 *
 * WHAT THIS IS NOT. It does not book anything. It records a request and texts
 * the business. Nothing in the response may claim a confirmed appointment —
 * see the migration for why that would be a promise we are not in a position
 * to make.
 *
 * THE SERVICE IS RE-VALIDATED HERE. The modal only offers services that match
 * the business, but a POST can carry anything, and "Beard Trim" landing on a
 * nail salon's SMS would be the exact misalignment lib/booking-services.ts
 * exists to prevent. The client's list is never trusted.
 */

export const dynamic = "force-dynamic";

const MAX_FIELD = 2_000;
const MAX_BODY_BYTES = 16 * 1024;
const BOOKING_WINDOW_DAYS = 30;

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

/**
 * The four entity page types and where each reads from. Kept in one place
 * because the column names genuinely differ — businesses carry shop_name and
 * website, people carry name and website_url — and guessing wrong yields a
 * silent null rather than an error.
 */
const SOURCES: Record<
  BookingEntityType,
  { table: string; nameCol: string; websiteCol: string; extraCols: string }
> = {
  shop: { table: "agent_barbershop_leads", nameCol: "shop_name", websiteCol: "website", extraCols: "google_category" },
  salon: { table: "agent_salon_leads", nameCol: "shop_name", websiteCol: "website", extraCols: "google_category" },
  barber: { table: "agent_barber_leads", nameCol: "name", websiteCol: "website_url", extraCols: "booksy_services" },
  cosmetologist: { table: "agent_cosmetologist_leads", nameCol: "name", websiteCol: "website_url", extraCols: "booksy_services" },
};

/** Local calendar day in Central time, where every business on this site sits. */
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

  // Honeypot, same contract as the contact route: answer 200 so a bot cannot
  // tell it was caught and retry with the field blank.
  if (clean(body.company_website)) {
    return NextResponse.json({ ok: true, booking_id: null });
  }

  const entityType = clean(body.entity_type) as BookingEntityType | null;
  if (!entityType || !(entityType in SOURCES)) {
    return NextResponse.json({ ok: false, error: "Unknown listing type." }, { status: 400 });
  }

  const entityId = clean(body.entity_id);
  const serviceName = clean(body.service_name);
  const requestedDate = clean(body.requested_date);
  const requestedTime = clean(body.requested_time);
  const customerPhone = clean(body.customer_phone);
  const customerEmail = clean(body.customer_email);
  const customerName = clean(body.customer_name);
  const customerNotes = clean(body.customer_notes);

  if (!entityId || !serviceName || !requestedDate || !requestedTime) {
    return NextResponse.json({ ok: false, error: "Please choose a service, date and time." }, { status: 400 });
  }

  // Both required, per the form's contract.
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
  // The calendar shows 30 days. One day of slack on each end absorbs the
  // window rolling over between render and submit, which is otherwise a
  // confusing rejection for someone who left the modal open overnight.
  if (requestedDate < addDays(today, -1) || requestedDate > addDays(today, BOOKING_WINDOW_DAYS + 1)) {
    return NextResponse.json(
      { ok: false, error: `Please pick a date within the next ${BOOKING_WINDOW_DAYS} days.` },
      { status: 400 }
    );
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const src = SOURCES[entityType];

  const { data: entity, error: entityError } = await db
    .from(src.table)
    .select(`id, slug, phone, contact_id, ${src.nameCol}, ${src.websiteCol}, ${src.extraCols}`)
    .eq("id", entityId)
    .maybeSingle();

  if (entityError || !entity) {
    return NextResponse.json({ ok: false, error: "We couldn't find that listing." }, { status: 404 });
  }

  const e = entity as any;
  const entityName = e[src.nameCol] || null;

  // Re-derive the offer server-side and check the submitted service against
  // it. A business that is not bookable at all (a supply store) returns null
  // and is refused here even if a CTA somehow rendered.
  const offered = servicesForEntity({
    entityType,
    googleCategory: e.google_category ?? null,
    booksyServices: e.booksy_services ?? null,
  });
  if (!offered) {
    return NextResponse.json({ ok: false, error: "This listing doesn't take appointments." }, { status: 400 });
  }
  const match = offered.find((s) => s.name.toLowerCase() === serviceName.toLowerCase());
  if (!match) {
    return NextResponse.json({ ok: false, error: "That service isn't offered here." }, { status: 400 });
  }

  // Store first, notify second.
  const { data: row, error: insertError } = await db
    .from("booking_requests")
    .insert({
      entity_type: entityType,
      entity_id: String(e.id),
      entity_slug: e.slug || null,
      entity_name: entityName,
      entity_phone: e.phone || null,
      service_name: match.name,
      service_price: match.price ?? null,
      service_duration: match.duration ?? null,
      requested_date: requestedDate,
      requested_time: requestedTime,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      customer_notes: customerNotes,
      source: clean(body.source) || `${entityType}_page`,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[bookings] insert failed:", insertError.message);
    return NextResponse.json(
      { ok: false, error: "We couldn't save that request. Please call the business directly." },
      { status: 500 }
    );
  }

  const prettyDate = new Date(`${requestedDate}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  // Notifications are best-effort and never block the response. Each is
  // stamped separately because they fail independently — and because a
  // business SMS that GHL accepted may still have gone to a landline.
  const notifyErrors: string[] = [];

  // Both contact channels go in the text. The business closes this deal off
  // our platform, so the message has to be self-sufficient — a barber reading
  // it between clients should not have to open anything to call the customer
  // back. Roughly 180 chars, so two SMS segments at worst.
  const smsBody =
    `New appointment request via ShearQuery\n` +
    `${match.name} — ${prettyDate} at ${requestedTime}\n` +
    `${customerName || "A customer"}\n` +
    `Phone: ${customerPhone}\n` +
    `Email: ${customerEmail}\n` +
    (customerNotes ? `Note: ${customerNotes}\n` : "") +
    `Contact them to confirm — this is a request, not a booking.`;

  let smsOk = false;
  try {
    const res = await sendGhlSms({
      message: smsBody,
      contactId: e.contact_id || null,
      phone: e.phone || null,
      name: entityName,
    });
    smsOk = res.ok;
    if (!res.ok) notifyErrors.push(`sms: ${res.error || "unknown"}${res.skipped ? " [skipped]" : ""}`);
  } catch (err: any) {
    notifyErrors.push(`sms threw: ${err?.message}`);
  }

  const listingUrl = e.slug
    ? `${SITE_URL}/${entityType === "shop" ? "shop" : entityType === "salon" ? "salons" : entityType === "barber" ? "barbers" : "cosmetologists"}/${e.slug}`
    : SITE_URL;

  let emailOk = false;
  try {
    const res = await sendGhlEmail({
      email: customerEmail,
      name: customerName || undefined,
      subject: `Your appointment request${entityName ? ` — ${entityName}` : ""}`,
      html:
        `<p>Thanks${customerName ? `, ${customerName}` : ""} — we've passed your request to ` +
        `<strong>${entityName || "the business"}</strong>.</p>` +
        `<p><strong>${match.name}</strong><br>${prettyDate} at ${requestedTime}</p>` +
        `<p>They'll contact you on ${customerPhone} to confirm. This is a request, not a ` +
        `confirmed appointment — the time is yours only once they say so.</p>` +
        (e.phone ? `<p>Want to reach them now? <a href="tel:${e.phone}">${e.phone}</a></p>` : "") +
        `<p><a href="${listingUrl}">View the listing</a></p>`,
    });
    emailOk = res.ok;
    if (!res.ok) notifyErrors.push(`email: ${res.error || "unknown"}`);
  } catch (err: any) {
    notifyErrors.push(`email threw: ${err?.message}`);
  }

  if (notifyErrors.length) console.warn(`[bookings] row ${row.id}: ${notifyErrors.join("; ")}`);

  await db
    .from("booking_requests")
    .update({
      status: smsOk ? "notified" : "new",
      notified_business_at: smsOk ? new Date().toISOString() : null,
      notified_customer_at: emailOk ? new Date().toISOString() : null,
      notify_error: notifyErrors.length ? notifyErrors.join("; ").slice(0, 2000) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  // The reveal. The customer has converted, so withholding the business's own
  // contact details now serves nobody — and it is what stops an unanswered
  // request becoming a dead end. See the modal's confirmation step.
  //
  // PHONE IS REVEALED FOR BUSINESSES ONLY, NEVER FOR PEOPLE. lib/public-columns.ts
  // omits `phone` from BARBER_PUBLIC_COLUMNS and COSMETOLOGIST_PUBLIC_COLUMNS on
  // purpose: a shop's number is its published contact info, an individual
  // barber's is private lead data in a CRM table. This route reads phone
  // directly (it has to — that is where the SMS goes), so without this gate it
  // would hand back a number the entity pages deliberately never publish.
  const phoneIsPublic = entityType === "shop" || entityType === "salon";

  return NextResponse.json({
    ok: true,
    booking_id: row.id,
    business: {
      name: entityName,
      phone: phoneIsPublic ? e.phone || null : null,
      website: e[src.websiteCol] || null,
    },
  });
}
