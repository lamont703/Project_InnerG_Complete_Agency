/**
 * Rent weeks as dates.
 *
 * PURE, AND UTC THROUGHOUT. Everything here builds Date objects from
 * "YYYY-MM-DD" with an explicit T00:00:00Z, because the alternative bites in a
 * way that is invisible in testing and wrong in production: `new Date("2026-03-02")`
 * is parsed as UTC midnight, but `new Date(2026, 2, 2)` is LOCAL midnight, and
 * a shop in Houston generating week labels would land on the previous Sunday
 * for half the year. A payment grid that is off by one day is off by one WEEK,
 * and it would silently blame somebody for a week they paid.
 */

const DAY_MS = 86_400_000;

/** "2026-03-04" -> "2026-03-02" (the Monday of that week). */
export function mondayOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  // getUTCDay: 0 = Sunday. Monday-based offset, with Sunday belonging to the
  // week that started six days earlier rather than the one starting tomorrow.
  const offset = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - offset * DAY_MS).toISOString().slice(0, 10);
}

export function addWeeks(iso: string, n: number): string {
  return new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 7 * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Every rent week from `startIso` to `endIso` inclusive, newest first.
 *
 * NEWEST FIRST because that is the order an owner works in: they are correcting
 * last month far more often than they are correcting last year, and making them
 * scroll past two years of history to reach this week is how a correction tool
 * stops being used.
 *
 * `cap` is a guard rather than a feature — a corrupt or mistyped start date
 * ("1970-01-01" from an empty field) would otherwise try to render 2,900 rows
 * and hang the browser.
 */
export function weeksBetween(startIso: string, endIso: string, cap = 260): string[] {
  const first = mondayOf(startIso);
  const last = mondayOf(endIso);
  if (new Date(`${first}T00:00:00Z`) > new Date(`${last}T00:00:00Z`)) return [];

  const out: string[] = [];
  let cursor = last;
  while (out.length < cap) {
    out.push(cursor);
    if (cursor === first) break;
    const prev = addWeeks(cursor, -1);
    if (new Date(`${prev}T00:00:00Z`) < new Date(`${first}T00:00:00Z`)) break;
    cursor = prev;
  }
  return out;
}

/** "Mar 2 2026" — short enough to sit in a table row. */
export function weekLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
