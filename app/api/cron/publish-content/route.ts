import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishToInstagram } from "@/lib/instagram-publish";
import { isExpired } from "@/lib/instagram-token";
import { SLOT_HOURS_ET } from "@/lib/admin/publisher-queue";

/**
 * Publishes whatever sits at the front of the content publisher line, to
 * YouTube Shorts and Instagram Reels together.
 *
 * THREE SLOTS A DAY: 9am, 2pm and 7pm Eastern.
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
 * ONE PLATFORM CAN SUCCEED WHILE THE OTHER FAILS, and the row records both
 * outcomes rather than collapsing them. Calling a YouTube-only publish
 * "published" hides a missing Reel; calling it "failed" invites a re-post that
 * duplicates the Short. 'partial' is the honest answer and it names which half
 * needs attention.
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

async function youtubeAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID!,
    client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN!,
    grant_type: "refresh_token",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body });
  const j = await r.json();
  if (!j.access_token) throw new Error(`token refresh failed: ${JSON.stringify(j).slice(0, 200)}`);
  return j.access_token as string;
}

/**
 * The YouTube description and the Instagram caption are built here rather than
 * stored on the row. The queue holds what the video SAYS; these hold how it is
 * listed, and keeping them apart means the wording can be improved for every
 * future post without re-rendering or re-queueing anything.
 *
 * They are not the same text. A YouTube description is read after the click and
 * carries the link; an Instagram caption is read in the feed, cannot carry a
 * working link, and leans on tags. Sharing one string would make both worse.
 */
function buildYouTubeDescription(row: any): string {
  return [
    `${row.stat ?? ""} ${row.label ?? ""}`.trim(),
    "",
    row.question ?? "",
    "Tell us below.",
    "",
    "Full pass rates, kit lists and state board guides:",
    "https://shearquery.com",
    "",
    "#Shorts #barber #barberschool #stateboard #cosmetology",
  ].join("\n");
}

function buildInstagramCaption(row: any): string {
  if (row.caption) return row.caption;
  return [
    `${row.stat ?? ""} ${row.label ?? ""}`.trim(),
    "",
    row.question ?? "",
    "",
    "Pass rates, kit lists and state board guides — link in bio.",
    "",
    "#barber #barberschool #barbershop #stateboard #cosmetology #beautyschool #barberlife",
  ].join("\n");
}

const TAGS = [
  "barber state board", "barber exam", "texas barber license",
  "barber school", "barber state board practical", "barber written exam",
  "cosmetology state board", "beauty school", "barber apprentice",
];

async function publishToYouTube(row: any): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const token = await youtubeAccessToken();

    const videoRes = await fetch(row.video_url);
    if (!videoRes.ok) throw new Error(`could not fetch video: HTTP ${videoRes.status}`);
    const bytes = Buffer.from(await videoRes.arrayBuffer());

    const metadata = {
      snippet: {
        title: String(row.title).slice(0, 100),
        description: buildYouTubeDescription(row),
        tags: TAGS,
        categoryId: "26",
        defaultLanguage: "en",
      },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
    };

    const start = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": String(bytes.length),
          "X-Upload-Content-Type": "video/mp4",
        },
        body: JSON.stringify(metadata),
      }
    );
    if (!start.ok) throw new Error(`resumable start ${start.status}: ${(await start.text()).slice(0, 300)}`);
    const location = start.headers.get("location");
    if (!location) throw new Error("no upload URL returned");

    const put = await fetch(location, {
      method: "PUT",
      headers: { "Content-Length": String(bytes.length), "Content-Type": "video/mp4" },
      body: bytes,
    });
    const text = await put.text();
    if (!put.ok) throw new Error(`upload ${put.status}: ${text.slice(0, 300)}`);
    return { ok: true, id: JSON.parse(text).id };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e).slice(0, 500) };
  }
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { hour, date } = easternNow();
  if (!SLOT_HOURS_ET.includes(hour as (typeof SLOT_HOURS_ET)[number])) {
    return NextResponse.json({ ok: true, state: "not_a_slot", easternHour: hour });
  }

  const admin = createAdminClient();

  /*
   * CLAIM FIRST. A conflict here means this slot already went out — return
   * quietly rather than as an error, because a second invocation in the same
   * hour is a normal thing for a cron platform to do, not a fault.
   */
  const { error: claimError } = await (admin.from("publisher_slot_claims") as any)
    .insert({ slot_date: date, slot_hour: hour });

  if (claimError) {
    return NextResponse.json({ ok: true, state: "slot_already_taken", slot: `${date} ${hour}:00 ET` });
  }

  /*
   * The front of the line, skipping anything with no video. A row without an
   * MP4 cannot publish, and letting it hold position 1 would burn the slot and
   * then burn every following slot too. The publisher page flags these
   * separately so they are visible rather than silently stepped over.
   */
  const { data: due } = await (admin.from("publisher_queue") as any)
    .select("*")
    .eq("status", "queued")
    .not("video_url", "is", null)
    .order("position", { ascending: true })
    .limit(1);

  const row = due?.[0];
  if (!row) {
    return NextResponse.json({ ok: true, state: "queue_empty", slot: `${date} ${hour}:00 ET` });
  }

  await (admin.from("publisher_slot_claims") as any)
    .update({ item_id: row.id })
    .eq("slot_date", date)
    .eq("slot_hour", hour);

  const yt = await publishToYouTube(row);

  /*
   * INSTAGRAM IS ATTEMPTED EVEN IF YOUTUBE FAILED. They are independent
   * destinations and one refusing the file says nothing about the other;
   * skipping the second because the first failed would turn one missing post
   * into two for no reason.
   */
  let igResult: { ok: true; mediaId: string; permalink?: string } | { ok: false; error: string };

  const { data: conn } = await (admin.from("instagram_connection") as any)
    .select("access_token, ig_user_id, expires_at, status")
    .eq("id", 1)
    .maybeSingle();

  if (!conn?.access_token || !conn?.ig_user_id) {
    igResult = { ok: false, error: "instagram not connected" };
  } else if (isExpired(conn.expires_at) || conn.status !== "connected") {
    igResult = { ok: false, error: `instagram token unusable (expires ${conn.expires_at})` };
  } else {
    const r = await publishToInstagram({
      igUserId: conn.ig_user_id,
      accessToken: conn.access_token,
      imageUrls: [],
      videoUrl: row.video_url,
      caption: buildInstagramCaption(row),
    });
    igResult = r.ok
      ? { ok: true, mediaId: r.mediaId!, permalink: r.permalink }
      : { ok: false, error: `${(r as any).stage ?? "publish"}: ${(r as any).error}` };
  }

  const status = yt.ok && igResult.ok ? "published" : yt.ok || igResult.ok ? "partial" : "failed";
  const now = new Date().toISOString();

  await (admin.from("publisher_queue") as any)
    .update({
      status,
      youtube_id: yt.ok ? yt.id : null,
      youtube_error: yt.ok ? null : yt.error,
      youtube_published_at: yt.ok ? now : null,
      instagram_media_id: igResult.ok ? igResult.mediaId : null,
      instagram_permalink: igResult.ok ? (igResult.permalink ?? null) : null,
      instagram_error: igResult.ok ? null : igResult.error,
      instagram_published_at: igResult.ok ? now : null,
      published_at: now,
      updated_at: now,
    })
    .eq("id", row.id);

  return NextResponse.json({
    ok: status !== "failed",
    state: status,
    slot: `${date} ${hour}:00 ET`,
    itemKey: row.item_key,
    youtube: yt.ok ? `https://youtube.com/shorts/${yt.id}` : yt.error,
    instagram: igResult.ok ? (igResult.permalink ?? igResult.mediaId) : igResult.error,
  });
}
