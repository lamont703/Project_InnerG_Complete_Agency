import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGhlSms } from "@/lib/ghl-sms";
import { normalizePhone } from "@/lib/ghl-contacts";
import {
  findAwaitingConfirmation,
  markConfirmed,
  markDeclined,
  syncToShopify,
  unsubscribeInShopify,
} from "@/lib/sms-consent/store";
import { classifyReply, welcomeSms } from "@/lib/sms-consent/disclosure";
import { createHaircutOffer, hasOpenOffer } from "@/lib/offers/haircut-offer";
import {
  parseReply,
  statusForIntent,
  replyAcknowledgement,
  withinReplyWindow,
  looksLikeAnswerAttempt,
} from "@/lib/booking-reply";
import { notifyCustomerOnce, type ResolutionKind } from "@/lib/booking-resolution";
import { slotHasPassedEverywhere } from "@/lib/booking-lead-time";

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

  /*
   * SMS CONSENT REPLIES ARE HANDLED FIRST, and the order is load-bearing.
   *
   * Both flows answer on the same number and both use "Y"/"YES": a business
   * confirming a booking, and a client confirming they want texts. Matching
   * bookings first would let a consent reply confirm a stranger's appointment.
   * A consent record is only consulted when one is actually waiting on THIS
   * number, so the booking path is untouched for everyone else.
   *
   * STOP is honoured here regardless of what else is pending. An opt-out that
   * has to wait its turn behind a booking match is an opt-out that can be lost.
   */
  const pendingConsent = await findAwaitingConfirmation(phone);
  if (pendingConsent) {
    const kind = classifyReply(text ?? "");

    if (kind === "opt_out") {
      await markDeclined(pendingConsent.id);
      // Push the opt-out into Shopify too. GHL already stopped the messages at
      // the carrier level; this keeps Shopify's record from saying they are
      // still contactable.
      const un = await unsubscribeInShopify(pendingConsent.shopifyCustomerId);
      return NextResponse.json({
        ok: true, matched: true, flow: "sms_consent", result: "declined",
        shopifyUnsubscribed: un.ok, shopifyError: un.ok ? null : un.error,
      });
    }

    if (kind === "opt_in" && !pendingConsent.confirmedAt) {
      await markConfirmed(pendingConsent.id);

      // Re-read so the sync sees confirmed_at. A failure here is recoverable:
      // the confirmation is already stored and syncPendingConsent() replays it.
      const confirmed = { ...pendingConsent, confirmedAt: new Date().toISOString() };
      const sync = await syncToShopify(confirmed);

      /*
       * THE DISCOUNT IS EARNED HERE, not in the email that asked. It is minted
       * only once a real person has replied YES from the number they gave, so
       * an ignored email costs nothing and a forwarded one gives nothing away.
       * hasOpenOffer stops a second code landing on someone already holding one.
       */
      let offer = null;
      if (!(await hasOpenOffer(pendingConsent.shopifyCustomerId))) {
        const made = await createHaircutOffer({
          shopifyCustomerId: pendingConsent.shopifyCustomerId,
          clientName: pendingConsent.clientName,
          context: "sms_opt_in",
        });
        if (made.ok) {
          offer = { code: made.offer.code, percentOff: made.offer.percentOff, expiresAt: made.offer.expiresAt };
        } else {
          // A failed discount must not cost the welcome, and must not cost the
          // consent that was already recorded above.
          console.warn(`[sms-consent] offer failed for ${pendingConsent.clientName}: ${made.error}`);
        }
      }

      const firstName = (pendingConsent.clientName ?? "").trim().split(/\s+/)[0] || "there";
      await sendGhlSms({
        message: welcomeSms(firstName, offer),
        phone: pendingConsent.phone,
        name: pendingConsent.clientName ?? undefined,
      });

      return NextResponse.json({
        ok: true,
        matched: true,
        flow: "sms_consent",
        result: "confirmed",
        offerIssued: offer?.code ?? null,
        syncedToShopify: sync.ok,
        syncError: sync.ok ? null : sync.error,
      });
    }
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
      "id, entity_name, entity_phone, entity_slug, entity_type, service_name, " +
        "customer_name, customer_email, requested_date, " +
        "requested_time, status, notified_business_at, escalated_at, clarification_sent_at, " +
        "resolution_notified_at"
    )
    .in("status", ["new", "notified"])
    /*
     * A phone_call row is worked by a human and never received a text from us,
     * so an inbound SMS cannot be a reply to it. Without this a school that
     * texts us for any reason could have its tour request marked "booked".
     */
    .eq("notify_channel", "sms")
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
   * THE CUSTOMER IS TOLD NOW, NOT AT THE TOP OF THE HOUR.
   *
   * This used to hand off to the follow-up cron on the grounds that sending
   * from two places is how a customer gets told twice. The grounds were right;
   * the conclusion cost too much. The cron runs hourly, so a business replying
   * "Y" at 2:18pm left the customer in silence until 3:00 — 41 minutes on the
   * first booking this site ever completed, and up to 60 in the worst case.
   * That is the exact window in which somebody rings the shop themselves or
   * books elsewhere.
   *
   * notifyCustomerOnce is the same function the cron calls, and it claims the
   * row (`resolution_notified_at IS NULL` in the update predicate) before it
   * sends. So the two callers cannot both email: whoever gets there first wins
   * and the other returns "already_notified". The cron remains the safety net
   * for everything this webhook never sees — a decline that arrives while we
   * are down, a request nobody ever answers.
   *
   * A SEND FAILURE MUST NOT FAIL THE WEBHOOK. GHL retries a non-2xx, which
   * would re-run the whole handler against a row whose status has already
   * moved. Same reasoning as the acknowledgement above.
   */
  let notified: string | null = null;
  if (nextStatus === "booked" || nextStatus === "declined") {
    try {
      const slotGone = slotHasPassedEverywhere(target.requested_date, target.requested_time, now);
      /*
       * A yes that arrives after the slot is not a booking, and saying
       * "confirmed - Sat Aug 22 at 9:00 AM" about a time that has passed sends
       * someone to an appointment that already happened. booking-escalation
       * makes the same distinction for the cron's path; this mirrors it so the
       * two callers cannot disagree about what a late yes means.
       */
      const kind: ResolutionKind =
        nextStatus === "declined"
          // A late NO needs the same distinction as a late yes. The ordinary
          // declined copy credits the business with answering quickly, which
          // reads badly about a slot that went by yesterday.
          ? slotGone
            ? "declined_late"
            : "declined"
          : slotGone
            ? "booked_late"
            : "booked";
      const outcome = await notifyCustomerOnce(admin, target as any, kind, now);
      notified = outcome.sent ? kind : (outcome.reason ?? "not_sent");
    } catch (err: any) {
      console.warn("[ghl-inbound] customer notify failed:", err?.message);
      notified = "threw";
    }
  }

  return NextResponse.json({
    ok: true,
    matched: true,
    intent,
    status: nextStatus || target.status,
    replied: Boolean(ack),
    notified,
    othersOpen: mine.length - 1,
  });
}
