import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGhlSms } from "@/lib/ghl-sms";
import { sendGhlEmail } from "@/lib/ghl-email";
import { SITE_URL } from "@/lib/site";
import { nextAction, withinContactWindow, type EscalationRow } from "@/lib/booking-escalation";

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

const SEGMENT: Record<string, string> = {
  shop: "shop",
  salon: "salons",
  barber: "barbers",
  cosmetologist: "cosmetologists",
};

const listingUrl = (r: Row) =>
  r.entity_slug ? `${SITE_URL}/${SEGMENT[r.entity_type] || "shop"}/${r.entity_slug}` : SITE_URL;

const prettyDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

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
    `Reminder — appointment request still waiting (ShearQuery)\n` +
    `${r.service_name || "Appointment"} — ${prettyDate(r.requested_date)} at ${r.requested_time}\n` +
    `${r.customer_name || "A customer"}\n` +
    `Phone: ${r.customer_phone}\n` +
    `They haven't heard back yet. Can you take it? A quick yes or no is enough.`
  );
}

/**
 * The two customer emails.
 *
 * HONEST, AND WITH SOMEWHERE TO GO. Both say plainly that the appointment is
 * not happening — a vague "there may be a delay" leaves someone waiting on a
 * chair that was never booked, which is worse than the refusal. Both then hand
 * over the business's own number, because at this point withholding it serves
 * nobody, and a link back to the listing so the search can continue.
 *
 * The difference between them is whose fault it reads as, and that matters. A
 * business that declined promptly did the right thing and the email says so; a
 * business that never replied gets no such cover.
 */
function resolutionEmail(r: Row, kind: "declined" | "no_response") {
  const who = r.entity_name || "The business";
  const when = `${prettyDate(r.requested_date)} at ${r.requested_time}`;
  const call = r.entity_phone
    ? `<p>Their number, if you'd like to try another time: <a href="tel:${r.entity_phone}">${r.entity_phone}</a></p>`
    : "";

  if (kind === "declined") {
    return {
      subject: `${who} can't make ${r.requested_time} — here's where that leaves you`,
      html:
        `<p>${r.customer_name ? `${r.customer_name}, ` : ""}<strong>${who}</strong> got back to us: ` +
        `they can't take <strong>${when}</strong>.</p>` +
        `<p>That's a no for that slot, not for them — they answered quickly, which is worth ` +
        `something. Another time may well work.</p>` +
        call +
        `<p><a href="${listingUrl(r)}">View the listing</a></p>`,
    };
  }

  return {
    subject: `No reply from ${who} — don't hold ${r.requested_time}`,
    html:
      `<p>${r.customer_name ? `${r.customer_name}, ` : ""}we passed your request for ` +
      `<strong>${when}</strong> to <strong>${who}</strong> and followed up, and they never ` +
      `came back to us.</p>` +
      `<p>We'd rather tell you than leave you wondering: <strong>treat that time as not ` +
      `booked.</strong></p>` +
      call +
      `<p><a href="${SITE_URL}">Find somewhere else</a></p>`,
  };
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
        "customer_name, customer_phone, customer_email"
    )
    .is("resolution_notified_at", null)
    .in("status", ["notified", "declined"])
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

    // Both remaining actions tell the customer something final.
    const kind = action.kind === "tell_customer_declined" ? "declined" : "no_response";
    if (!row.customer_email) {
      failures.push(`${row.id}: no customer email`);
    } else {
      try {
        const { subject, html } = resolutionEmail(row, kind);
        const res = await sendGhlEmail({
          email: row.customer_email,
          name: row.customer_name || undefined,
          subject,
          html,
        });
        if (res.ok) told++;
        else failures.push(`${row.id} email: ${res.error || "unknown"}`);
      } catch (err: any) {
        failures.push(`${row.id} email threw: ${err?.message}`);
      }
    }

    const patch: Record<string, unknown> = {
      resolution_notified_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    // A released request also changes status. A declined one does not — it is
    // already in its final state and only the customer was outstanding.
    if (kind === "no_response") patch.status = "no_response";

    await (supabase as any).from("booking_requests").update(patch).eq("id", row.id);
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
