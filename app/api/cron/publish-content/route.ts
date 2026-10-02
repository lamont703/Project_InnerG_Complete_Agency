import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishToInstagram } from "@/lib/instagram-publish";
import { isExpired } from "@/lib/instagram-token";
import { decide, parseWeeklySlots, type QueueEntry } from "@/lib/admin/publisher-schedule";
import {
  buildYouTubeDescription,
  buildInstagramCaption,
} from "@/lib/admin/publisher-copy";
import { publishToYouTube } from "@/lib/youtube-publish";
import {
  fanOutToTargets,
  statusFromOutcomes,
  TARGET_PLATFORMS,
  type Outcome,
  type PlatformKey,
} from "@/lib/admin/publisher-targets";

/**
 * Publishes whatever sits at the front of the content publisher line, to every
 * connected platform.
 *
 * ON THE OWNER'S SCHEDULE, set on /admin/content-publisher (publisher_settings, 2026-10-02):
 * a pause switch, weekly days + hours in Eastern, and videos pinned to an exact time. The
 * rules live in lib/admin/publisher-schedule.ts (decide), shared with the page's preview.
 * It used to be three fixed slots a day — 9am, 2pm and 7pm Eastern.
 *
 * WHY THIS RUNS HOURLY AND DECIDES FOR ITSELF. Vercel cron schedules are UTC
 * with no timezone to pin, so an entry written as 13:00 UTC is 9am Eastern for
 * eight months of the year and 8am for the other four. The existing
 * publish-short route carries a long comment about that drift and a note that
 * the entry "has to move" in November - which is a task nobody will remember,
 * and whose failure looks like posts quietly going out an hour early.
 *
 * Running every hour and asking "is it 9, 14 or 19 in New York right now?"
 * makes the schedule true in both halves of the year with nothing to remember.
 * The cost is 24 invocations a day that mostly return immediately.
 *
 * THE SLOT IS CLAIMED BEFORE ANYTHING IS UPLOADED. An hourly job that publishes
 * whenever the hour matches will publish twice if it is invoked twice in that
 * hour, and a retry, a manual curl or an overlapping deploy all do that. The
 * claim is an insert against a primary key, so the second caller loses the race
 * in the database rather than in a check-then-act window - and it is written
 * first, because the risky window is the one while the upload is in flight.
 *
 * IT ONLY MOVES BYTES IT DID NOT MAKE. The video was rendered, reviewed on the
 * publisher page and uploaded to storage days earlier. This job picks the
 * moment, never the content - the same division publish-short and
 * gbp-publish-scheduled keep.
 *
 * PLATFORMS SUCCEED AND FAIL INDEPENDENTLY, and the row records each outcome
 * rather than collapsing them. Calling a YouTube-only publish "published" hides
 * a missing Reel; calling it "failed" invites a re-post that duplicates the
 * Short. 'partial' is the honest answer and it names which destination needs
 * attention.
 *
 * A PLATFORM THAT IS SWITCHED OFF IS SKIPPED, NOT FAILED. With six
 * destinations, counting an unconfigured one as a failure would make 'partial'
 * the permanent state of every row - see statusFromOutcomes.
 *
 * THE VIDEO IS FETCHED ONCE. YouTube, LinkedIn, X and TikTok all need the raw
 * bytes. Downloading the same MP4 four times inside one invocation wastes the
 * budget and adds three more ways to fail for no benefit.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 800;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Wall-clock hour and date in Eastern — the timezone the slots are stated in. */
function easternNow(): { hour: number; date: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", hour12: false,
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value])
  );
  return { hour: Number(parts.hour), date: `${parts.year}-${parts.month}-${parts.day}` };
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  /*
   * A DRY RUN RESOLVES EVERY CONNECTION AND BUILDS EVERY CAPTION, AND SENDS
   * NOTHING. The slots are five hours apart, so without this the only way to
   * find out that a token is stale or a caption is over a platform's limit is
   * to burn a real post. It deliberately ignores the slot hour and does not
   * claim the slot - it is a question, not a turn.
   */
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  const { hour, date } = easternNow();
  const admin = createAdminClient();

  /*
   * THE SCHEDULE FIRST. If the settings row cannot be read — the migration not applied yet,
   * or the database unreachable — nothing publishes. A publisher that cannot tell whether it
   * is paused must assume it is.
   */
  const { data: settingsRow, error: settingsError } = await (admin.from("publisher_settings") as any)
    .select("paused, weekly_slots")
    .eq("id", 1)
    .maybeSingle();
  if (settingsError || !settingsRow) {
    return NextResponse.json({ ok: true, state: "settings_unavailable", error: settingsError?.message ?? "no settings row" });
  }
  const settings = { paused: !!settingsRow.paused, weeklySlots: parseWeeklySlots(settingsRow.weekly_slots) };

  const { data: lineRows } = await (admin.from("publisher_queue") as any)
    .select("id, position, scheduled_for, video_url")
    .eq("status", "queued")
    .order("position", { ascending: true })
    .limit(300);
  const line: QueueEntry[] = (lineRows ?? []).map((r: any) => ({
    id: r.id, position: r.position, scheduledFor: r.scheduled_for ?? null, hasVideo: !!r.video_url,
  }));

  /*
   * A DRY RUN IS A QUESTION, NOT A TURN: it ignores the pause and the clock and answers
   * "what would go out next" — the earliest pinned post, else the front of the line.
   */
  let chosenId: string | null = null;
  let reason = "dry_run";
  if (dryRun) {
    const ready = line.filter((q) => q.hasVideo);
    const pinned = ready.filter((q) => q.scheduledFor)
      .sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime())[0];
    chosenId = pinned?.id ?? ready.find((q) => !q.scheduledFor)?.id ?? null;
  } else {
    const d = decide(settings, line, new Date());
    if (d.kind === "paused") return NextResponse.json({ ok: true, state: "paused" });
    if (d.kind === "not_a_slot") return NextResponse.json({ ok: true, state: "not_a_slot", easternHour: hour });
    if (d.kind === "empty") return NextResponse.json({ ok: true, state: "queue_empty", slot: `${date} ${hour}:00 ET` });
    chosenId = d.id; reason = d.reason;

    /*
     * CLAIM FIRST. A conflict here means this hour already published — return quietly
     * rather than as an error, because a second invocation in the same hour is a normal
     * thing for a cron platform to do, not a fault. One post per hour, pinned or weekly.
     */
    const { error: claimError } = await (admin.from("publisher_slot_claims") as any)
      .insert({ slot_date: date, slot_hour: hour });

    if (claimError) {
      return NextResponse.json({ ok: true, state: "slot_already_taken", slot: `${date} ${hour}:00 ET` });
    }
  }

  const { data: due } = chosenId
    ? await (admin.from("publisher_queue") as any).select("*").eq("id", chosenId).eq("status", "queued").limit(1)
    : { data: [] };

  const row = due?.[0];
  if (!row) {
    return NextResponse.json({ ok: true, state: "queue_empty", slot: `${date} ${hour}:00 ET` });
  }

  if (dryRun) {
    const outcomes = await fanOutToTargets({ admin, row, video: null, dryRun: true });
    return NextResponse.json({
      ok: true,
      state: "dry_run",
      itemKey: row.item_key,
      schedule: { paused: settings.paused, weeklySlots: settings.weeklySlots, scheduledFor: row.scheduled_for ?? null },
      wouldPublish: {
        youtube: { title: String(row.title).slice(0, 100), description: buildYouTubeDescription(row) },
        instagram: { caption: buildInstagramCaption(row) },
        ...Object.fromEntries(
          Object.entries(outcomes).map(([k, v]) => [
            k,
            "skipped" in v ? { skipped: v.skipped } : { copy: (v as any).note },
          ])
        ),
      },
    });
  }

  await (admin.from("publisher_slot_claims") as any)
    .update({ item_id: row.id })
    .eq("slot_date", date)
    .eq("slot_hour", hour);

  /*
   * ONE DOWNLOAD FOR EVERY PLATFORM THAT NEEDS BYTES. A failure here is not
   * fatal to the whole slot: Instagram and Google Business Profile take a URL
   * and can still go out, so the null is passed along and each platform that
   * needs the file records its own skip.
   */
  let bytes: Buffer | null = null;
  let videoFetchError: string | null = null;
  try {
    const videoRes = await fetch(row.video_url);
    if (!videoRes.ok) throw new Error(`could not fetch video: HTTP ${videoRes.status}`);
    bytes = Buffer.from(await videoRes.arrayBuffer());
  } catch (e) {
    videoFetchError = String((e as Error)?.message ?? e).slice(0, 300);
  }

  const outcomes: Record<string, Outcome> = {};

  // YouTube.
  if (bytes) {
    const yt = await publishToYouTube(row, bytes);
    outcomes.youtube = yt.ok
      ? { ok: true, id: yt.id, url: `https://youtube.com/shorts/${yt.id}` }
      : { ok: false, error: yt.error };
  } else {
    outcomes.youtube = { skipped: videoFetchError ?? "no video bytes" };
  }

  /*
   * INSTAGRAM IS ATTEMPTED EVEN IF YOUTUBE FAILED. They are independent
   * destinations and one refusing the file says nothing about the other;
   * skipping the second because the first failed would turn one missing post
   * into two for no reason.
   */
  const { data: conn } = await (admin.from("instagram_connection") as any)
    .select("access_token, ig_user_id, expires_at, status")
    .eq("id", 1)
    .maybeSingle();

  if (!conn?.access_token || !conn?.ig_user_id) {
    outcomes.instagram = { skipped: "instagram not connected" };
  } else if (isExpired(conn.expires_at) || conn.status !== "connected") {
    outcomes.instagram = { skipped: `instagram token unusable (expires ${conn.expires_at})` };
  } else {
    const r = await publishToInstagram({
      igUserId: conn.ig_user_id,
      accessToken: conn.access_token,
      imageUrls: [],
      videoUrl: row.video_url,
      coverUrl: row.thumbnail_url ?? undefined,
      caption: buildInstagramCaption(row),
    });
    outcomes.instagram = r.ok
      ? { ok: true, id: r.mediaId!, url: r.permalink }
      : { ok: false, error: `${(r as any).stage ?? "publish"}: ${(r as any).error}` };
  }

  // LinkedIn, X, Google Business Profile and TikTok.
  const fanned = await fanOutToTargets({ admin, row, video: bytes });
  for (const p of TARGET_PLATFORMS) outcomes[p] = fanned[p as PlatformKey];

  const status = statusFromOutcomes(outcomes);
  const now = new Date().toISOString();

  const yt = outcomes.youtube;
  const ig = outcomes.instagram;
  const ok = (o: Outcome) => "ok" in o && o.ok;

  await (admin.from("publisher_queue") as any)
    .update({
      status,
      results: outcomes,
      /*
       * The YouTube and Instagram columns are written as well as `results`.
       * Every row published before the fan-out has its outcome only in these,
       * and the board still reads them - dual-writing the two costs a few lines
       * here and avoids both a backfill and a regression on historical rows.
       */
      youtube_id: ok(yt) ? (yt as any).id : null,
      youtube_error: "error" in yt ? yt.error : null,
      youtube_published_at: ok(yt) ? now : null,
      instagram_media_id: ok(ig) ? (ig as any).id : null,
      instagram_permalink: ok(ig) ? ((ig as any).url ?? null) : null,
      instagram_error: "error" in ig ? ig.error : null,
      instagram_published_at: ok(ig) ? now : null,
      published_at: now,
      updated_at: now,
    })
    .eq("id", row.id);

  return NextResponse.json({
    ok: status !== "failed",
    state: status,
    slot: `${date} ${hour}:00 ET`,
    reason,
    itemKey: row.item_key,
    results: outcomes,
  });
}
