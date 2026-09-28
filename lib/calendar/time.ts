/**
 * Wall-clock time in a named zone, without a date library.
 *
 * A calendar's weekly hours are wall-clock ("9am–6pm in Houston") while every
 * appointment is an instant (UTC). Converting between the two is where
 * scheduling code breaks — twice a year, when a fixed UTC offset stops being
 * right. So nothing here assumes an offset: it asks Intl what the zone's
 * offset was at that instant, which knows the daylight-saving rules.
 *
 * Pure. Tested across both 2026 US transitions in time.test.ts.
 */

const partsFmt = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string): Intl.DateTimeFormat {
  let f = partsFmt.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short",
    });
    partsFmt.set(tz, f);
  }
  return f;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface ZonedParts {
  year: number; month: number; day: number; hour: number; minute: number; second: number;
  /** 0 = Sunday. */
  weekday: number;
}

export function zonedParts(date: Date, tz: string): ZonedParts {
  const p: Record<string, string> = {};
  for (const part of fmt(tz).formatToParts(date)) p[part.type] = part.value;
  return {
    year: Number(p.year), month: Number(p.month), day: Number(p.day),
    hour: Number(p.hour) % 24, minute: Number(p.minute), second: Number(p.second),
    weekday: WEEKDAYS.indexOf(p.weekday),
  };
}

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Milliseconds to ADD to a UTC instant to get the zone's wall clock at that instant. */
function offsetAt(ms: number, tz: string): number {
  const z = zonedParts(new Date(ms), tz);
  return Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second) - Math.floor(ms / 1000) * 1000;
}

/**
 * The instant at which the zone's wall clock reads y-m-d at minuteOfDay.
 *
 * Guess with the offset at the naive time, then correct once with the offset
 * at the result — the second look is what makes DST days right. A wall time
 * that does not exist (2:30am on spring-forward) lands an hour later, which is
 * what a person would expect of a clock that jumped.
 */
export function zonedToUtc(year: number, month: number, day: number, minuteOfDay: number, tz: string): Date {
  const naive = Date.UTC(year, month - 1, day, Math.floor(minuteOfDay / 60), minuteOfDay % 60);
  let ms = naive - offsetAt(naive, tz);
  const corrected = naive - offsetAt(ms, tz);
  if (corrected !== ms) ms = corrected;
  return new Date(ms);
}

/** "2026-09-30" in the zone. */
export function localDateKey(date: Date, tz: string): string {
  const z = zonedParts(date, tz);
  return `${z.year}-${String(z.month).padStart(2, "0")}-${String(z.day).padStart(2, "0")}`;
}

export function parseDateKey(key: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCMonth() === month - 1 && d.getUTCDate() === day ? { year, month, day } : null;
}

export function addDaysToKey(key: string, days: number): string {
  const p = parseDateKey(key)!;
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday, for a calendar date (no zone needed — a date has one weekday). */
export function weekdayOfKey(key: string): number {
  const p = parseDateKey(key)!;
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
}

/** Start of that local day, as an instant. */
export function startOfLocalDay(key: string, tz: string): Date {
  const p = parseDateKey(key)!;
  return zonedToUtc(p.year, p.month, p.day, 0, tz);
}

const CLOCK = (h: number, m: number) => {
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${suffix}` : `${h12}${suffix}`;
};

export const minuteToClock = (min: number) => CLOCK(Math.floor(min / 60) % 24, min % 60);

/** "Tue Sep 30, 3pm" in the zone. */
export function formatLocal(date: Date, tz: string, withDate = true): string {
  const z = zonedParts(date, tz);
  const clock = CLOCK(z.hour, z.minute);
  if (!withDate) return clock;
  const month = new Date(Date.UTC(z.year, z.month - 1, 1)).toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `${WEEKDAYS[z.weekday]} ${month} ${z.day}, ${clock}`;
}

/**
 * "9am", "9:30 am", "17:30" → minutes after midnight. A bare "9" is refused,
 * because 9 in the morning and 9 at night are both plausible for a barber.
 */
export function parseClock(raw: unknown): number | null {
  const t = String(raw ?? "").trim().toLowerCase().replace(/\s+/g, "");
  const ampm = /^(\d{1,2})(?::(\d{2}))?(am|pm)$/.exec(t);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = Number(ampm[2] ?? 0);
    if (h < 1 || h > 12 || m > 59) return null;
    if (ampm[3] === "am" && h === 12) h = 0;
    if (ampm[3] === "pm" && h !== 12) h += 12;
    return h * 60 + m;
  }
  const h24 = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (h24) {
    const h = Number(h24[1]);
    const m = Number(h24[2]);
    return h <= 24 && m <= 59 && h * 60 + m <= 1440 ? h * 60 + m : null;
  }
  return null;
}
