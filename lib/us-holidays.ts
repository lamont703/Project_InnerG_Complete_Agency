/**
 * US holidays that matter to a barbershop or salon.
 *
 * Computed rather than listed, because half of them float — Thanksgiving is the
 * fourth Thursday in November, Memorial Day the last Monday in May — and a
 * hardcoded table goes quietly wrong the year nobody updates it. A wrong
 * holiday date on a live listing sends customers to a closed shop.
 *
 * Two kinds are included, and the distinction is the point for this trade:
 *
 *  • Closures — days a shop is likely shut, where the risk is a customer
 *    turning up to a locked door.
 *  • Busy days — Mother's Day, Father's Day, the run-up to Christmas. Nobody
 *    closes for those; shops often open early or stay late, and Google shows
 *    the extended hours only if they're set.
 *
 * All dates are plain calendar dates in UTC. Google's specialHours takes
 * {year, month, day} with no timezone, so anything clever here would only
 * introduce off-by-one errors.
 */

export type HolidayKind = "closure" | "busy";

export interface Holiday {
  /** Stable id, e.g. "thanksgiving-2026". */
  id: string;
  name: string;
  kind: HolidayKind;
  /** ISO calendar date, YYYY-MM-DD. */
  date: string;
  year: number;
  month: number;
  day: number;
}

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Nth given weekday of a month. weekday: 0=Sunday. n is 1-based. */
function nthWeekday(year: number, month: number, weekday: number, n: number): number {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const offset = (weekday - first + 7) % 7;
  return 1 + offset + (n - 1) * 7;
}

/** Last given weekday of a month. */
function lastWeekday(year: number, month: number, weekday: number): number {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const last = new Date(Date.UTC(year, month - 1, daysInMonth)).getUTCDay();
  return daysInMonth - ((last - weekday + 7) % 7);
}

/**
 * Easter Sunday, by the anonymous Gregorian computus.
 *
 * Included because a good number of shops close for it, and it's the one date
 * here that can't be described in a sentence.
 */
export function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

const make = (id: string, name: string, kind: HolidayKind, y: number, m: number, d: number): Holiday => ({
  id: `${id}-${y}`, name, kind, date: iso(y, m, d), year: y, month: m, day: d,
});

/** Every tracked holiday in a calendar year, in date order. */
export function holidaysForYear(year: number): Holiday[] {
  const easter = easterSunday(year);

  const list: Holiday[] = [
    make("new-years-day", "New Year's Day", "closure", year, 1, 1),
    make("mlk-day", "Martin Luther King Jr. Day", "closure", year, 1, nthWeekday(year, 1, 1, 3)),
    make("presidents-day", "Presidents' Day", "closure", year, 2, nthWeekday(year, 2, 1, 3)),
    make("easter", "Easter Sunday", "closure", year, easter.month, easter.day),
    make("mothers-day", "Mother's Day", "busy", year, 5, nthWeekday(year, 5, 0, 2)),
    make("memorial-day", "Memorial Day", "closure", year, 5, lastWeekday(year, 5, 1)),
    make("fathers-day", "Father's Day", "busy", year, 6, nthWeekday(year, 6, 0, 3)),
    make("juneteenth", "Juneteenth", "closure", year, 6, 19),
    make("independence-day", "Independence Day", "closure", year, 7, 4),
    make("labor-day", "Labor Day", "closure", year, 9, nthWeekday(year, 9, 1, 1)),
    make("thanksgiving", "Thanksgiving", "closure", year, 11, nthWeekday(year, 11, 4, 4)),
    make("day-after-thanksgiving", "Day after Thanksgiving", "busy", year, 11, nthWeekday(year, 11, 4, 4) + 1),
    make("christmas-eve", "Christmas Eve", "busy", year, 12, 24),
    make("christmas-day", "Christmas Day", "closure", year, 12, 25),
    make("new-years-eve", "New Year's Eve", "busy", year, 12, 31),
  ];

  return list.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * The next holidays from a given date, spanning the year boundary.
 *
 * Includes today: a shop setting hours on Christmas Eve morning still needs
 * Christmas Eve in the list.
 */
export function upcomingHolidays(from: Date = new Date(), count = 8): Holiday[] {
  const today = `${from.getUTCFullYear()}-${String(from.getUTCMonth() + 1).padStart(2, "0")}-${String(from.getUTCDate()).padStart(2, "0")}`;
  const year = from.getUTCFullYear();
  return [...holidaysForYear(year), ...holidaysForYear(year + 1)]
    .filter((h) => h.date >= today)
    .slice(0, count);
}
