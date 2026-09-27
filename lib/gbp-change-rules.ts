/**
 * The pure half of drafting a Google Business Profile change from Claude.
 *
 * Everything here turns what a model sent into what the write layer accepts,
 * or refuses it with a sentence the model can repeat to the owner. No network,
 * no database, so each rule is tested on its own in gbp-change-rules.test.ts.
 *
 * WHY THE INPUTS ARE LOOSE AND THE OUTPUTS ARE NOT. A model will send "9am",
 * "monday", "gcid:barber_shop" and "barber_shop" for the same things a form
 * would have sent in one exact shape. Accepting the obvious spellings is
 * cheaper than a round trip; accepting anything ambiguous is how a Sunday
 * closing lands on a Monday. So each normaliser takes the spellings that can
 * only mean one thing and refuses the rest by name.
 */

import { parseTime, type RegularPeriod, type TimeOfDay } from "@/lib/gbp-special-hours";

export const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
export type Day = (typeof DAYS)[number];

/** "monday", "Mon", "MONDAY" → "MONDAY". Anything else → null. */
export function normaliseDay(raw: unknown): Day | null {
  const t = String(raw ?? "").trim().toUpperCase();
  if (!t) return null;
  return DAYS.find((d) => d === t || (t.length >= 3 && d.startsWith(t))) ?? null;
}

/**
 * "09:00", "9:00", "9am", "5:30 pm", "17:30" → Google's TimeOfDay.
 *
 * A bare "9" is refused: nine in the morning or nine at night is exactly the
 * guess this function exists not to make.
 */
export function normaliseTime(raw: unknown): TimeOfDay | null {
  const t = String(raw ?? "").trim().toLowerCase().replace(/\s+/g, "");
  const ampm = /^(\d{1,2})(?::(\d{2}))?(am|pm)$/.exec(t);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = Number(ampm[2] ?? 0);
    if (h < 1 || h > 12 || m > 59) return null;
    if (ampm[3] === "am" && h === 12) h = 0;
    if (ampm[3] === "pm" && h !== 12) h += 12;
    return m ? { hours: h, minutes: m } : { hours: h };
  }
  return parseTime(t) ?? null;
}

const minutesOf = (t: TimeOfDay) => (t.hours ?? 0) * 60 + (t.minutes ?? 0);

export const formatClock = (t?: TimeOfDay): string => {
  if (!t) return "";
  const h = t.hours ?? 0;
  const m = t.minutes ?? 0;
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${suffix}` : `${h12}${suffix}`;
};

export interface RegularHoursInput {
  day: unknown;
  closed?: unknown;
  open?: unknown;
  close?: unknown;
}

/**
 * Replace the hours for the days named, and leave every other day exactly as
 * Google has it.
 *
 * regularHours is replaced WHOLESALE by a patch, like serviceItems. "Change
 * Saturday to 10 to 4" sent as one period would delete Monday through Friday.
 * So this always starts from the current periods and swaps only the days the
 * owner mentioned. Several entries for one day are a split shift.
 *
 * Overnight hours (close before open) are refused rather than guessed at: a
 * period that closes the next day needs closeDay set, and a model sending
 * "10pm to 2am" for a barbershop is more likely a typo than a late shop.
 */
export function mergeRegularHours(
  current: RegularPeriod[],
  input: RegularHoursInput[]
): { ok: true; periods: RegularPeriod[]; days: Day[] } | { ok: false; message: string } {
  if (!Array.isArray(input) || !input.length) return { ok: false, message: "Say which days to change." };

  const touched = new Set<Day>();
  const added: RegularPeriod[] = [];

  for (const row of input) {
    const day = normaliseDay(row?.day);
    if (!day) return { ok: false, message: `"${String(row?.day ?? "")}" is not a day of the week.` };
    touched.add(day);

    if (row.closed === true) continue;

    const open = normaliseTime(row.open);
    const close = normaliseTime(row.close);
    if (!open || !close) {
      return {
        ok: false,
        message: `${day}: give both an opening and a closing time like "9:00am" and "6:00pm", or say the day is closed.`,
      };
    }
    if (minutesOf(close) <= minutesOf(open)) {
      return {
        ok: false,
        message: `${day}: closing (${formatClock(close)}) is not after opening (${formatClock(open)}). Overnight hours are not supported here.`,
      };
    }
    added.push({ openDay: day, openTime: open, closeDay: day, closeTime: close });
  }

  // A day marked closed that also got hours in the same request is a
  // contradiction, not a split shift.
  for (const row of input) {
    const day = normaliseDay(row?.day)!;
    if (row.closed === true && added.some((p) => p.openDay === day)) {
      return { ok: false, message: `${day} is marked both closed and open. Pick one.` };
    }
  }

  const kept = current.filter((p) => !touched.has(p.openDay as Day));
  const order = (p: RegularPeriod) => DAYS.indexOf(p.openDay as Day) * 1440 + minutesOf(p.openTime || {});
  return { ok: true, periods: [...kept, ...added].sort((a, b) => order(a) - order(b)), days: [...touched] };
}

/** One line per day, in week order, for showing the owner what they are approving. */
export function describeWeek(periods: RegularPeriod[]): string[] {
  return DAYS.map((day) => {
    const today = periods.filter((p) => p.openDay === day);
    if (!today.length) return `${day[0]}${day.slice(1).toLowerCase()}: closed`;
    const ranges = today.map((p) => `${formatClock(p.openTime)}–${formatClock(p.closeTime)}`).join(", ");
    return `${day[0]}${day.slice(1).toLowerCase()}: ${ranges}`;
  });
}

/**
 * "gcid:barber_shop", "categories/gcid:barber_shop" and "barber_shop" all name
 * one category. Google's resource name is the second.
 */
export function normaliseCategoryName(raw: unknown): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  if (/^categories\/gcid:[a-z0-9_]+$/i.test(t)) return t;
  if (/^gcid:[a-z0-9_]+$/i.test(t)) return `categories/${t}`;
  if (/^[a-z0-9_]+$/i.test(t)) return `categories/gcid:${t}`;
  return null;
}

/**
 * The attribute id Google uses: "attributes/has_wheelchair_accessible_entrance".
 * The bare "has_wheelchair_accessible_entrance" is accepted too.
 */
export function normaliseAttributeName(raw: unknown): string | null {
  const t = String(raw ?? "").trim();
  if (/^attributes\/[a-z0-9_]+$/i.test(t)) return t;
  if (/^[a-z0-9_]+$/i.test(t)) return `attributes/${t}`;
  return null;
}

/**
 * A review, post or photo id the model copied from one of our read tools, made
 * into a full resource name — and refused if it names some other listing.
 *
 * The ownership check is the point. Without it, a crafted id reaches a write
 * against a listing this owner does not manage, and Google would accept it for
 * any listing the stored token can reach.
 */
export function resourceUnderLocation(args: {
  raw: unknown;
  accountName: string;
  locationName: string;
  collection: "reviews" | "media" | "localPosts";
}): string | null {
  const t = String(args.raw ?? "").trim();
  if (!t) return null;
  const parent = `${args.accountName}/${args.locationName}/${args.collection}/`;
  if (t.includes("/")) return t.startsWith(parent) && /^[^/]+$/.test(t.slice(parent.length)) ? t : null;
  return /^[A-Za-z0-9_-]+$/.test(t) ? `${parent}${t}` : null;
}

/** YYYY-MM-DD that is a real calendar date. */
export function isIsoDate(raw: unknown): raw is string {
  const t = String(raw ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  const d = new Date(`${t}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === t;
}
