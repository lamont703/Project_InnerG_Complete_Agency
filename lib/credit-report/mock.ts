import type { Tradeline, PaymentMonth, PaymentStatus } from "./model";

/**
 * INVENTED DATA. Nobody named here exists and no payment below happened.
 *
 * The subject is deliberately not spotless. A mock where everything is on time
 * proves the layout renders and nothing else — the hard question this product
 * has to answer is what a shop should do with a record that has a rough patch
 * in it, and a demo that never shows one quietly ducks it.
 *
 * So: three years, three shops, and a cluster of late months that lines up with
 * a shop change. That is the most common real shape and the one most likely to
 * be misread as unreliability.
 */
function months(spec: Array<[string, PaymentStatus, number | null]>, amount: number): PaymentMonth[] {
  return spec.map(([month, status, daysLate]) => ({ month, status, daysLate, amount }));
}

const seq = (start: string, count: number): string[] => {
  const [y0, m0] = start.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const m = m0 + i;
    const y = y0 + Math.floor((m - 1) / 12);
    return `${y}-${String(((m - 1) % 12) + 1).padStart(2, "0")}`;
  });
};

const clean = (start: string, count: number, amount: number): PaymentMonth[] =>
  months(seq(start, count).map((m) => [m, "on_time", null] as [string, PaymentStatus, null]), amount);

export const MOCK_TRADELINES: Tradeline[] = [
  {
    shopName: "Fade Republic",
    shopSlug: null,
    city: "Houston, TX",
    rentPerWeek: 175,
    startedAt: "2026-01",
    endedAt: null,
    months: clean("2026-01", 8, 700),
  },
  {
    shopName: "Kings & Queens Barber & Hair",
    shopSlug: null,
    city: "Houston, TX",
    rentPerWeek: 165,
    startedAt: "2025-02",
    endedAt: "2025-12",
    months: [
      ...clean("2025-02", 7, 660),
      // The rough patch, and it has a cause: the shop was closing.
      ...months(
        [
          ["2025-09", "late", 6],
          ["2025-10", "late", 11],
          ["2025-11", "late", 4],
        ],
        660,
      ),
      ...clean("2025-12", 1, 660),
    ],
  },
  {
    shopName: "Southside Cuts",
    shopSlug: null,
    city: "Houston, TX",
    rentPerWeek: 150,
    startedAt: "2024-03",
    endedAt: "2025-01",
    months: clean("2024-03", 11, 600),
  },
];

export const MOCK_SUBJECT = {
  name: "Marcus Webb",
  handle: "@marcuswebbcuts",
  licenceType: "Class A Barber",
  licenceState: "TX",
  memberSince: "March 2024",
};
