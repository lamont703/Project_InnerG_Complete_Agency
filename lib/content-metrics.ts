import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Collecting how the published content actually performed.
 *
 * EVERY CAPABILITY BELOW WAS ESTABLISHED BY CALLING THE API, not by reading a
 * doc, because the docs and the reality disagree on the one metric this page is
 * named after:
 *
 *   YouTube Analytics  metrics=impressions -> 400 "Unknown identifier
 *                      (impressions) given in field parameters.metrics."
 *   Instagram          metric=impressions  -> 400 "The Media Insights API does
 *                      not support the impressions metric for this media
 *                      product type."
 *
 * Both platforms retired impressions in favour of VIEWS. Only Google Business
 * Profile and Search Console still report a true impression. That is why every
 * row carries metric_kind and why the page never adds views to impressions and
 * calls the result "impressions" — the total would be a number nobody measured.
 *
 * WHAT EACH PLATFORM CAN AND CANNOT DO
 *
 *   youtube     views, per video, per day        YouTube Analytics API
 *   instagram   views + reach, per media, LIFETIME ONLY
 *   gbp         impressions, per location, per day (no per-post breakdown)
 *   google      impressions, per site, per day    Search Console
 *   linkedin    NOTHING — 403 ACCESS_DENIED on socialActions
 *   tiktok_ghl  likes/shares/comments, NO view count
 *
 * A PLATFORM THAT CANNOT REPORT WRITES A ROW SAYING SO. It does not write a
 * zero and it does not write nothing. A zero draws a flat line along the bottom
 * of the chart that reads as "we got no views", which is a different and much
 * more damaging claim than "this platform will not tell us". unavailable_reason
 * carries the API's own words so the page can show them.
 */

export type Platform = "youtube" | "instagram" | "gbp" | "linkedin" | "tiktok_ghl" | "x" | "google";
export type MetricKind = "impressions" | "views" | "reach" | "none";

export interface MetricRow {
  platform: Platform;
  metric_date: string;
  external_post_id: string;
  queue_item_id?: string | null;
  value: number | null;
  metric_kind: MetricKind;
  is_cumulative?: boolean;
  reach?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  unavailable_reason?: string | null;
}

/** YYYY-MM-DD in UTC. */
export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * The window to collect.
 *
 * Deliberately re-reads several days rather than only yesterday. YouTube
 * Analytics revises recent days for up to about 72 hours, so a single-day
 * collector permanently stores the first, lowest number it ever saw. The upsert
 * is keyed on (platform, metric_date, external_post_id), so re-reading corrects
 * the row in place instead of duplicating it.
 */
export function collectionWindow(days = 5): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  return { start: isoDay(start), end: isoDay(end) };
}

/* ------------------------------------------------------------------ YouTube */

async function youtubeToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID!,
    client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN!,
    grant_type: "refresh_token",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body });
  const j = await r.json();
  if (!j.access_token) throw new Error(`youtube token: ${j.error_description || j.error || "no access_token"}`);
  return j.access_token as string;
}

/**
 * Views per video per day.
 *
 * ONE CALL PER DAY WITH dimensions=video, rather than one call per video with
 * dimensions=day. The second shape looks more natural and returns an empty row
 * set — `dimensions=day&filters=video==ID` answered 200 with zero rows against
 * a video the channel definitely owns. Asking for every video on a single day
 * gives the same information in far fewer calls and actually returns data.
 */
export async function collectYouTube(days: number): Promise<MetricRow[]> {
  const token = await youtubeToken();
  const out: MetricRow[] = [];

  for (let i = 1; i <= days; i++) {
    const day = isoDay(new Date(Date.now() - i * 86400000));
    const url =
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE` +
      `&startDate=${day}&endDate=${day}&metrics=views&dimensions=video&sort=-views&maxResults=200`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      out.push({
        platform: "youtube", metric_date: day, external_post_id: "", value: null,
        metric_kind: "none", unavailable_reason: j?.error?.message?.slice(0, 300) || `HTTP ${r.status}`,
      });
      continue;
    }
    for (const [videoId, views] of (j.rows ?? []) as [string, number][]) {
      out.push({
        platform: "youtube", metric_date: day, external_post_id: videoId,
        value: Number(views) || 0, metric_kind: "views",
      });
    }
  }
  return out;
}

/* ---------------------------------------------------------------- Instagram */

/**
 * Views and reach per Reel — LIFETIME, not daily.
 *
 * The Graph API gives a media's total since it was posted and offers no way to
 * ask "how many yesterday". So the row is stamped with today's date and marked
 * is_cumulative, and the page differences consecutive days to recover a daily
 * figure. Storing it without that flag and summing would re-count every past
 * view every day and draw a line that can only rise.
 */
export async function collectInstagram(mediaIds: string[]): Promise<MetricRow[]> {
  const admin = createAdminClient() as any;
  const { data } = await admin.from("instagram_connection").select("access_token").limit(1);
  const token = data?.[0]?.access_token;
  const today = isoDay(new Date());

  if (!token) {
    return [{
      platform: "instagram", metric_date: today, external_post_id: "", value: null,
      metric_kind: "none", unavailable_reason: "no Instagram connection stored",
    }];
  }

  const out: MetricRow[] = [];
  for (const id of mediaIds) {
    const r = await fetch(
      `https://graph.instagram.com/v21.0/${id}/insights?metric=views,reach,likes,comments&access_token=${token}`,
      { signal: AbortSignal.timeout(20000) }
    );
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      out.push({
        platform: "instagram", metric_date: today, external_post_id: id, value: null,
        metric_kind: "none", unavailable_reason: j?.error?.message?.slice(0, 300) || `HTTP ${r.status}`,
      });
      continue;
    }
    const pick = (name: string) => {
      const m = (j.data ?? []).find((d: any) => d.name === name);
      return m ? Number(m.values?.[0]?.value ?? m.total_value?.value ?? 0) : null;
    };
    out.push({
      platform: "instagram", metric_date: today, external_post_id: id,
      value: pick("views"), metric_kind: "views", is_cumulative: true,
      reach: pick("reach"), likes: pick("likes"), comments: pick("comments"),
    });
  }
  return out;
}

/* ---------------------------------------------------------- Google Business */

/**
 * True impressions, per location, per day.
 *
 * THE PATH IS `locations/{id}`, NOT the full `accounts/{a}/locations/{l}` that
 * every other Business Profile endpoint takes. Passing the account-qualified
 * name returns a Google 404 HTML page rather than a JSON error, which reads
 * like the API is gone rather than like the URL is wrong.
 *
 * The four metrics are summed because Google splits every impression across
 * desktop/mobile and Search/Maps, and no one of those four is "the" number.
 * NOT attributable to a post: this is the whole profile, which is why the row
 * carries an empty external_post_id.
 */
export async function collectGbp(days: number): Promise<MetricRow[]> {
  const admin = createAdminClient() as any;
  const { data } = await admin.from("publisher_connections").select("*").eq("platform", "gbp").limit(1);
  const conn = data?.[0];
  const today = isoDay(new Date());
  const fail = (reason: string): MetricRow[] => [{
    platform: "gbp", metric_date: today, external_post_id: "", value: null,
    metric_kind: "none", unavailable_reason: reason,
  }];

  if (!conn?.refresh_token) return fail("GBP not connected");
  const locationName = conn.config?.locationName;
  if (!locationName) return fail("GBP connection has no locationName in config");

  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_INTERNAL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_INTERNAL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: conn.refresh_token,
    grant_type: "refresh_token",
  });
  const tj = await (await fetch("https://oauth2.googleapis.com/token", { method: "POST", body })).json();
  if (!tj.access_token) return fail(`GBP token refresh: ${tj.error_description || tj.error || "failed"}`);

  const start = new Date(Date.now() - days * 86400000);
  const end = new Date(Date.now() - 86400000);
  const q = new URLSearchParams();
  for (const m of [
    "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH", "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
    "BUSINESS_IMPRESSIONS_DESKTOP_MAPS", "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
  ]) q.append("dailyMetrics", m);
  q.set("dailyRange.start_date.year", String(start.getUTCFullYear()));
  q.set("dailyRange.start_date.month", String(start.getUTCMonth() + 1));
  q.set("dailyRange.start_date.day", String(start.getUTCDate()));
  q.set("dailyRange.end_date.year", String(end.getUTCFullYear()));
  q.set("dailyRange.end_date.month", String(end.getUTCMonth() + 1));
  q.set("dailyRange.end_date.day", String(end.getUTCDate()));

  const r = await fetch(
    `https://businessprofileperformance.googleapis.com/v1/${locationName}:fetchMultiDailyMetricsTimeSeries?${q}`,
    { headers: { Authorization: `Bearer ${tj.access_token}` }, signal: AbortSignal.timeout(25000) }
  );
  if (!r.ok) return fail(`GBP performance HTTP ${r.status}`);
  const j = await r.json().catch(() => ({}));

  const byDay = new Map<string, number>();
  for (const series of j?.multiDailyMetricTimeSeries ?? []) {
    for (const dm of series?.dailyMetricTimeSeries ?? []) {
      for (const dv of dm?.timeSeries?.datedValues ?? []) {
        const d = dv.date;
        if (!d?.year) continue;
        const key = `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
        byDay.set(key, (byDay.get(key) ?? 0) + Number(dv.value ?? 0));
      }
    }
  }
  return [...byDay.entries()].map(([metric_date, value]) => ({
    platform: "gbp" as const, metric_date, external_post_id: "", value, metric_kind: "impressions" as const,
  }));
}

/* ------------------------------------------------------------ Search Console */

/**
 * Site-wide Search impressions.
 *
 * Included because "how much did Google show us" is the same question the rest
 * of this page asks, but it is NOT attributable to published content — it counts
 * the whole site. Kept as its own platform rather than folded into gbp so the
 * chart can show or hide it, since at site scale it dwarfs every social number
 * and would flatten them into the axis.
 */
export async function collectGoogleSearch(days: number): Promise<MetricRow[]> {
  const today = isoDay(new Date());
  const fail = (reason: string): MetricRow[] => [{
    platform: "google", metric_date: today, external_post_id: "", value: null,
    metric_kind: "none", unavailable_reason: reason,
  }];

  const site = process.env.GSC_SITE_URL;
  const refresh = process.env.GOOGLE_GSC_REFRESH_TOKEN;
  if (!site || !refresh) return fail("GSC_SITE_URL or GOOGLE_GSC_REFRESH_TOKEN not set");

  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_INTERNAL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_INTERNAL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: refresh,
    grant_type: "refresh_token",
  });
  const tj = await (await fetch("https://oauth2.googleapis.com/token", { method: "POST", body })).json();
  if (!tj.access_token) return fail(`GSC token refresh: ${tj.error_description || tj.error || "failed"}`);

  const start = isoDay(new Date(Date.now() - days * 86400000));
  const end = isoDay(new Date());
  const r = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${tj.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: start, endDate: end, dimensions: ["date"], rowLimit: 100 }),
      signal: AbortSignal.timeout(25000),
    }
  );
  if (!r.ok) return fail(`Search Console HTTP ${r.status}`);
  const j = await r.json().catch(() => ({}));
  return (j.rows ?? []).map((row: any) => ({
    platform: "google" as const, metric_date: row.keys[0], external_post_id: "",
    value: Number(row.impressions) || 0, metric_kind: "impressions" as const,
  }));
}

/* -------------------------------------------------- LinkedIn and TikTok/GHL */

/**
 * LinkedIn reports nothing to us, and this records that rather than hiding it.
 *
 * `GET /rest/socialActions/{urn}` answers 403 ACCESS_DENIED —
 * "Not enough permissions to access: partnerApiSocialActions.GET" — and
 * memberShareStatistics answers 404 RESOURCE_NOT_FOUND. Both were tried against
 * a real post we published, with the same LinkedIn-Version the publisher uses.
 * These are MEMBER posts (config.authorUrn is urn:li:person:...), and member
 * post analytics are a partner-tier permission. Publishing to an organization
 * page instead would make organizationalEntityShareStatistics available; that
 * is a connection change, not a code change.
 */
export function collectLinkedIn(): MetricRow[] {
  return [{
    platform: "linkedin", metric_date: isoDay(new Date()), external_post_id: "", value: null,
    metric_kind: "none",
    unavailable_reason: "LinkedIn returns 403 ACCESS_DENIED for post analytics on member posts (partner permission required)",
  }];
}

/**
 * TikTok through GoHighLevel: engagement yes, views no.
 *
 * GHL's post list carries `insights: {like, share, comment}` and no view or
 * impression field of any kind. Worse for attribution, publishing through GHL
 * returns `{"id": "accepted"}` rather than a TikTok post id, so even if a view
 * count existed there would be nothing to join it to. value stays null and
 * metric_kind is 'none'; the engagement numbers are still worth keeping.
 */
export async function collectTikTokGhl(): Promise<MetricRow[]> {
  const today = isoDay(new Date());
  const key = process.env.GHL_API_KEY, loc = process.env.GHL_LOCATION_ID;
  const base = {
    platform: "tiktok_ghl" as const, metric_date: today, external_post_id: "",
    value: null, metric_kind: "none" as const,
  };
  if (!key || !loc) return [{ ...base, unavailable_reason: "GoHighLevel credentials not configured" }];

  try {
    const r = await fetch(`https://services.leadconnectorhq.com/social-media-posting/${loc}/posts/list`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, Version: "2021-07-28", Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ type: "all", limit: "100", skip: "0" }),
      signal: AbortSignal.timeout(20000),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return [{ ...base, unavailable_reason: `GoHighLevel HTTP ${r.status}` }];

    let likes = 0, shares = 0, comments = 0, n = 0;
    for (const p of j?.results?.posts ?? []) {
      if (p.platform !== "tiktok" || p.status !== "published") continue;
      likes += Number(p.insights?.like ?? 0);
      shares += Number(p.insights?.share ?? 0);
      comments += Number(p.insights?.comment ?? 0);
      n++;
    }
    return [{
      ...base, likes, shares, comments, is_cumulative: true,
      unavailable_reason: n
        ? "GoHighLevel reports likes/shares/comments for TikTok but no view or impression count"
        : "no published TikTok posts found in GoHighLevel",
    }];
  } catch (err: any) {
    return [{ ...base, unavailable_reason: `GoHighLevel: ${err?.message || "request failed"}` }];
  }
}

/* --------------------------------------------------------------------- save */

/**
 * Upsert on the natural key so re-collection corrects rather than duplicates.
 *
 * That is what makes the multi-day window safe, and it is the reason the window
 * exists — YouTube revises recent days, so the first number we see is usually
 * not the final one.
 */
export async function saveMetrics(rows: MetricRow[]): Promise<number> {
  if (!rows.length) return 0;
  const admin = createAdminClient() as any;

  /*
   * EVERY COLUMN IS NAMED EXPLICITLY RATHER THAN SPREAD, and that is not style.
   * A batch upsert normalises the column set across the whole batch, so a field
   * merely ABSENT from one row is sent as an explicit null for that row. Most
   * collectors omit is_cumulative because false is the default — and the insert
   * failed with "null value in column is_cumulative violates not-null
   * constraint", because the one Instagram row that sets it forced the column
   * into the batch for all the others.
   *
   * Spreading a partial object into a batch write is safe only when every
   * nullable column can genuinely take a null. Listing them makes the defaults
   * happen here, where they can be seen.
   */
  const captured_at = new Date().toISOString();
  const payload = rows.map((r) => ({
    platform: r.platform,
    metric_date: r.metric_date,
    external_post_id: r.external_post_id ?? "",
    queue_item_id: r.queue_item_id ?? null,
    value: r.value ?? null,
    metric_kind: r.metric_kind,
    is_cumulative: r.is_cumulative ?? false,
    reach: r.reach ?? null,
    likes: r.likes ?? null,
    comments: r.comments ?? null,
    shares: r.shares ?? null,
    unavailable_reason: r.unavailable_reason ?? null,
    captured_at,
  }));

  const { error } = await admin
    .from("content_metrics_daily")
    .upsert(payload, { onConflict: "platform,metric_date,external_post_id" });
  if (error) throw new Error(`saveMetrics: ${error.message}`);
  return rows.length;
}
