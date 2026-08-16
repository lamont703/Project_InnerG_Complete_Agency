/**
 * When a school tour can be requested.
 *
 * Schools are not salons, and the difference is the whole reason this is a
 * separate module from lib/booking-lead-time.ts:
 *
 *   WEEKDAYS ONLY. An admissions office is not open Saturday. Offering a
 *   Saturday slot produces a request nobody can honour and a caller who has to
 *   apologise for it.
 *
 *   10:00–16:00, ON THE HOUR. Six slots a day. The last tour STARTS at 16:00,
 *   so it ends at 17:00 — TOUR_END_HOUR is the last start time, not closing
 *   time, and getting that backwards silently loses a slot or books one past
 *   close.
 *
 *   48 HOURS OF LEAD TIME, against 2 for an appointment. A haircut needs a
 *   chair; a tour needs a person freed up to walk someone round a campus.
 *   Nobody arranges that same-day, and the request also has to reach the school
 *   through a HUMAN PHONE CALL rather than an instant SMS — we hold four email
 *   addresses across 1,185 schools. The 48 hours is the caller's window, and it
 *   is the reason this number is not negotiable downward.
 *
 * TIMEZONE, and why the client is the real gate. Slots are wall-clock text with
 * no zone, because that is what the school reads and what the visitor means.
 * The server cannot know the school's zone — this directory spans several
 * states. So, exactly as booking-lead-time.ts resolves it:
 *
 *   CLIENT  isTourSlotBookable()  — the browser knows its own zone, and a
 *   visitor touring a campus is essentially always in that campus's region.
 *   This removes unbookable slots from the picker.
 *
 *   SERVER  isTourTooSoonAnywhere() — authoritative but permissive. It reads
 *   the requested time in the LATEST zone we cover (Pacific) and rejects only
 *   if even that reading is inside the floor. A server guard that rejects
 *   legitimate requests is worse than the problem it fixes.
 */

/** First tour start time, 24h. */
export const TOUR_START_HOUR = 10;

/** LAST tour START time, 24h — not the closing time. The 16:00 tour ends at 17:00. */
export const TOUR_END_HOUR = 16;

/** Minimum notice, in hours. See the note above before lowering this. */
export const TOUR_LEAD_HOURS = 48;

/** How far ahead the picker offers dates. */
export const TOUR_WINDOW_DAYS = 30;

export const TOUR_TOO_SOON_MESSAGE =
  "School tours need at least 48 hours' notice. Please choose a later time.";

/** Pacific is the latest zone this directory covers. See the timezone note. */
const LATEST_UTC_OFFSET_HOURS = -7;

/**
 * "10:00 AM" … "4:00 PM" — six slots, one per hour.
 * Inclusive of TOUR_END_HOUR because that hour is a valid START.
 */
export function buildTourSlots(): string[] {
  const out: string[] = [];
  for (let h = TOUR_START_HOUR; h <= TOUR_END_HOUR; h++) {
    const h12 = h % 12 === 0 ? 12 : h % 12;
    out.push(`${h12}:00 ${h < 12 ? "AM" : "PM"}`);
  }
  return out;
}

export const TOUR_SLOTS = buildTourSlots();

/** Monday–Friday. `dateStr` is "yyyy-MM-dd", parsed as a local date. */
export function isWeekday(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return false;
  const day = new Date(y, m - 1, d).getDay();
  return day >= 1 && day <= 5;
}

/** "4:00 PM" -> 16. Returns null on anything unparseable. */
export function parseSlotHour(slot: string): number | null {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(slot.trim());
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return h;
}

/**
 * CLIENT-SIDE gate. True if this slot is far enough ahead in the viewer's own
 * timezone. `now` is passed rather than read so this stays pure and testable —
 * and so the picker can render identically on server and client before
 * hydration.
 */
export function isTourSlotBookable(dateStr: string, slot: string, now: Date): boolean {
  if (!isWeekday(dateStr)) return false;
  const hour = parseSlotHour(slot);
  if (hour === null) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(y, m - 1, d, hour, 0, 0, 0);
  return start.getTime() - now.getTime() >= TOUR_LEAD_HOURS * 3600_000;
}

/** The slots still offerable on a given date. Empty on weekends, by design. */
export function bookableTourSlots(dateStr: string, now: Date): string[] {
  return TOUR_SLOTS.filter((s) => isTourSlotBookable(dateStr, s, now));
}

/**
 * SERVER-SIDE gate. Deliberately permissive: interprets the wall-clock time in
 * the latest zone we cover, so it cannot reject a valid request from any US
 * timezone. Weekend rejection is NOT permissive — a Saturday is a Saturday in
 * every zone this directory serves.
 */
export function isTourTooSoonAnywhere(dateStr: string, slot: string, now: Date): boolean {
  const hour = parseSlotHour(slot);
  if (hour === null) return true;
  const [y, m, d] = dateStr.split("-").map(Number);
  const utcMs = Date.UTC(y, m - 1, d, hour - LATEST_UTC_OFFSET_HOURS, 0, 0, 0);
  return utcMs - now.getTime() < TOUR_LEAD_HOURS * 3600_000;
}

/** Rejects weekends and slots outside 10:00–16:00 on the hour. */
export function isValidTourSlot(dateStr: string, slot: string): boolean {
  if (!isWeekday(dateStr)) return false;
  return TOUR_SLOTS.includes(slot.trim());
}
