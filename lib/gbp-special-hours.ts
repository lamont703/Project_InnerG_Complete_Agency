import type { Holiday } from "@/lib/us-holidays";

/**
 * Holiday hours on a Google Business Profile.
 *
 * specialHours is replaced wholesale like serviceItems, so the merge here has
 * the same obligation: start from what exists and change only the dates the
 * owner decided on. In particular it does not prune past holidays — they're
 * harmless, they're the owner's record of what they did last year, and silently
 * deleting data because we think it's stale is not ours to do.
 *
 * Pure — no network, no database.
 */

export interface TimeOfDay {
  hours?: number;
  minutes?: number;
}

export interface SpecialHourPeriod {
  startDate: { year: number; month: number; day: number };
  endDate?: { year: number; month: number; day: number };
  openTime?: TimeOfDay;
  closeTime?: TimeOfDay;
  closed?: boolean;
}

export interface RegularPeriod {
  openDay: string;
  openTime?: TimeOfDay;
  closeDay?: string;
  closeTime?: TimeOfDay;
}

export type HolidayMode = "closed" | "hours" | "unset";

export interface HolidayPlanItem {
  holiday: Holiday;
  mode: HolidayMode;
  openTime?: TimeOfDay;
  closeTime?: TimeOfDay;
  /** Usual hours for that weekday, offered as the starting point. */
  suggested?: { openTime: TimeOfDay; closeTime: TimeOfDay } | null;
}

export interface HolidayDecision {
  date: string; // YYYY-MM-DD
  mode: "closed" | "hours" | "clear";
  openTime?: TimeOfDay;
  closeTime?: TimeOfDay;
}

const DAY_NAMES = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const dateKey = (d: { year: number; month: number; day: number }) =>
  `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;

export const parseDate = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
};

/** The usual hours for the weekday a holiday falls on. */
export function usualHoursFor(holiday: Holiday, regular: RegularPeriod[]): { openTime: TimeOfDay; closeTime: TimeOfDay } | null {
  const weekday = DAY_NAMES[new Date(`${holiday.date}T00:00:00Z`).getUTCDay()];
  const period = regular.find((p) => p.openDay === weekday);
  if (!period?.openTime || !period?.closeTime) return null;
  return { openTime: period.openTime, closeTime: period.closeTime };
}

/** What's currently set for each upcoming holiday. */
export function buildHolidayPlan(
  upcoming: Holiday[],
  existing: SpecialHourPeriod[],
  regular: RegularPeriod[]
): HolidayPlanItem[] {
  const byDate = new Map(existing.map((p) => [dateKey(p.startDate), p]));

  return upcoming.map((holiday) => {
    const found = byDate.get(holiday.date);
    const suggested = usualHoursFor(holiday, regular);

    if (!found) return { holiday, mode: "unset", suggested };
    if (found.closed) return { holiday, mode: "closed", suggested };
    return {
      holiday,
      mode: "hours",
      openTime: found.openTime,
      closeTime: found.closeTime,
      suggested,
    };
  });
}

/**
 * Apply decisions to the existing set.
 *
 * Only dates named in `decisions` are touched. Everything else — including past
 * holidays and any period the owner set in Google's own interface — is carried
 * through exactly as it was.
 */
export function mergeSpecialHours(
  existing: SpecialHourPeriod[],
  decisions: HolidayDecision[]
): SpecialHourPeriod[] {
  const decided = new Map(decisions.map((d) => [d.date, d]));

  const kept = existing.filter((p) => !decided.has(dateKey(p.startDate)));

  const added: SpecialHourPeriod[] = [];
  for (const d of decisions) {
    if (d.mode === "clear") continue;
    const date = parseDate(d.date);
    if (d.mode === "closed") {
      added.push({ startDate: date, endDate: date, closed: true });
      continue;
    }
    // "hours" without both ends is not a statement anyone can act on.
    if (!d.openTime || !d.closeTime) continue;
    added.push({ startDate: date, endDate: date, openTime: d.openTime, closeTime: d.closeTime, closed: false });
  }

  return [...kept, ...added].sort((a, b) => dateKey(a.startDate).localeCompare(dateKey(b.startDate)));
}

/** "12:00" from Google's {hours, minutes} — minutes is omitted when zero. */
export const formatTime = (t?: TimeOfDay): string =>
  t ? `${String(t.hours ?? 0).padStart(2, "0")}:${String(t.minutes ?? 0).padStart(2, "0")}` : "";

/** Back to Google's shape, omitting a zero minutes field as Google does. */
export function parseTime(value: string): TimeOfDay | undefined {
  const m = /^(\d{1,2}):(\d{2})$/.exec((value || "").trim());
  if (!m) return undefined;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return undefined;
  return minutes ? { hours, minutes } : { hours };
}
