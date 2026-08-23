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
 *   tiktok      views + engagement, per video, LIFETIME  TikTok video.list
 *   linkedin    NOTHING — 403 ACCESS_DENIED on socialActions
 *
 * A PLATFORM THAT CANNOT REPORT WRITES A ROW SAYING SO. It does not write a
 * zero and it does not write nothing. A zero draws a flat line along the bottom
 * of the chart that reads as "we got no views", which is a different and much
 * more damaging claim than "this platform will not tell us". unavailable_reason
 * carries the API's own words so the page can show them.
 */

export type Platform = "youtube" | "instagram" | "gbp" | "linkedin" | "tiktok" | "tiktok_ghl" | "x" | "google";
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
    /*
     * The media's own timestamp, for the same reason TikTok uses create_time:
     * Instagram reports a LIFETIME total per Reel and no daily series, so the
     * publish date is the only date the number belongs to. One extra call per
     * Reel, and it is what turns a single collection into months of history.
     */
    let publishedOn = today;
    try {
      const meta = await fetch(
        `https://graph.instagram.com/v21.0/${id}?fields=timestamp&access_token=${token}`,
        { signal: AbortSignal.timeout(15000) }
      );
      const mj = await meta.json();
      if (mj?.timestamp) publishedOn = isoDay(new Date(mj.timestamp));
    } catch {
      /* Fall back to today. A wrong-but-present date beats losing the reading. */
    }

    const r = await fetch(
      `https://graph.instagram.com/v21.0/${id}/insights?metric=views,reach,likes,comments&access_token=${token}`,
      { signal: AbortSignal.timeout(20000) }
    );
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      out.push({
        platform: "instagram", metric_date: publishedOn, external_post_id: id, value: null,
        metric_kind: "none", unavailable_reason: j?.error?.message?.slice(0, 300) || `HTTP ${r.status}`,
      });
      continue;
    }
    const pick = (name: string) => {
      const m = (j.data ?? []).find((d: any) => d.name === name);
      return m ? Number(m.values?.[0]?.value ?? m.total_value?.value ?? 0) : null;
    };
    out.push({
      platform: "instagram", metric_date: publishedOn, external_post_id: id,
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
 * TikTok views, read from TikTok directly — while GoHighLevel keeps publishing.
 *
 * SEPARATING THE TWO IS THE WHOLE POINT. GoHighLevel is a good publisher and
 * stays the publisher; it is simply a poor reporter. Its post list carries
 * {like, share, comment} and no view count, and publishing through it returns
 * {"id": "accepted"} instead of a TikTok post id, so there is nothing to attach
 * a number to. TikTok's own video.list answers all of it.
 *
 * THE TOKEN IS IN client_db_connections, NOT publisher_connections, and that is
 * deliberate rather than untidy. publisher_connections.tiktok stays
 * disconnected because that row is about PUBLISHING, which needs video.publish
 * and an approved app audit that we do not have. Reading needs video.list,
 * which the existing connector token already carries. One capability being
 * blocked does not block the other, and collapsing them into one row would make
 * it look like it does.
 *
 * ITS LABEL LIES ABOUT WHOSE ACCOUNT IT IS. The row reads "TikTok - Lamont |
 * Agency Owner/Educator" and tiktok_accounts says `freelancekickstart`, both
 * written before the account was renamed. user/info on the same open_id now
 * returns `shearquery`. The connection never broke; only the stored names went
 * stale. Verify an account against the API, never against a label.
 *
 * LIFETIME, so is_cumulative. Same treatment as Instagram: the page differences
 * consecutive readings, and the first reading of each video is dropped rather
 * than counted in full.
 */
export async function collectTikTok(): Promise<MetricRow[]> {
  const today = isoDay(new Date());
  const base = {
    platform: "tiktok" as const, metric_date: today, external_post_id: "",
    value: null, metric_kind: "none" as const,
  };
  const fail = (reason: string): MetricRow[] => [{ ...base, unavailable_reason: reason }];

  const admin = createAdminClient() as any;
  const { data } = await admin
    .from("client_db_connections")
    .select("sync_config")
    .eq("db_type", "tiktok")
    .limit(1);

  const refreshToken = data?.[0]?.sync_config?.refresh_token;
  if (!refreshToken) return fail("no TikTok connection stored");
  if (!process.env.TIKTOK_PRODUCTION_CLIENT_KEY || !process.env.TIKTOK_PRODUCTION_CLIENT_SECRET) {
    return fail("TIKTOK_PRODUCTION_CLIENT_KEY / _SECRET not set");
  }

  try {
    const body = new URLSearchParams({
      client_key: process.env.TIKTOK_PRODUCTION_CLIENT_KEY,
      client_secret: process.env.TIKTOK_PRODUCTION_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    const tj = await (await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(20000),
    })).json();
    if (!tj.access_token) return fail(`TikTok token refresh: ${tj.error_description || tj.error || "failed"}`);

    /*
     * TikTok did NOT rotate the refresh token on redemption when this was
     * measured — the returned value matched the stored one. That is why nothing
     * is written back here. X behaves the opposite way and invalidates the old
     * token, so if TikTok ever starts rotating, the symptom is every collection
     * after the first failing to authenticate. Re-check before assuming.
     */

    const fields = "id,title,video_description,create_time,view_count,like_count,comment_count,share_count";
    const out: MetricRow[] = [];
    let cursor: number | undefined;

    // Paged, because the account is already past 80 videos and video.list caps
    // a page at 20. Bounded so a cursor that never terminates cannot spin.
    for (let page = 0; page < 10; page++) {
      const r = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=${fields}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tj.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify(cursor ? { max_count: 20, cursor } : { max_count: 20 }),
        signal: AbortSignal.timeout(25000),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || (j?.error?.code && j.error.code !== "ok")) {
        return out.length ? out : fail(`TikTok video.list: ${j?.error?.message || `HTTP ${r.status}`}`);
      }
      for (const v of j?.data?.videos ?? []) {
        /*
         * STAMPED WITH THE VIDEO'S PUBLISH DATE, NOT TODAY. TikTok reports a
         * lifetime view count and no daily series, so the only date that means
         * anything for it is when the video went out. Filing it under the
         * collection date instead put every video on one day and, because the
         * first reading of a cumulative series has to be discarded, showed
         * nothing at all — 10,983 real views rendered as "cannot report".
         *
         * This also gives history for free: create_time reaches back as far as
         * the account does, so the trend exists from the first collection
         * rather than accumulating a day at a time.
         */
        /*
         * A MISSING view_count IS SKIPPED, NOT STORED AS ZERO. TikTok omits the
         * field for some videos on some responses — 20 of 83 in one measured
         * run, all of them older posts — and `Number(v.view_count ?? 0)` turned
         * "absent" into "zero", writing 0 over videos with real views and
         * losing 1,663 of them. Skipping leaves the last good reading in place,
         * because the row is keyed on the video id and a later collection will
         * fill it in.
         */
        if (v.view_count === undefined || v.view_count === null) continue;

        out.push({
          platform: "tiktok",
          metric_date: isoDay(new Date(Number(v.create_time) * 1000)),
          external_post_id: String(v.id),
          value: Number(v.view_count), metric_kind: "views", is_cumulative: true,
          likes: Number(v.like_count ?? 0), comments: Number(v.comment_count ?? 0),
          shares: Number(v.share_count ?? 0),
        });
      }
      if (!j?.data?.has_more) break;
      cursor = j.data.cursor;
    }

    return out.length ? out : fail("TikTok returned no videos");
  } catch (err: any) {
    return fail(`TikTok: ${err?.message || "request failed"}`);
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
