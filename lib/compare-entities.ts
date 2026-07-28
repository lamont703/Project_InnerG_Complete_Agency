import { parseWeeklyRent } from "@/lib/shop-ecosystem";

/**
 * Shared helpers for the two comparison tools (/compare-shops, /compare-schools).
 *
 * Both tools need the same two things the raw tables don't give us: a reliable
 * (city, state) pair to drill down on, and — for shops — a booth rent figure
 * that can actually be sorted against other shops.
 */

/**
 * Minimum 2026 test-takers before a school's pass rate is treated as a signal
 * rather than noise — one unlucky student can swing a cohort of three by 33
 * points. Lives here rather than in compare-schools-data because the client
 * table needs it at runtime and that module is server-only.
 */
export const MIN_SAMPLE = 5;

/** Strip a trailing ZIP mashed into a city value ("Houston 77069"). */
export function cleanCity(value: string | null | undefined): string | null {
  if (!value) return null;
  const t = String(value).replace(/\s*\d{5}(-\d{4})?\s*$/, "").trim();
  return t || null;
}

/**
 * Spelled-out state names, for addresses written "Houston, Texas 77077"
 * instead of "Houston, TX 77077". Without this the two-letter matcher would
 * read the tail of the word — "Texas 77077" yields a bogus state of "AS".
 */
const STATE_NAME_TO_ABBR: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", "district of columbia": "DC",
  florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY", "puerto rico": "PR",
};

/**
 * Derive (city, state) for an entity. The parsed address_* columns are
 * unreliable — address_city/address_state are 0% populated on salons — so
 * formatted_address is the fallback of record.
 */
export function deriveLocation(row: {
  address_city?: string | null;
  address_state?: string | null;
  city?: string | null;
  formatted_address?: string | null;
}): { city: string | null; state: string | null } {
  const parts = String(row.formatted_address || "")
    .replace(/,\s*(USA|United States)\s*$/i, "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  let parsedCity: string | null = null;
  let parsedState: string | null = null;
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    // \b matters: without it "Texas 77077" matches the trailing "as".
    const m = last.match(/\b([A-Za-z]{2})\s+\d{5}(?:-\d{4})?$/);
    const spelled = last.match(/^([A-Za-z][A-Za-z .]+?)\s+\d{5}(?:-\d{4})?$/);
    if (m) {
      parsedState = m[1].toUpperCase();
      parsedCity = cleanCity(parts[parts.length - 2]);
    } else if (spelled && STATE_NAME_TO_ABBR[spelled[1].trim().toLowerCase()]) {
      parsedState = STATE_NAME_TO_ABBR[spelled[1].trim().toLowerCase()];
      parsedCity = cleanCity(parts[parts.length - 2]);
    } else if (/^[A-Za-z]{2}$/.test(last)) {
      parsedState = last.toUpperCase();
      parsedCity = cleanCity(parts[parts.length - 2]);
    } else if (STATE_NAME_TO_ABBR[last.trim().toLowerCase()]) {
      parsedState = STATE_NAME_TO_ABBR[last.trim().toLowerCase()];
      parsedCity = cleanCity(parts[parts.length - 2]);
    } else {
      parsedCity = cleanCity(last);
    }
  }

  return {
    city: cleanCity(row.address_city) || parsedCity || cleanCity(row.city),
    state: (row.address_state || parsedState || null)?.toUpperCase() || null,
  };
}

export type RentKind = "booth" | "commission" | "unknown";

export interface NormalizedRent {
  /** Weekly dollar figure, normalized from whatever unit was recorded. */
  weekly: number | null;
  kind: RentKind;
  /** Commission split as written ("60/40"), when that's the arrangement. */
  commissionLabel: string | null;
  raw: string | null;
}

const WEEKS_PER_MONTH = 4.333;

/**
 * Booth rent is stored as free text ("150 week", "$1,200/month", "50/50",
 * "40% a week for 5 months, then $300 a week"), so a sortable comparison
 * needs it normalized to a weekly number plus the KIND of arrangement —
 * barbers weigh a commission split very differently from flat booth rent.
 */
export function normalizeRent(raw: string | null | undefined): NormalizedRent {
  if (!raw || !String(raw).trim()) {
    return { weekly: null, kind: "unknown", commissionLabel: null, raw: null };
  }
  const text = String(raw).trim();

  // Reuse the shared weekly parser first so this stays consistent with
  // /barber-booth-rent-houston, which already ships on that behavior.
  const weekly = parseWeeklyRent(text);
  if (weekly != null) {
    return { weekly, kind: "booth", commissionLabel: commissionOf(text), raw: text };
  }

  // Monthly — convert so it sorts against weekly figures.
  const monthly = text.match(/\$?\s?([\d,]{3,6})(?:\.\d{2})?\s*(?:\/|per\s+|a\s+)?\s*(?:month|mo\b|monthly)/i);
  if (monthly) {
    const amount = parseFloat(monthly[1].replace(/,/g, ""));
    if (!Number.isNaN(amount) && amount > 0) {
      return { weekly: Math.round(amount / WEEKS_PER_MONTH), kind: "booth", commissionLabel: commissionOf(text), raw: text };
    }
  }

  // Weekly forms the shared parser misses: a trailing dollar sign ("100$ each
  // week") or "each/every" as the connector. Kept local rather than widened in
  // parseWeeklyRent, which /barber-booth-rent-houston already ships on.
  const weeklyAlt = text.match(/\$?\s?(\d{2,4})(?:\.\d{2})?\s?\$?\s*(?:\/|per\s+|a\s+|each\s+|every\s+)?\s*(?:week|wk|weekly)\b/i);
  if (weeklyAlt) {
    const amount = parseFloat(weeklyAlt[1]);
    if (!Number.isNaN(amount) && amount > 0) {
      return { weekly: amount, kind: "booth", commissionLabel: commissionOf(text), raw: text };
    }
  }

  // Daily.
  const daily = text.match(/\$?\s?(\d{2,3})(?:\.\d{2})?\s*(?:\/|per\s+|a\s+)?\s*(?:day|daily)/i);
  if (daily) {
    const amount = parseFloat(daily[1]);
    if (!Number.isNaN(amount) && amount > 0) {
      return { weekly: Math.round(amount * 6), kind: "booth", commissionLabel: commissionOf(text), raw: text };
    }
  }

  const split = commissionOf(text);
  if (split) return { weekly: null, kind: "commission", commissionLabel: split, raw: text };

  return { weekly: null, kind: "unknown", commissionLabel: null, raw: text };
}

/** Pull a "60/40"-style split out of free text, ignoring date-like matches. */
function commissionOf(text: string): string | null {
  const m = text.match(/\b(\d{2})\s*\/\s*(\d{2})\b/);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  return a + b === 100 ? `${a}/${b}` : null;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

/**
 * Supabase caps a single select at 1000 rows. These tables run to ~2,700 each,
 * so every full-table read here must page explicitly or it silently truncates.
 */
export async function fetchAllRows<T>(
  build: () => any,
  pageSize = 1000
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) {
      console.error("fetchAllRows page error:", error);
      break;
    }
    if (!data?.length) break;
    out.push(...(data as T[]));
    if (data.length < pageSize) break;
  }
  return out;
}
