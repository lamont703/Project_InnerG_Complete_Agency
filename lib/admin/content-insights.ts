import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Platform, MetricKind } from "@/lib/content-metrics";

/**
 * Turning stored daily rows into the series the chart draws.
 *
 * TWO THINGS HERE ARE EASY TO GET WRONG AND BOTH PRODUCE A CONFIDENT WRONG CHART.
 *
 * 1. A LIFETIME TOTAL BELONGS TO THE DAY THE POST WENT OUT. Instagram and
 *    TikTok report a per-post total-since-publication and no daily series.
 *    An earlier version differenced consecutive readings to invent a daily
 *    figure, which was defensible and useless: it needs two collections before
 *    it can draw anything, so 10,983 real TikTok views and 576 Instagram views
 *    rendered as "cannot report". Those rows are now stamped with the post's
 *    OWN publish date, so one collection yields the full history the account
 *    has, and the series reads "reach earned by what we published then".
 *
 *    Only the NEWEST reading of a post counts. Re-collection refreshes the same
 *    row in place (the upsert key includes external_post_id), so duplicates
 *    should not exist — but a platform that renumbered an id, or a backfill run
 *    twice, would otherwise double a post's views into the same bucket.
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
  /**
   * Whether this series counts CONTENT or an ACCOUNT.
   *
   * "per_post" series (youtube, tiktok, instagram) are lifetime views of
   * individual posts, filed at the publish date. They are comparable to one
   * another and they are what the combined line adds up.
   *
   * "account" series (gbp, google) are whole-profile or whole-site impressions
   * per day. They are a different quantity entirely and are NEVER summed with
   * content reach — doing so was the bug that hid YouTube.
   */
  scope: "per_post" | "account";
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
  tiktok: "TikTok",
  // Retained for rows collected before TikTok was read directly.
  tiktok_ghl: "TikTok (via GoHighLevel)",
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
 * Collapse each post's readings to its newest one.
 *
 * Cumulative rows are already stamped with the post's publish date, so there is
 * nothing to difference — the job is only to make sure one post contributes one
 * number. The newest reading wins because a lifetime total only grows, and the
 * most recent collection is the closest to the truth.
 */
function latestPerPost(rows: Row[]): Row[] {
  const cumulative = rows.filter((r) => r.is_cumulative && r.value !== null);
  const rest = rows.filter((r) => !r.is_cumulative || r.value === null);

  const newest = new Map<string, Row>();
  for (const r of cumulative) {
    const key = `${r.platform}::${r.external_post_id}`;
    const prev = newest.get(key);
    if (!prev || r.captured_at > prev.captured_at) newest.set(key, r);
  }
  return [...rest, ...newest.values()];
}

export async function fetchContentInsights(
  granularity: Granularity = "day",
  days = 180
): Promise<InsightsData> {
  const admin = createAdminClient() as any;
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  /*
   * PAGED, BECAUSE POSTGREST CAPS A SELECT AT 1,000 ROWS AND SAYS NOTHING.
   * This table is one row per platform per day per post and passed 1,900 rows
   * on its first backfill, so an unpaged read returned the OLDEST thousand and
   * silently dropped everything recent — the chart stopped in May with August
   * data sitting in the table, and Instagram vanished entirely because all of
   * its rows are recent. A truncated read looks exactly like a quiet period.
   */
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("content_metrics_daily")
      .select("platform, metric_date, external_post_id, value, metric_kind, is_cumulative, unavailable_reason, captured_at")
      .gte("metric_date", since)
      .order("metric_date", { ascending: true })
      .range(from, from + 999);
    if (error || !data?.length) break;
    rows.push(...(data as Row[]));
    if (data.length < 1000) break;
  }
  const usable = latestPerPost(rows);

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
   * A cumulative platform with no readings at all still has to appear. It no
   * longer needs two collections to draw — one is enough now that rows carry
   * the publish date — but a platform silently absent from the page reads as
   * "we posted nothing there", which is the misreading this file exists to
   * prevent.
   */
  const cumulativePlatforms = new Set<Platform>();
  for (const r of rows) if (r.is_cumulative) cumulativePlatforms.add(r.platform);

  /*
   * A platform is per-post if any of its rows carries a post id. gbp and
   * google report for the whole location or the whole site, so their rows have
   * an empty external_post_id and they can never join the content total.
   */
  const perPostPlatforms = new Set<Platform>();
  for (const r of rows) if (r.external_post_id) perPostPlatforms.add(r.platform);

  const platforms = [...new Set([
    ...usable.map((r) => r.platform),
    ...reasons.keys(),
    ...cumulativePlatforms,
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
      scope: perPostPlatforms.has(p) ? "per_post" : "account",
      unavailableReason: total === 0 ? reasons.get(p) : undefined,
    });
  }

  series.sort((a, b) => b.total - a.total);

  /*
   * THE COMBINED LINE IS CONTENT REACH ONLY — the per-post platforms.
   *
   * It used to be "everything except google", which quietly added Google
   * Business Profile impressions to video views and, worse, compared a YouTube
   * column holding a few days of activity against TikTok and Instagram columns
   * holding lifetime totals. That is how a channel doing 395,192 views appeared
   * to be losing to one doing 10,990.
   *
   * gbp and google are still charted, still toggleable, and still excluded
   * here. A profile impression and a video view are not the same event and
   * adding them produces a number nobody measured.
   */
  const contributing = series.filter((s) => s.scope === "per_post");
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
