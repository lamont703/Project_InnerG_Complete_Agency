import { zonedToUtc, addDaysToKey, weekdayOfKey, parseDateKey, localDateKey, zonedParts } from "@/lib/calendar/time";

/**
 * Open times: weekly hours, minus time off, minus what is already booked.
 *
 * Pure — the store feeds it rows and it returns instants — so every rule is
 * tested on its own in availability.test.ts.
 *
 * THE RULES, and why each one:
 *  - A service must END by closing time. Its clean-up buffer may run past
 *    close: nobody books into the minutes after closing anyway.
 *  - A booking occupies start .. end + buffer. That is what the database's
 *    overlap guard checks too (blocks_until), so a slot offered here cannot
 *    be refused there for a reason this function did not know.
 *  - Candidate starts step from each window's own opening time, so a shift
 *    that opens at 9:45 offers 9:45, not 10:00.
 *  - notBefore enforces minimum notice for CLIENTS. The pro booking a walk-in
 *    passes "now".
 */

export interface HoursRow { weekday: number; start_minute: number; end_minute: number }
export interface Interval { start: Date; end: Date }

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function openSlots(args: {
  hours: HoursRow[];
  blocked: Interval[];
  durationMinutes: number;
  bufferMinutes: number;
  stepMinutes: number;
  tz: string;
  /** Inclusive local date keys, YYYY-MM-DD. */
  fromKey: string;
  toKey: string;
  notBefore: Date;
  /** Stop after this many, so a two-month search does not return 3,000 times. */
  limit?: number;
}): Date[] {
  const { hours, blocked, durationMinutes, bufferMinutes, stepMinutes, tz, fromKey, toKey, notBefore } = args;
  const limit = args.limit ?? 200;
  const out: Date[] = [];
  if (!parseDateKey(fromKey) || !parseDateKey(toKey) || fromKey > toKey) return out;

  for (let key = fromKey; key <= toKey && out.length < limit; key = addDaysToKey(key, 1)) {
    const { year, month, day } = parseDateKey(key)!;
    const windows = hours
      .filter((h) => h.weekday === weekdayOfKey(key))
      .sort((a, b) => a.start_minute - b.start_minute);

    for (const w of windows) {
      for (let m = w.start_minute; m + durationMinutes <= w.end_minute; m += stepMinutes) {
        const start = zonedToUtc(year, month, day, m, tz);
        if (start < notBefore) continue;
        const occupied = {
          start,
          end: new Date(start.getTime() + (durationMinutes + bufferMinutes) * 60_000),
        };
        if (blocked.some((b) => overlaps(occupied, b))) continue;
        out.push(start);
        if (out.length >= limit) break;
      }
    }
  }
  return out;
}

/**
 * Whether a specific start sits inside working hours — for the pro, who may
 * book outside them on purpose (an early favour, a late regular). Returns a
 * reason rather than a boolean so Claude can ask "that's before you open —
 * book it anyway?" instead of silently refusing or silently allowing.
 */
export function outsideHoursReason(args: {
  start: Date;
  durationMinutes: number;
  hours: HoursRow[];
  tz: string;
}): string | null {
  const z = zonedParts(args.start, args.tz);
  const key = localDateKey(args.start, args.tz);
  const startMin = z.hour * 60 + z.minute;
  const endMin = startMin + args.durationMinutes;
  const today = args.hours.filter((h) => h.weekday === weekdayOfKey(key));
  if (!today.length) return "that day is marked closed";
  if (today.some((h) => startMin >= h.start_minute && endMin <= h.end_minute)) return null;
  return "that time is outside your working hours";
}
