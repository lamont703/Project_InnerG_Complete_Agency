/**
 * What to do about a booking request nobody has answered.
 *
 * WHY THIS EXISTS. Three requests reached three businesses. One replied — and
 * it replied only because the site owner sent a reminder by hand. The schema
 * anticipated this (`escalated_at`, and an index whose comment already said
 * "the escalation cron's exact predicate") but nothing ever read either one.
 * The cron was a person.
 *
 * THE ASYMMETRY THAT SHAPES EVERY CHOICE HERE. Customers are replaceable and
 * businesses are not. There are thousands of people searching and a few
 * thousand listings, of which a small number have ever received a request. A
 * reminder that annoys a business costs more than a request that goes cold, so
 * every threshold below is set to nudge once, usefully, at a moment a working
 * barber can act on — never to keep asking.
 *
 * URGENCY IS RELATIVE TO THE APPOINTMENT, NOT TO THE SEND. "Remind after N
 * hours" is the obvious rule and it is wrong in both directions: it pesters
 * about an appointment three weeks out and it is far too slow for one tomorrow
 * morning. So there are two lanes into the same single nudge — a slow one for
 * requests with room, and an urgent one that fires within an hour when the slot
 * is close.
 *
 * Pure. `now` is always a parameter, and nothing here sends anything — the
 * route decides that. Keeping the decision separate from the sending is what
 * makes the thresholds testable without a message going anywhere.
 */
import { hoursUntilSlotEarliest, slotHasPassedEverywhere } from "./booking-lead-time";

/** The slow lane: a request with room still gets most of a day to breathe. */
export const NUDGE_AFTER_HOURS = 20;

/** Inside this, the request is urgent and the slow lane is far too slow. */
export const URGENT_WITHIN_HOURS = 24;

/**
 * Even urgent requests get this long first. A business that is mid-haircut when
 * the original text lands has not ignored anything yet, and a reminder ten
 * minutes behind the first message reads as a malfunction.
 */
export const URGENT_MIN_WAIT_HOURS = 1;

export interface EscalationRow {
  status: string;
  /**
   * 'sms' = we can text the business. 'phone_call' = a human owes them a call
   * and no automation may send anything. Added by the school-tour migration
   * (20260816180000): across 1,185 schools we hold FOUR email addresses and no
   * usable automated channel, so tour requests are worked by a person.
   */
  notify_channel?: string | null;
  notified_business_at: string | null;
  escalated_at: string | null;
  resolution_notified_at: string | null;
  requested_date: string;
  requested_time: string;
}

export type EscalationAction =
  /** Text the business again. The one action proven to get a reply here. */
  | { kind: "nudge_business" }
  /** Nobody ever answered and the slot is gone. Tell the customer, stop waiting. */
  | { kind: "release_customer" }
  /** The business declined. The customer is still sitting in silence. */
  | { kind: "tell_customer_declined" }
  /** The business said yes. Nothing has told the customer that yet. */
  | { kind: "tell_customer_booked" }
  /**
   * The business said yes, but after the requested time had already passed.
   * A different message: willing, not booked.
   */
  | { kind: "tell_customer_booked_late" }
  /** Nothing to do. `why` is returned so a dry run explains itself. */
  | { kind: "wait"; why: string };

const hoursSince = (iso: string | null, now: Date): number | null =>
  iso ? (now.getTime() - new Date(iso).getTime()) / 3600_000 : null;

/**
 * The whole policy, in one function.
 *
 * Order matters: a declined request is resolved and must never be nudged, so it
 * is answered before anything looks at timing.
 */
export function nextAction(row: EscalationRow, now: Date): EscalationAction {
  // A business that answered has done its part. Telling the customer is the
  // only thing left, and it outranks every timing rule below.
  if (row.status === "declined") {
    return row.resolution_notified_at
      ? { kind: "wait", why: "declined, customer already told" }
      : { kind: "tell_customer_declined" };
  }

  // The good outcome, and it needs saying out loud. A business replying "Y" by
  // SMS moves the row and nothing else — without this the customer who started
  // all of it is the only person who never finds out it worked.
  if (row.status === "booked") {
    if (row.resolution_notified_at) return { kind: "wait", why: "booked, customer already told" };
    /*
     * A YES CAN ARRIVE TOO LATE, and until this check it was still sent as an
     * ordinary confirmation — "confirmed, Sat Aug 22 at 9:00 AM" for a slot
     * that had already gone. Telling someone to turn up to an appointment that
     * has been and went is worse than telling them nothing.
     *
     * The booked branch sits above every timing rule below because a business
     * that answered has done its part and that outranks the thresholds. That is
     * still right — what was missing is that "answered" and "answered in time"
     * are different facts, and only one of them is a booking.
     *
     * Not theoretical: the only business that has ever replied took 88 hours.
     */
    return slotHasPassedEverywhere(row.requested_date, row.requested_time, now)
      ? { kind: "tell_customer_booked_late" }
      : { kind: "tell_customer_booked" };
  }

  if (row.status !== "notified") {
    return { kind: "wait", why: `status is ${row.status}, not awaiting a reply` };
  }

  /*
   * NO AUTOMATED NUDGE ON A PHONE-CALL ROW. The migration that introduced
   * notify_channel changed booking_requests_escalation_due_idx to exclude these
   * — but an index does not filter, a query does, and this policy is what the
   * job actually asks. Without this check a school tour request sitting at
   * 'notified' would be texted a reminder about an appointment, on a channel we
   * deliberately do not use for schools.
   *
   * Only the NUDGE is suppressed. The customer-facing outcomes below still
   * apply: someone who asked for a tour and heard nothing deserves to be told
   * just as much as someone who asked for a haircut.
   */
  const canText = (row.notify_channel ?? "sms") === "sms";

  const passed = slotHasPassedEverywhere(row.requested_date, row.requested_time, now);

  if (row.escalated_at) {
    // Already reminded once. That is the whole budget — a second reminder to a
    // business that has now ignored two is not going to produce a third
    // outcome, and it is how a listing starts treating us as spam.
    if (!passed) return { kind: "wait", why: "nudged, still time for a reply" };
    return row.resolution_notified_at
      ? { kind: "wait", why: "closed out, customer already told" }
      : { kind: "release_customer" };
  }

  // Never nudged, and the slot is already gone: the reminder has no purpose
  // now. Skip straight to being honest with the customer rather than texting a
  // business about an appointment that cannot happen.
  if (passed) {
    return row.resolution_notified_at
      ? { kind: "wait", why: "missed and closed out" }
      : { kind: "release_customer" };
  }

  const waited = hoursSince(row.notified_business_at, now);
  if (waited === null) {
    // notified_business_at is stamped in the same write as status='notified', so
    // this should not happen. Waiting rather than nudging means a data problem
    // never turns into a message.
    return { kind: "wait", why: "notified with no timestamp — not acting on that" };
  }

  if (!canText) {
    return { kind: "wait", why: "phone_call row — a human owes this a call, no automated nudge" };
  }

  const untilSlot = hoursUntilSlotEarliest(row.requested_date, row.requested_time, now);
  const urgent = untilSlot !== null && untilSlot <= URGENT_WITHIN_HOURS;

  if (urgent) {
    return waited >= URGENT_MIN_WAIT_HOURS
      ? { kind: "nudge_business" }
      : { kind: "wait", why: "urgent, but the first text is under an hour old" };
  }

  return waited >= NUDGE_AFTER_HOURS
    ? { kind: "nudge_business" }
    : { kind: "wait", why: `waited ${waited.toFixed(1)}h of ${NUDGE_AFTER_HOURS}h` };
}

/**
 * Business hours in Central time, the window an SMS to a business may be sent
 * in.
 *
 * NOT A NICETY — the cron runs hourly and would otherwise text a barber at 4am
 * about an appointment, which is the single fastest way to make a listing block
 * the number every future request depends on. A reminder held until morning
 * loses nothing: it was going to be read in the morning either way.
 *
 * Central because Texas is 4,361 of the 5,196 bookable listings. 10:00–19:00
 * Central is 08:00–17:00 Pacific, which is civil at both ends of the range this
 * directory actually covers. Customer EMAIL is deliberately not gated by this —
 * an email at 4am costs nobody anything.
 */
export function withinContactWindow(now: Date): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour: "numeric",
      hour12: false,
    }).format(now)
  );
  return hour >= 10 && hour < 19;
}
