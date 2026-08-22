/**
 * How far ahead a booking request has to be made.
 *
 * WHY THIS EXISTS. A real request reached a salon 54 minutes before the slot.
 * The salon could not take it, said so, and both the customer and the business
 * were set up to fail by a form that offered 9:00 AM at 8:06 AM. Nobody in that
 * exchange did anything wrong.
 *
 * THE TIMEZONE PROBLEM, and why the two guards differ.
 *
 * A slot is stored as local wall-clock text — "9:00 AM" — with no zone, because
 * that is what the business reads in the SMS and what the customer means. So an
 * absolute instant only exists if you know the timezone, and the server does
 * not: google_hours is populated on 1 of 2,541 shops, listings span several
 * states, and the customer may not be in the same zone as the salon.
 *
 * So enforcement is split:
 *
 *   CLIENT — isTooSoonLocal(). The browser knows its own timezone, and for an
 *   appointment the customer is almost always in the business's region. This is
 *   the real gate: it removes unbookable slots from the picker so nobody fills
 *   in a form only to be rejected.
 *
 *   SERVER — isTooSoonAnywhere(). Authoritative but deliberately permissive. It
 *   interprets the wall-clock time in the latest zone this directory actually
 *   covers (Pacific), and rejects only if even that reading is inside the
 *   floor. It therefore cannot reject a legitimate
 *   request from any US timezone, while still catching the egregious case that
 *   prompted this. A server guard that rejects valid bookings is worse than the
 *   problem it fixes.
 *
 * Pure — `now` is always a parameter, so the boundary behaviour is testable
 * rather than dependent on when the suite runs.
 */

/**
 * Minimum notice, in hours.
 *
 * Four, not twenty-four. The business needs long enough to see the text, check
 * the book and phone the customer — realistically a couple of hours in working
 * time. A 24-hour floor would also forbid same-day appointments entirely, and
 * same-day is a real and valuable case in this trade; the failure was 54
 * minutes, not same-day itself.
 */
export const MIN_LEAD_HOURS = 4;

/**
 * The latest absolute instant a wall-clock time could represent, across the
 * timezones this directory actually covers.
 *
 * MEASURED, NOT ASSUMED. Bookable listings span TX (4,361), CA (830), GA (4)
 * and OK (1) — no Hawaii, no Alaska, no Mountain-only state. The westernmost
 * zone in play is therefore Pacific, and -8 (PST) is the most permissive it
 * ever gets, so a Californian request can never be wrongly rejected.
 *
 * Guarding against UTC-10 instead — "all US timezones", the obvious default —
 * is what let the original incident through: a 54-minute Chicago request reads
 * as 5.9 hours away if you allow that it might have meant Hawaii. Defending a
 * case that does not exist cost the guard the case that does.
 *
 * RE-CHECK THIS IF THE DIRECTORY EXPANDS WEST. A Hawaii or Alaska listing makes
 * this value wrong in the rejecting direction, which is the harmful one.
 */
const MOST_PERMISSIVE_UTC_OFFSET = -8;

/** "9:00 AM" -> minutes since midnight. Null if unparseable. */
export function parseSlotMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(time).trim());
  if (!m) return null;
  const hour12 = Number(m[1]);
  const mins = Number(m[2]);
  if (hour12 < 1 || hour12 > 12 || mins > 59) return null;
  const pm = /pm/i.test(m[3]);
  const h24 = (hour12 % 12) + (pm ? 12 : 0);
  return h24 * 60 + mins;
}

/**
 * The slot as an absolute instant, given a UTC offset in hours.
 *
 * Built from explicit UTC arithmetic rather than `new Date("...")`, whose
 * timezone handling for date-only and offsetless strings differs between
 * runtimes — the kind of bug that only appears on the server.
 */
export function slotInstant(dateStr: string, time: string, utcOffsetHours: number): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr).trim());
  const mins = parseSlotMinutes(time);
  if (!d || mins === null) return null;
  const utcMs = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), 0, mins);
  return new Date(utcMs - utcOffsetHours * 3600_000);
}

/** Hours between now and the slot, read in the caller's own timezone. */
export function hoursUntilLocal(dateStr: string, time: string, now: Date): number | null {
  const mins = parseSlotMinutes(time);
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr).trim());
  if (!d || mins === null) return null;
  // Local construction on purpose: this runs in the browser, where local IS
  // the answer.
  const slot = new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), 0, mins, 0, 0);
  return (slot.getTime() - now.getTime()) / 3600_000;
}

/** Client-side gate. True when the slot is inside the floor, locally. */
export function isTooSoonLocal(dateStr: string, time: string, now: Date): boolean {
  const h = hoursUntilLocal(dateStr, time, now);
  if (h === null) return false; // unparseable is a validation problem, not a lead-time one
  return h < MIN_LEAD_HOURS;
}

/**
 * Server-side gate. True only when the slot is inside the floor in EVERY US
 * timezone — i.e. when no reading of the wall clock could make it valid.
 */
export function isTooSoonAnywhere(dateStr: string, time: string, now: Date): boolean {
  const latest = slotInstant(dateStr, time, MOST_PERMISSIVE_UTC_OFFSET);
  if (!latest) return false;
  return (latest.getTime() - now.getTime()) / 3600_000 < MIN_LEAD_HOURS;
}

/**
 * The EARLIEST instant a wall clock could mean, across covered zones — Eastern.
 *
 * The mirror of MOST_PERMISSIVE_UTC_OFFSET, and used where the safe direction
 * is the opposite one. Deciding "is this appointment soon" wants the earliest
 * reading, because acting slightly early on a request that turns out to be four
 * hours further off costs nothing, and acting late costs the appointment.
 */
const EARLIEST_UTC_OFFSET = -4;

/** Hours until the slot, read as early as any covered zone could make it. */
export function hoursUntilSlotEarliest(dateStr: string, time: string, now: Date): number | null {
  const earliest = slotInstant(dateStr, time, EARLIEST_UTC_OFFSET);
  if (!earliest) return null;
  return (earliest.getTime() - now.getTime()) / 3600_000;
}

/**
 * True once the slot is behind us in every covered timezone.
 *
 * Uses the latest reading on purpose: a request should never be written off as
 * missed while some zone still has it in the future.
 */
export function slotHasPassedEverywhere(dateStr: string, time: string, now: Date): boolean {
  const latest = slotInstant(dateStr, time, MOST_PERMISSIVE_UTC_OFFSET);
  if (!latest) return false;
  return latest.getTime() <= now.getTime();
}

/** The slots still bookable on a given date. Used to build the picker. */
export function bookableSlots(slots: string[], dateStr: string, now: Date): string[] {
  return slots.filter((s) => !isTooSoonLocal(dateStr, s, now));
}

/**
 * What the picker should offer, given what the customer has chosen so far.
 *
 * THE EMPTY-DATE CASE IS THE POINT, and it is why this exists rather than the
 * caller writing the ternary inline. The picker used to fall back to the full
 * slot list whenever there was no date, conflating two different situations:
 *
 *   no date yet   -> nothing is offerable; the day decides which times exist
 *   not mounted   -> show everything, because `now` is deliberately null until
 *                    mount so the server and client render the same markup
 *
 * Treating the first like the second rendered a full grid of live buttons
 * before any day was chosen. Clicking one highlighted it and Continue stayed
 * disabled, because Continue also needs a date. One real visitor clicked seven
 * different times in twelve seconds, closed the modal and started over.
 *
 * Returning [] for a missing date is what makes that impossible.
 */
export function bookableSlotsForDate(
  slots: string[],
  dateStr: string,
  now: Date | null,
): string[] {
  if (!dateStr) return [];
  if (!now) return slots;
  return bookableSlots(slots, dateStr, now);
}

/** What the customer is told when every slot on a day has gone. */
export const TOO_SOON_MESSAGE =
  `Please choose a time at least ${MIN_LEAD_HOURS} hours from now — the salon needs a chance to see the request and call you back.`;
