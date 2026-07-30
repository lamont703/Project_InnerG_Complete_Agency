/**
 * Date-window resolution for the SEO keyword tracker.
 *
 * Kept as a pure function separate from the fetching in gsc-performance.ts for
 * two reasons: the clamping rules are the fiddly part and deserve tests, and the
 * resolved window is what both the query and the UI labels are built from, so
 * they can't disagree about which range is being shown.
 *
 * Two Search Console limits drive everything here:
 *
 *   • Data lags ~2 days. Asking for yesterday returns zeroes, which reads as "we
 *     lost all our traffic" rather than "that data doesn't exist yet" — so the
 *     latest selectable day is today − 2, and a later request is clamped rather
 *     than passed through.
 *   • History stops at ~16 months. Beyond that the API returns an empty row set
 *     with no error, which would silently look like a site with no history.
 */

const DAY = 86_400_000;

/** Search Console's reporting lag, in days. */
export const GSC_LAG_DAYS = 2;

/** Roughly 16 months — the API's retention limit. */
export const GSC_MAX_HISTORY_DAYS = 480;

export interface GscPreset {
  key: string;
  label: string;
  days: number;
}

/**
 * Offered as one-click windows. 7/28 mirror Search Console's own defaults; the
 * longer ones exist because most of this catalog is new content where a 28-day
 * window shows too little to judge anything.
 */
export const GSC_PRESETS: GscPreset[] = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "28d", label: "Last 28 days", days: 28 },
  { key: "90d", label: "Last 3 months", days: 90 },
  { key: "180d", label: "Last 6 months", days: 180 },
  { key: "365d", label: "Last 12 months", days: 365 },
  { key: "480d", label: "Last 16 months", days: 480 },
];

export const GSC_DEFAULT_PRESET = "28d";

export interface GscWindow {
  /** YYYY-MM-DD, inclusive. */
  start: string;
  /** YYYY-MM-DD, inclusive. */
  end: string;
  /** Preset key, or "custom" when explicit dates were given. */
  preset: string;
  /** For the banner and the impressions/clicks tile labels. */
  label: string;
  /** Inclusive day count. */
  days: number;
  /** Set when the requested range had to be adjusted — surfaced in the UI so a
   *  clamped window never masquerades as the one that was asked for. */
  notice?: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Midnight UTC of the given instant, so day arithmetic can't drift by timezone. */
const floorDay = (d: Date) => new Date(Math.floor(d.getTime() / DAY) * DAY);

/**
 * Strict YYYY-MM-DD parse. Returns null for anything else, including dates that
 * look valid but roll over (2026-02-31), which the Date constructor would
 * otherwise silently accept as March 3rd.
 */
function parseIsoDate(value?: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  if (iso(d) !== value) return null;
  return d;
}

/** The most recent day Search Console will have data for. */
export function latestAvailableDay(now: Date = new Date()): Date {
  return new Date(floorDay(now).getTime() - GSC_LAG_DAYS * DAY);
}

/** The oldest day Search Console still retains. */
export function earliestAvailableDay(now: Date = new Date()): Date {
  return new Date(latestAvailableDay(now).getTime() - GSC_MAX_HISTORY_DAYS * DAY);
}

function presetWindow(preset: GscPreset, now: Date): GscWindow {
  const latest = latestAvailableDay(now);
  const earliest = earliestAvailableDay(now);
  let start = new Date(latest.getTime() - (preset.days - 1) * DAY);
  if (start < earliest) start = earliest;
  return {
    start: iso(start),
    end: iso(latest),
    preset: preset.key,
    label: preset.label,
    days: Math.round((latest.getTime() - start.getTime()) / DAY) + 1,
  };
}

/**
 * Turn URL params into the window to query and label.
 *
 * Precedence: explicit start+end (custom) → named preset → 28-day default. An
 * unparseable or impossible range falls back to the default rather than erroring,
 * because this drives a page render — but it always says why via `notice`.
 *
 * `now` is injectable so the clamping rules can be tested against fixed dates.
 */
export function resolveGscWindow(
  params: { preset?: string | null; start?: string | null; end?: string | null },
  now: Date = new Date()
): GscWindow {
  const latest = latestAvailableDay(now);
  const earliest = earliestAvailableDay(now);
  const fallback = () =>
    presetWindow(GSC_PRESETS.find((p) => p.key === GSC_DEFAULT_PRESET)!, now);

  const askedCustom = !!(params.start || params.end);

  if (askedCustom) {
    const a = parseIsoDate(params.start);
    const b = parseIsoDate(params.end);

    if (!a || !b) {
      return {
        ...fallback(),
        notice: "Both a start and end date (YYYY-MM-DD) are needed for a custom range — showing the last 28 days instead.",
      };
    }

    const notices: string[] = [];

    // Reversed range: honour the intent rather than returning nothing.
    let [from, to] = a <= b ? [a, b] : [b, a];
    if (a > b) notices.push("start and end were reversed, so they've been swapped");

    if (to > latest) {
      to = latest;
      notices.push(`end date clamped to ${iso(latest)} — Search Console data lags about ${GSC_LAG_DAYS} days`);
    }
    if (from < earliest) {
      from = earliest;
      notices.push(`start date clamped to ${iso(earliest)} — Search Console only retains about 16 months`);
    }
    // Both dates in the future collapse to a single day once clamped.
    if (from > to) {
      from = to;
      notices.push("range was entirely in the future, so it's been reduced to the latest available day");
    }

    return {
      start: iso(from),
      end: iso(to),
      preset: "custom",
      label: `${iso(from)} → ${iso(to)}`,
      days: Math.round((to.getTime() - from.getTime()) / DAY) + 1,
      notice: notices.length ? `Adjusted: ${notices.join("; ")}.` : undefined,
    };
  }

  if (params.preset) {
    const hit = GSC_PRESETS.find((p) => p.key === params.preset);
    if (hit) return presetWindow(hit, now);
    return {
      ...fallback(),
      notice: `Unknown range "${params.preset}" — showing the last 28 days instead.`,
    };
  }

  return fallback();
}

/** Short form for tile labels: "28d", "3mo". */
export function windowShortLabel(win: GscWindow): string {
  if (win.days <= 60) return `${win.days}d`;
  const months = Math.round(win.days / 30);
  return `${months}mo`;
}
