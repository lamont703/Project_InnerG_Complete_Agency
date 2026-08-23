import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  collectYouTube, collectInstagram, collectGbp, collectGoogleSearch,
  collectLinkedIn, collectTikTokGhl, saveMetrics, type MetricRow,
} from "@/lib/content-metrics";

/**
 * Pull yesterday's numbers from every platform we publish to.
 *
 * RUNS DAILY, NOT HOURLY. Nothing here changes fast enough to be worth more,
 * and two of the six sources meter hard: YouTube Analytics shares the daily
 * quota the Shorts uploads draw on at roughly 1,600 units a go, and exhausting
 * it would stop PUBLISHING, which is far worse than a stale chart.
 *
 * ONE PLATFORM FAILING MUST NOT LOSE THE OTHERS. Each collector is settled
 * independently and a rejection is turned into a row that says why, so a dead
 * LinkedIn token cannot silently take YouTube's data down with it. That is also
 * why the response reports per-platform counts — a collector quietly returning
 * nothing looks identical to a platform with no activity unless you can see the
 * shape of what came back.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** The metric window. Re-reads recent days because YouTube revises them. */
const DAYS = 5;

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const admin = createAdminClient() as any;

  /*
   * Instagram is asked per media, so the collector needs the list. Only rows
   * that actually published to Instagram, newest first — an unbounded list
   * would grow one API call per Reel forever, and a Reel's view count stops
   * moving long before that matters.
   */
  const { data: published } = await admin
    .from("publisher_queue")
    .select("id, instagram_media_id, youtube_id, results")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(60);

  const mediaIds: string[] = (published ?? [])
    .map((r: any) => r.instagram_media_id || r.results?.instagram?.id)
    .filter(Boolean);

  const settled = await Promise.allSettled([
    collectYouTube(DAYS),
    collectInstagram(mediaIds),
    collectGbp(DAYS),
    collectGoogleSearch(DAYS),
    Promise.resolve(collectLinkedIn()),
    collectTikTokGhl(),
  ]);

  const names = ["youtube", "instagram", "gbp", "google", "linkedin", "tiktok_ghl"] as const;
  const rows: MetricRow[] = [];
  const perPlatform: Record<string, number | string> = {};

  settled.forEach((s, i) => {
    const name = names[i];
    if (s.status === "fulfilled") {
      rows.push(...s.value);
      perPlatform[name] = s.value.length;
    } else {
      /*
       * A thrown collector still gets a row. Without this the platform simply
       * vanishes from the chart for that day, which reads as "no activity"
       * rather than "the collector broke".
       */
      const reason = String(s.reason?.message || s.reason).slice(0, 300);
      rows.push({
        platform: name, metric_date: new Date().toISOString().slice(0, 10),
        external_post_id: "", value: null, metric_kind: "none", unavailable_reason: reason,
      });
      perPlatform[name] = `error: ${reason}`;
    }
  });

  /*
   * Attach the queue item where the id identifies one. Only YouTube and
   * Instagram report per post at all; GBP, Search Console, LinkedIn and TikTok
   * are account-wide or unreportable and keep a null.
   */
  const byExternalId = new Map<string, string>();
  for (const r of published ?? []) {
    const yt = r.youtube_id || r.results?.youtube?.id;
    const ig = r.instagram_media_id || r.results?.instagram?.id;
    if (yt) byExternalId.set(yt, r.id);
    if (ig) byExternalId.set(ig, r.id);
  }
  for (const r of rows) {
    if (r.external_post_id && byExternalId.has(r.external_post_id)) {
      r.queue_item_id = byExternalId.get(r.external_post_id)!;
    }
  }

  let saved = 0;
  try {
    saved = await saveMetrics(rows);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message, collected: rows.length }, { status: 500 });
  }

  return NextResponse.json({ ok: true, saved, perPlatform, instagramMediaAsked: mediaIds.length });
}
