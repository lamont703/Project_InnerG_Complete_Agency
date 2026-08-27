import type { Tradeline, PaymentWeek, PaymentStatus } from "./model";

/**
 * INVENTED DATA. Nobody named here exists and no payment below happened.
 *
 * Written to contain every shape a shop owner has to interpret, because a demo
 * where every week is clean proves the layout renders and ducks the question
 * the product exists to answer:
 *
 *   - a run of on-time weeks (the ordinary case)
 *   - excused weeks for a holiday and a week the shop was shut
 *   - a caught-up week, paid double the following Monday
 *   - a cluster of late weeks that lines up with a shop closing
 *
 * That last one is the shape most likely to be misread as unreliability, and
 * the one a score alone will always get wrong.
 */

/** Monday-dated weeks, counting forward from a start. */
function weeksFrom(start: string, count: number): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < count; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return out;
}

function build(
  start: string,
  count: number,
  amount: number,
  overrides: Record<number, [PaymentStatus, number | null, string | null]> = {},
): PaymentWeek[] {
  return weeksFrom(start, count).map((weekStart, i) => {
    const o = overrides[i];
    return o
      ? { weekStart, status: o[0], daysLate: o[1], amount: o[0] === "excused" ? null : amount, note: o[2] }
      : { weekStart, status: "on_time" as const, daysLate: null, amount, note: null };
  });
}

export const MOCK_TRADELINES: Tradeline[] = [
  {
    shopName: "Fade Republic",
    shopSlug: null,
    city: "Houston, TX",
    rentPerWeek: 175,
    dueDay: "Monday",
    startedAt: "2026-01-05",
    endedAt: null,
    weeks: build("2026-01-05", 34, 175, {
      11: ["excused", null, "Shop closed — Easter week"],
      19: ["caught_up", 7, "Paid double the following Monday"],
      27: ["excused", null, "Agreed week off"],
      28: ["excused", null, "Agreed week off"],
    }),
  },
  {
    shopName: "Kings & Queens Barber & Hair",
    shopSlug: null,
    city: "Houston, TX",
    rentPerWeek: 165,
    dueDay: "Monday",
    startedAt: "2025-01-06",
    endedAt: "2025-12-29",
    weeks: build("2025-01-06", 51, 165, {
      // The rough patch. The shop was winding down and the chairs emptied out.
      33: ["late", 3, null],
      34: ["late", 5, null],
      35: ["late", 2, null],
      36: ["missed", null, "Shop announced closure"],
      37: ["late", 4, null],
      20: ["excused", null, "Sick leave"],
      21: ["excused", null, "Sick leave"],
    }),
  },
  {
    shopName: "Southside Cuts",
    shopSlug: null,
    city: "Houston, TX",
    rentPerWeek: 150,
    dueDay: "Friday",
    startedAt: "2024-03-04",
    endedAt: "2024-12-30",
    weeks: build("2024-03-04", 44, 150, {
      8: ["late", 1, null],
      30: ["excused", null, "Holiday"],
      31: ["excused", null, "Holiday"],
    }),
  },
];

export const MOCK_SUBJECT = {
  name: "Marcus Webb",
  handle: "@marcuswebbcuts",
  licenceType: "Class A Barber",
  licenceState: "TX",
  memberSince: "March 2024",
};
