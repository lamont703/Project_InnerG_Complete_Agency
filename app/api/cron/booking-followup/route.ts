import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGhlSms } from "@/lib/ghl-sms";
import { nextAction, withinContactWindow, type EscalationRow } from "@/lib/booking-escalation";
import {
  notifyCustomerOnce,
  prettyDate,
  type ResolutionKind,
  type ResolutionRow,
} from "@/lib/booking-resolution";

/**
 * The follow-up the site owner has been doing by hand.
 *
 * Three requests went out. One business replied, and it replied only because a
 * reminder was sent manually. The schema had anticipated this since day one —
 * `escalated_at` exists, and `booking_requests_escalation_due_idx` carries the
 * comment "the escalation cron's exact predicate" — but no cron was ever
 * written. This is it.
 *
 * WHAT IT DOES, in priority order per request:
 *
 *   nudge_business         one reminder SMS, never a second
 *   tell_customer_booked   the business said yes — nothing else tells them
 *   tell_customer_declined the business said no; the customer is still waiting
 *   release_customer       nobody ever answered and the slot has gone
 *
 * ALL THE POLICY IS IN lib/booking-escalation.ts, not here. This file decides
 * nothing about timing — it fetches, asks `nextAction`, and sends. That split is
 * what lets the thresholds be tested without a message going anywhere, which
 * matters more than usual when the failure mode is texting a real barber at 4am.
 *
 * IDEMPOTENT BY CONSTRUCTION. Every action stamps its column — escalated_at or
 * resolution_notified_at — whether or not the send succeeded, and `nextAction`
 * treats a stamped row as done. A failed send is still an attempt; retrying it
 * next hour risks a second text to a business that got the first one.
 *
 * Hourly, because the urgent lane is only useful if it can fire an hour after
 * the original. The contact window keeps that from becoming a 4am text.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when that var is set. */
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** At most this many per run. A backlog must never become a send burst. */
const BATCH = 25;

type Row = EscalationRow & {
  id: string;
  entity_name: string | null;
  entity_phone: string | null;
  entity_slug: string | null;
  entity_type: string;
  service_name: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
};

/**
 * The reminder.
 *
 * Deliberately not a copy of the original text. A business that missed the
 * first one needs the details again — it cannot act on "you have a request" —
 * but it also needs to see that this is a second message, because being chased
 * is information in itself. The single question at the end is doing the work:
 * it is answerable in four words from a phone between clients, and a business
 * that cannot take the slot is far more likely to say so than to say nothing.
 */
function nudgeSms(r: Row) {
  return (
    `Reminder - appointment request still waiting (ShearQuery)\n` +
    `${r.service_name || "Appointment"} - ${prettyDate(r.requested_date)} at ${r.requested_time}\n` +
    `${r.customer_name || "A customer"}\n` +
    `Phone: ${r.customer_phone}\n` +
    `They haven't heard back yet. Can you take it? A quick yes or no is enough.`
  );
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const now = new Date();
  const supabase = createAdminClient();

  /*
   * Cast because the generated Supabase types lag the pushed schema —
   * resolution_notified_at is new. Same reason as shortlist-followup: without
   * it every field infers as `never`.
   */
  const { data, error } = await (supabase as any)
    .from("booking_requests")
    .select(
      "id, status, notified_business_at, escalated_at, resolution_notified_at, requested_date, " +
        "requested_time, entity_name, entity_phone, entity_slug, entity_type, service_name, " +
        "customer_name, customer_phone, customer_email, notify_channel"
    )
    .is("resolution_notified_at", null)
    .in("status", ["notified", "declined", "booked"])
    .order("requested_date", { ascending: true })
    .limit(BATCH);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data || []) as Row[];
  const open = withinContactWindow(now);

  const plan = rows.map((r) => ({ row: r, action: nextAction(r, now) }));

  if (dry) {
    // Counts and reasons only. No phone numbers, no email addresses — a dry run
    // is for checking the policy, and a response body is an easy place to leak
    // a customer's details into a log.
    return NextResponse.json({
      dryRun: true,
      now: now.toISOString(),
      contactWindowOpen: open,
      considered: rows.length,
      plan: plan.map((p) => ({
        id: p.row.id,
        business: p.row.entity_name,
        slot: `${p.row.requested_date} ${p.row.requested_time}`,
        status: p.row.status,
        action: p.action.kind,
        why: p.action.kind === "wait" ? p.action.why : undefined,
      })),
    });
  }

  let nudged = 0;
  let told = 0;
  let heldForWindow = 0;
  const failures: string[] = [];

  for (const { row, action } of plan) {
    if (action.kind === "wait") continue;

    if (action.kind === "nudge_business") {
      // Held, not skipped — the row keeps escalated_at null and is picked up on
      // the first run after the window opens. See withinContactWindow.
      if (!open) {
        heldForWindow++;
        continue;
      }
      if (!row.entity_phone) {
        failures.push(`${row.id}: no business phone`);
      } else {
        try {
          const res = await sendGhlSms({
            message: nudgeSms(row),
            phone: row.entity_phone,
            name: row.entity_name,
          });
          if (res.ok) nudged++;
          else failures.push(`${row.id} sms: ${res.error || "unknown"}`);
        } catch (err: any) {
          failures.push(`${row.id} sms threw: ${err?.message}`);
        }
      }
      // Stamped on attempt, not on success. A retry next hour is a second text.
      await (supabase as any)
        .from("booking_requests")
        .update({ escalated_at: now.toISOString(), updated_at: now.toISOString() })
        .eq("id", row.id);
      continue;
    }

    // The remaining actions all tell the customer something final.
    const kind: ResolutionKind =
      action.kind === "tell_customer_declined"
        ? "declined"
        : action.kind === "tell_customer_booked"
          ? "booked"
          : action.kind === "tell_customer_booked_late"
            ? "booked_late"
            : "no_response";

    /*
     * The send, the stamp and the once-only guarantee all live in
     * notifyCustomerOnce now, because the inbound-SMS webhook calls it too. It
     * claims the row before sending, so whichever of the two gets there first
     * is the only one that emails — this loop no longer needs to be the sole
     * caller to be safe, which is precisely what let the webhook stop waiting
     * an hour for this cron to notice a "Y".
     */
    const outcome = await notifyCustomerOnce(supabase, row as ResolutionRow, kind, now);
    if (outcome.sent) told++;
    else if (outcome.reason !== "already_notified") {
      failures.push(`${row.id} ${outcome.reason}${outcome.error ? `: ${outcome.error}` : ""}`);
    }
  }

  if (failures.length) console.warn(`[booking-followup] ${failures.join("; ")}`);

  return NextResponse.json({
    considered: rows.length,
    nudged,
    told,
    heldForWindow,
    failed: failures.length,
    failures: failures.slice(0, 5),
  });
}
