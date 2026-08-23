import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Platform, MetricKind } from "@/lib/content-metrics";

/**
 * Turning stored daily rows into the series the chart draws.
 *
 * TWO THINGS HERE ARE EASY TO GET WRONG AND BOTH PRODUCE A CONFIDENT WRONG CHART.
 *
 * 1. CUMULATIVE SERIES MUST BE DIFFERENCED. Instagram only reports a media's
 *    lifetime views, so the stored value rises every day even when nobody
 *    watched. Summing those rows draws a line that can only go up and that
 *    counts every view again on every later day. Each post's series is
 *    differenced against its own previous reading first.
 *
 * 2. A MISSING DAY IS NOT A ZERO. If a collector did not run, the honest
 *    picture is a gap. Filling it with 0 invents a crash; carrying the last
 *    value forward invents stability. The buckets below only contain days we
 *    actually have rows for.
 */

export type Granularity = "day" | "week" | "month";

export interface PlatformSeries {
  platform: Platform;
  label: string;
  metricKind: MetricKind;
  /** Null where the platform reported nothing that period — drawn as a gap. */
  points: (number | null)[];
  total: number;
  /** Set when the platform cannot report at all; the page explains instead of charting. */
  unavailableReason?: string;
}

export interface InsightsData {
  buckets: string[];
  series: PlatformSeries[];
  totals: { platform: Platform; label: string; total: number; metricKind: MetricKind }[];
  aggregate: (number | null)[];
  aggregateTotal: number;
  granularity: Granularity;
  days: number;
  lastCollectedAt: string | null;
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  youtube: "YouTube Shorts",
  instagram: "Instagram Reels",
  gbp: "Google Business Profile",
  google: "Google Search",
  linkedin: "LinkedIn",
  tiktok_ghl: "TikTok",
  x: "X",
};

/** Monday-based ISO week start, so week buckets do not drift by locale. */
function weekStart(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function bucketOf(iso: string, g: Granularity): string {
  if (g === "day") return iso;
  if (g === "week") return weekStart(iso);
  return iso.slice(0, 7) + "-01";
}

interface Row {
  platform: Platform;
  metric_date: string;
  external_post_id: string;
  value: number | null;
  metric_kind: MetricKind;
  is_cumulative: boolean;
  unavailable_reason: string | null;
  captured_at: string;
}

/**
 * Recover per-day activity from lifetime snapshots, per post.
 *
 * The first reading of a post has no predecessor. It is dropped rather than
 * counted in full, because a Reel's lifetime total on the day we first ask is
 * mostly views it earned before we started collecting — attributing all of them
 * to that one day puts a spike in the chart on the day the collector was
 * switched on, which is an artefact of us, not of the audience.
 */
function differenceCumulative(rows: Row[]): Row[] {
  const cumulative = rows.filter((r) => r.is_cumulative && r.value !== null);
  const rest = rows.filter((r) => !r.is_cumulative || r.value === null);

  const byPost = new Map<string, Row[]>();
  for (const r of cumulative) {
    const key = `${r.platform}::${r.external_post_id}`;
    if (!byPost.has(key)) byPost.set(key, []);
    byPost.get(key)!.push(r);
  }

  const out: Row[] = [...rest];
  for (const series of byPost.values()) {
    series.sort((a, b) => a.metric_date.localeCompare(b.metric_date));
    for (let i = 1; i < series.length; i++) {
      const delta = (series[i].value ?? 0) - (series[i - 1].value ?? 0);
      // A negative delta means the platform revised the total down. Clamp to 0
      // rather than subtracting from another post's genuine views.
      out.push({ ...series[i], value: Math.max(0, delta) });
    }
  }
  return out;
}

export async function fetchContentInsights(
  granularity: Granularity = "day",
  days = 90
): Promise<InsightsData> {
  const admin = createAdminClient() as any;
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const { data } = await admin
    .from("content_metrics_daily")
    .select("platform, metric_date, external_post_id, value, metric_kind, is_cumulative, unavailable_reason, captured_at")
    .gte("metric_date", since)
    .order("metric_date", { ascending: true });

  const rows: Row[] = (data ?? []) as Row[];
  const usable = differenceCumulative(rows);

  const bucketSet = new Set<string>();
  for (const r of usable) if (r.value !== null) bucketSet.add(bucketOf(r.metric_date, granularity));
  const buckets = [...bucketSet].sort();
  const index = new Map(buckets.map((b, i) => [b, i]));

  // Why a platform cannot report — the newest explanation wins, since a token
  // that was fixed yesterday should not keep showing last week's failure.
  const reasons = new Map<Platform, string>();
  for (const r of rows) {
    if (r.unavailable_reason && r.value === null) reasons.set(r.platform, r.unavailable_reason);
  }

  /*
   * A CUMULATIVE PLATFORM WITH ONLY ONE READING HAS TO SAY SO.
   *
   * Instagram's first snapshot is dropped by differenceCumulative — the lifetime
   * total on the day collection started is mostly views earned before we were
   * watching. That is right, but it left Instagram absent from `usable`
   * entirely, so it disappeared from the page rather than showing zero. A
   * platform vanishing reads as "we posted nothing there", which is the exact
   * misreading this file is built to prevent, so it is given a reason instead.
   */
  const cumulativeReadingDays = new Map<Platform, Set<string>>();
  for (const r of rows) {
    if (!r.is_cumulative || r.value === null) continue;
    if (!cumulativeReadingDays.has(r.platform)) cumulativeReadingDays.set(r.platform, new Set());
    cumulativeReadingDays.get(r.platform)!.add(r.metric_date);
  }
  for (const [p, days] of cumulativeReadingDays) {
    if (days.size < 2 && !reasons.has(p)) {
      reasons.set(
        p,
        `${PLATFORM_LABELS[p] ?? p} reports a lifetime total only, so a daily figure needs two readings — ` +
          `there has been ${days.size === 1 ? "one so far" : "none yet"}. The next collection produces the first point.`
      );
    }
  }

  const platforms = [...new Set([
    ...usable.map((r) => r.platform),
    ...reasons.keys(),
    ...cumulativeReadingDays.keys(),
  ])];
  const series: PlatformSeries[] = [];

  for (const p of platforms) {
    const points: (number | null)[] = new Array(buckets.length).fill(null);
    let total = 0;
    let kind: MetricKind = "none";

    for (const r of usable) {
      if (r.platform !== p || r.value === null) continue;
      const i = index.get(bucketOf(r.metric_date, granularity));
      if (i === undefined) continue;
      points[i] = (points[i] ?? 0) + r.value;
      total += r.value;
      if (r.metric_kind !== "none") kind = r.metric_kind;
    }

    series.push({
      platform: p,
      label: PLATFORM_LABELS[p] ?? p,
      metricKind: kind,
      points,
      total,
      unavailableReason: total === 0 ? reasons.get(p) : undefined,
    });
  }

  series.sort((a, b) => b.total - a.total);

  /*
   * THE AGGREGATE DELIBERATELY EXCLUDES GOOGLE SEARCH. It counts the whole
   * site, not the content this publisher posted, and at ~9,000 impressions a
   * day against a few hundred views it would BE the total line — every social
   * platform would flatten onto the axis and the chart would answer a question
   * nobody asked. It stays available as its own toggle.
   */
  const contributing = series.filter((s) => s.platform !== "google");
  const aggregate = buckets.map((_, i) => {
    const vals = contributing.map((s) => s.points[i]).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  });

  const captured = rows.map((r) => r.captured_at).filter(Boolean).sort();

  return {
    buckets,
    series,
    totals: series.map((s) => ({ platform: s.platform, label: s.label, total: s.total, metricKind: s.metricKind })),
    aggregate,
    aggregateTotal: contributing.reduce((a, s) => a + s.total, 0),
    granularity,
    days,
    lastCollectedAt: captured.length ? captured[captured.length - 1] : null,
  };
}
