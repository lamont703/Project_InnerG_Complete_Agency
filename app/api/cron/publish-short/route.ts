import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Publishes the YouTube Short that has come due.
 *
 * WHY THIS RUNS ON VERCEL AND NOT THE LAPTOP. cron and launchd both failed on
 * the machine that renders these — the project sits under ~/Desktop, which
 * macOS protects, and a background job cannot enter it. Both failed silently at
 * 9am into a log nobody reads. Rendering still happens locally because it needs
 * a browser and ffmpeg; publishing does not, so publishing moved here.
 *
 * IT ONLY MOVES BYTES IT DID NOT MAKE. The video was rendered, reviewed on
 * /admin/shorts-queue and uploaded to storage days earlier. This job picks the
 * moment, never the content — the same division as gbp-publish-scheduled.
 *
 * ONE PER RUN, ONE PER DAY. The cadence limit is the card pool, not appetite.
 * Publishing two because two are due would empty the queue faster and stack
 * uploads on one channel; the older one goes out and the rest wait a day.
 *
 * FAILURE IS RECORDED, NOT RETRIED BLINDLY. A row that fails is marked 'failed'
 * with the reason and left alone. videos.insert has its own quota bucket of
 * about 100 calls a day, and a retry loop on a genuinely broken upload can burn
 * the allowance on one video — then nothing publishes at all.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when that var is set. */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Today in Central — the queue is scheduled in the audience's timezone, not UTC. */
function todayCentral(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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
 * The description and tags are rebuilt here rather than stored on the row.
 * The queue holds what the video SAYS; this holds how it is listed. Keeping
 * them apart means the SEO wording can be improved for future posts without
 * re-rendering anything.
 */
function buildDescription(row: any): string {
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

const TAGS = [
  "barber state board", "barber exam", "texas barber license",
  "barber school", "barber state board practical", "barber written exam",
  "cosmetology state board", "beauty school", "barber apprentice",
];

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = todayCentral();

  const { data: due, error } = await (admin.from("shorts_queue") as any)
    .select("*")
    .eq("status", "queued")
    .lte("scheduled_for", today)
    .order("scheduled_for", { ascending: true })
    .limit(1);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  if (!due || !due.length) {
    return NextResponse.json({ success: true, published: 0, note: "nothing due" });
  }

  const row = due[0];

  if (!row.video_url) {
    await (admin.from("shorts_queue") as any)
      .update({ status: "failed", error: "no video_url — never rendered or uploaded", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    return NextResponse.json({ success: false, error: "row has no video" }, { status: 500 });
  }

  try {
    const token = await youtubeAccessToken();

    const videoRes = await fetch(row.video_url);
    if (!videoRes.ok) throw new Error(`could not fetch video: HTTP ${videoRes.status}`);
    const bytes = Buffer.from(await videoRes.arrayBuffer());

    const metadata = {
      snippet: {
        title: String(row.title).slice(0, 100),
        description: buildDescription(row),
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
    const result = JSON.parse(text);

    await (admin.from("shorts_queue") as any)
      .update({
        status: "published",
        youtube_id: result.id,
        published_at: new Date().toISOString(),
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    return NextResponse.json({
      success: true,
      published: 1,
      cardKey: row.card_key,
      youtubeId: result.id,
      url: `https://youtube.com/shorts/${result.id}`,
    });
  } catch (e) {
    const message = String((e as Error)?.message ?? e).slice(0, 500);
    await (admin.from("shorts_queue") as any)
      .update({ status: "failed", error: message, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    return NextResponse.json({ success: false, cardKey: row.card_key, error: message }, { status: 500 });
  }
}
