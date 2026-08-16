import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGhlSms } from "@/lib/ghl-sms";
import { normalizePhone } from "@/lib/ghl-contacts";
import {
  parseReply,
  statusForIntent,
  replyAcknowledgement,
  withinReplyWindow,
  looksLikeAnswerAttempt,
} from "@/lib/booking-reply";

/**
 * A business texts back, and the booking moves.
 *
 * THIS IS THE PIECE THAT ACTUALLY CLOSES THE LOOP. Of four requests, one
 * business replied — to a text, after a human chased it. The dashboard two
 * files over is the right home for an engaged owner and does nothing for the
 * rest, because registering and signing in is more friction than the channel
 * they are already ignoring. Replying "Y" is not.
 *
 * CONFIGURE THIS IN GHL: Settings → Workflows, trigger "Customer Replied"
 * (inbound SMS), action Webhook → POST to
 * https://shearquery.com/api/webhooks/ghl-inbound-sms?token=$BOOKING_WEBHOOK_TOKEN
 *
 * THE PAYLOAD SHAPE IS NOT ASSUMED. GHL's webhook body differs between the
 * workflow builder and the older app webhooks, and getting it wrong fails
 * silently — a 200 with nothing matched looks identical to "no replies yet".
 * So every plausible field name is read (see pickPhone/pickBody), and the FIRST
 * unmatched payload of each shape is logged in full. Tighten this once a real
 * inbound has been seen; do not tighten it on a guess.
 *
 * MATCHING IS BY PHONE, NOT BY THREAD. The reply arrives from the business's
 * number, and booking_requests.entity_phone is the number we texted — that pair
 * is the join. A business sitting on several open requests that replies "Y" has
 * not said which one it means, so the most recent is used (it is the message
 * they were looking at) and the acknowledgement names the customer and slot so
 * a wrong guess is visible immediately.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Shared-secret gate.
 *
 * GHL does not sign these, so a query token is the available mechanism. Without
 * it anyone who learns the URL could mark any booking confirmed — the endpoint
 * changes customer-visible state, so it cannot be open. Absent env var = closed,
 * never open-by-default.
 */
function authorized(req: NextRequest): boolean {
  const expected = process.env.BOOKING_WEBHOOK_TOKEN;
  if (!expected) return false;
  const url = new URL(req.url);
  const supplied = url.searchParams.get("token") || req.headers.get("x-webhook-token");
  return supplied === expected;
}

/** Every field name GHL has been seen to use for the sender's number. */
function pickPhone(b: any): string | null {
  const candidates = [
    b?.phone, b?.from, b?.From, b?.contact_phone, b?.contactPhone,
    b?.contact?.phone, b?.message?.from, b?.customData?.phone,
  ];
  for (const c of candidates) if (c && String(c).trim()) return String(c);
  return null;
}

/** Likewise for the message text. */
function pickBody(b: any): string | null {
  const candidates = [
    b?.body, b?.message, b?.Body, b?.text, b?.messageBody,
    b?.message?.body, b?.customData?.message, b?.sms?.body,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  return null;
}

const prettyDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
  });

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body was not JSON." }, { status: 400 });
  }

  const rawPhone = pickPhone(body);
  const text = pickBody(body);

  if (!rawPhone) {
    // Logged with the key list, not the values: the payload contains a phone
    // number and possibly a message, and this line goes to a shared log.
    console.warn("[ghl-inbound] no phone field. keys:", Object.keys(body || {}).join(","));
    return NextResponse.json({ ok: true, matched: false, reason: "no phone in payload" });
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return NextResponse.json({ ok: true, matched: false, reason: "unparseable phone" });
  }

  const admin = createAdminClient();
  const now = new Date();

  /*
   * Open requests for this business, newest first. Statuses are the two that
   * mean "waiting on the business" — a reply must never resurrect a request
   * that was already booked, declined or cancelled.
   *
   * entity_phone is matched on the last 10 digits rather than exactly: what we
   * stored came from Google Places in whatever format it was published in
   * ("(713) 555-0134"), and what the carrier sends back is E.164. Comparing the
   * raw strings would match nothing at all, which is the silent-failure shape
   * this whole file is written to avoid.
   */
  const last10 = phone.replace(/\D/g, "").slice(-10);
  const { data: rows, error } = await (admin as any)
    .from("booking_requests")
    .select(
      "id, entity_name, entity_phone, customer_name, customer_email, requested_date, " +
        "requested_time, status, notified_business_at, escalated_at, clarification_sent_at"
    )
    .in("status", ["new", "notified"])
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[ghl-inbound] query failed:", error.message);
    return NextResponse.json({ error: "lookup failed" }, { status: 500 });
  }

  const byPhone = (rows || []).filter(
    (r: any) => (r.entity_phone || "").replace(/\D/g, "").slice(-10) === last10
  );

  /*
   * GUARD 1 — RECENCY. This number holds more than one conversation: booking
   * notifications, escalation nudges, claim-verification codes and outreach all
   * go to the same businesses. A message arriving weeks after we last mentioned
   * a booking is almost certainly about something else, and acting on it would
   * move a real appointment on the strength of an unrelated sentence.
   */
  const mine = byPhone.filter((r: any) => {
    const lastTouched = [r.escalated_at, r.notified_business_at]
      .filter(Boolean)
      .sort()
      .pop() as string | undefined;
    return withinReplyWindow(lastTouched ?? null, now);
  });

  if (!mine.length) {
    // Not an error. Businesses text about all sorts of things, and most inbound
    // messages will have nothing to do with a booking.
    return NextResponse.json({
      ok: true,
      matched: false,
      reason: byPhone.length
        ? "open request exists but we haven't texted them about it recently"
        : "no open request for that number",
    });
  }

  const target = mine[0];
  const intent = parseReply(text || "");

  /*
   * GUARD 2 — SILENCE ON ANYTHING THAT WASN'T AN ANSWER. "unclear" covers both
   * an ambiguous answer and a message about something else entirely. Replying
   * "we couldn't tell if that was a yes or a no for Dana, Sat Aug 22" to a
   * question about booth rent is a non-sequitur that names a customer into an
   * unrelated conversation. The booking is left untouched; the escalation cron
   * still owns chasing it.
   */
  if (intent === "unclear" && !looksLikeAnswerAttempt(text || "")) {
    return NextResponse.json({ ok: true, matched: false, reason: "not an answer to us" });
  }
  const nextStatus = statusForIntent(intent);
  const nowIso = now.toISOString();

  // The reply is recorded on the request whether or not it was understood.
  // An unparsed message is the most valuable row in the table — it is the only
  // way to find out how the parser is wrong.
  const patch: Record<string, unknown> = {
    business_reply: (text || "").slice(0, 2000),
    business_replied_at: nowIso,
    updated_at: nowIso,
  };

  if (nextStatus) {
    patch.status = nextStatus;
    patch.status_source = "sms_reply";
    if (nextStatus === "declined") {
      patch.declined_at = nowIso;
      patch.declined_reason = `Business replied by SMS: "${(text || "").slice(0, 200)}"`;
    }
  }

  /*
   * GUARD 3 — CLARIFY AT MOST ONCE PER REQUEST. Without this the prompt fires
   * on every unparsed message, so a business sending three of them gets three
   * identical texts naming the same customer. That reads as a malfunction and
   * is the fastest route to having our number blocked — which would silently
   * kill every future booking notification to that listing.
   */
  const alreadyClarified = Boolean(target.clarification_sent_at);
  const suppressAck = intent === "unclear" && alreadyClarified;

  const ack = suppressAck
    ? null
    : replyAcknowledgement(intent, {
        customerName: target.customer_name,
        date: prettyDate(target.requested_date),
        time: target.requested_time,
        othersOpen: mine.length - 1,
      });

  if (intent === "unclear" && !alreadyClarified) patch.clarification_sent_at = nowIso;

  await (admin as any).from("booking_requests").update(patch).eq("id", target.id);

  if (ack) {
    try {
      await sendGhlSms({ message: ack, phone: target.entity_phone, name: target.entity_name });
    } catch (err: any) {
      // The status change already landed. Failing to acknowledge is a worse
      // experience, not a lost booking, so it must not fail the webhook — GHL
      // retries on non-2xx and would re-apply the whole thing.
      console.warn("[ghl-inbound] ack send failed:", err?.message);
    }
  }

  /*
   * The customer is NOT emailed here. A decline hands off to the escalation
   * cron, which already owns every "here is how your request ended" message and
   * stamps resolution_notified_at so it is sent exactly once. Sending from both
   * places is how a customer gets told twice.
   */
  return NextResponse.json({
    ok: true,
    matched: true,
    intent,
    status: nextStatus || target.status,
    replied: Boolean(ack),
    othersOpen: mine.length - 1,
  });
}
