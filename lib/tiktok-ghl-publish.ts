import "server-only";

/**
 * Publishing to TikTok THROUGH GoHighLevel, while the native app waits on audit.
 *
 * WHY A SECOND PATH EXISTS AT ALL. lib/tiktok-publish.ts is written and correct
 * and cannot be used: the app has not passed TikTok's audit, and until it does
 * "all content posted by unaudited clients will be restricted to private
 * viewing mode" — a post would succeed and be invisible. GHL's own TikTok
 * integration is already audited and already connected, so it can post publicly
 * today. This is a bridge, not a replacement.
 *
 * THE ROUTE IS PROVEN, NOT ASSUMED. GHL has already published 15 TikTok posts
 * from this location. Their shape was read back off the API rather than taken
 * from documentation:
 *
 *     platform: "tiktok"   type: "post"   media: [{ type, url }]
 *
 * `type: "post"`, NOT "reel". Instagram uses "reel" and TikTok does not, which
 * is the kind of difference that returns a cheerful 200 and publishes nothing
 * useful. Copying the Instagram payload would have been the obvious mistake.
 *
 * THE MEDIA MUST BE UPLOADED TO GHL FIRST, and skipping that is the mistake
 * this file was written with. The publisher queue holds a publicly reachable
 * MP4 that YouTube and Instagram both fetch happily, so handing GHL that URL
 * looked like an obvious simplification. TikTok refused it:
 *
 *     "The media URL isn't from a verified domain. Verify your domain in
 *      TikTok settings and reupload the video."
 *
 * This is the SAME constraint lib/tiktok-publish.ts documents for the native
 * path — TikTok will only pull from a domain the posting app has verified, and
 * nobody has verified our Supabase storage domain. Going through GHL does not
 * escape it, because GHL passes the URL to TikTok rather than the bytes. What
 * DOES escape it is GHL's own media domain, which GHL has verified.
 *
 * So the bytes are downloaded and re-uploaded on every post. That is a real
 * cost — an extra round trip of a whole video — and it is not optional. The
 * older poster script uploads for the same reason, which I mistook for an
 * artifact of it working from a local path.
 *
 * NOTE THE VERSION HEADER. GHL's social endpoints answer to 2021-07-28 here;
 * the older poster script used 2023-02-21 and also worked. Neither is
 * documented as required, so this matches the rest of this codebase rather than
 * the script.
 */

const GHL_API_BASE = "https://services.leadconnectorhq.com";

/** TikTok caption ceiling. GHL passes text through, so the limit is TikTok's. */
export const TIKTOK_GHL_CAPTION_LIMIT = 2200;

export interface TikTokGhlPublishInput {
  /** Publicly reachable MP4. Not uploaded — GHL fetches it. */
  videoUrl: string;
  caption: string;
  /** The GHL social account id, e.g. "…_business". */
  accountId: string;
  /** The GHL user the post is attributed to. Resolved if omitted. */
  userId?: string;
}

/**
 * Which GHL user the post is filed under.
 *
 * REQUIRED, THOUGH NOTHING SAYS SO UNTIL YOU OMIT IT. A post without userId is
 * refused with 422 "userId must be a string" — discovered by trying it, since
 * the docs page would not load. scripts/agent_ghl_social_poster.ts carries the
 * id as a hardcoded literal, which works and tells a later reader nothing about
 * where it came from or what to do when it stops being right.
 *
 * Resolved from the live user list instead, preferring the account admin. That
 * survives someone being removed or the workspace being rebuilt, and it fails
 * loudly rather than posting under an id that no longer exists.
 */
let cachedUserId: string | null = null;

/**
 * THE LOOKUP IS RETRIED, AND THE REASON IT FAILED TRAVELS WITH THE ANSWER.
 *
 * Both of those come from one incident: metro-spread-hyperframes published on
 * 2026-09-13 with `tiktok_ghl: { ok: false, error: "Could not resolve a GHL
 * user to post as." }` while YouTube, Instagram and GBP all succeeded. The same
 * call had worked on the two publishes before it and worked again when
 * exercised by hand minutes later — HTTP 200 in 538ms, six users, an admin
 * among them. So the post was lost to a single transient blip in somebody
 * else's API, on a call whose answer this file's own comment calls stable.
 *
 * ONE ATTEMPT WAS THE BUG. A stable answer fetched once, with no retry, in the
 * one moment that decides whether a post happens.
 *
 * AND THE REASON WAS UNREACHABLE, WHICH IS THE SECOND BUG. This function
 * already refused to swallow it — the warn below predates the incident and says
 * why. But a console warning lives in the platform logs, and the artifact that
 * actually survives is the `results` JSON on the queue row, which only ever got
 * the caller's generic sentence. Three different causes — a non-200, a thrown
 * fetch, an empty user list — all reach the caller as the same string, and
 * picking between them afterwards was not possible from anything persisted.
 * So the reason is returned, not just logged, and the caller writes it into the
 * row.
 */
/* Discriminated on `ok`, not on whether `id` is null — a union split by
   `string | null` does not narrow on truthiness and the compiler says so. */
export type GhlUserResolution =
  | { ok: true; id: string }
  | { ok: false; reason: string };

/* The waits are a parameter so the tests can run in milliseconds rather than
   sleeping through the real backoff. Production never passes them. */
export const GHL_USER_LOOKUP_BACKOFF_MS = [600, 1800];

export async function resolveGhlPostingUser(
  opts: { backoffMs?: number[] } = {},
): Promise<GhlUserResolution> {
  const backoff = opts.backoffMs ?? GHL_USER_LOOKUP_BACKOFF_MS;
  // An env override wins, so this can be pinned without a deploy if the lookup
  // ever becomes the thing standing between the publisher and a post.
  if (process.env.GHL_POSTING_USER_ID) return { ok: true, id: process.env.GHL_POSTING_USER_ID };
  if (cachedUserId) return { ok: true, id: cachedUserId };

  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!apiKey || !locationId) {
    return { ok: false, reason: "GHL_API_KEY / GHL_LOCATION_ID are not set" };
  }

  /*
   * CACHED, BECAUSE THIS ENDPOINT IS SLOW. Measured at 17.8 seconds for six
   * users, and at 538ms for the same six on another day. Paying the slow case
   * on every post would make the publisher look broken and risks tripping
   * whatever timeout sits above it. The answer is stable — which human account
   * a post is filed under does not change between posts.
   *
   * That spread is also why the retry waits rather than hammering: if the
   * endpoint is having a slow minute, three calls 400ms apart are three calls
   * into the same slow minute.
   */
  const ATTEMPTS = backoff.length + 1;
  let last = "no attempt made";

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    if (attempt > 1) await new Promise((r) => setTimeout(r, backoff[attempt - 2]));
    try {
      const r = await fetch(`${GHL_API_BASE}/users/?locationId=${locationId}`, {
        headers: { Authorization: `Bearer ${apiKey}`, Version: "2021-07-28", Accept: "application/json" },
        cache: "no-store",
      });
      if (!r.ok) {
        last = `HTTP ${r.status}: ${(await r.text()).slice(0, 160)}`;
        // Logged as well as returned. A bare null here once cost a debugging
        // round trip: the caller reported "could not resolve a user" and the
        // actual reason had already been discarded.
        console.warn(`[tiktok-ghl] user lookup attempt ${attempt}/${ATTEMPTS} ${last}`);
        continue;
      }
      const j = (await r.json()) as { users?: { id: string; roles?: { role?: string } }[] };
      const users = j.users ?? [];
      const picked = users.find((u) => u.roles?.role === "admin")?.id ?? users[0]?.id ?? null;
      if (!picked) {
        /* NOT RETRIED IN SPIRIT, THOUGH THE LOOP WILL. An empty list is a real
           answer about the workspace rather than a blip, and repeating it is
           cheap enough not to special-case — but the reason must say so, or a
           reader assumes the endpoint was down. */
        last = `endpoint returned ${users.length} user(s); none usable`;
        console.warn(`[tiktok-ghl] user lookup attempt ${attempt}/${ATTEMPTS} ${last}`);
        continue;
      }
      cachedUserId = picked;
      if (attempt > 1) console.warn(`[tiktok-ghl] user lookup recovered on attempt ${attempt}`);
      return { ok: true, id: picked };
    } catch (e) {
      last = `threw: ${e instanceof Error ? e.message : String(e)}`;
      console.warn(`[tiktok-ghl] user lookup attempt ${attempt}/${ATTEMPTS} ${last}`);
    }
  }
  return { ok: false, reason: `${ATTEMPTS} attempts failed, last: ${last}` };
}

/** Back-compat wrapper. Prefer resolveGhlPostingUser, which carries the reason. */
export async function findGhlPostingUserId(): Promise<string | null> {
  const r = await resolveGhlPostingUser();
  return r.ok ? r.id : null;
}

export type TikTokGhlPublishResult =
  | { ok: true; id: string; note?: string }
  | { ok: false; error: string };

/**
 * Move the bytes onto a domain TikTok will accept.
 *
 * Returns a GHL-hosted URL. See the note at the top of this file for why this
 * cannot be skipped even though the source URL is already public.
 */
async function uploadToGhlMedia(
  videoUrl: string,
  apiKey: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const src = await fetch(videoUrl, { cache: "no-store" });
    if (!src.ok) return { ok: false, error: `could not fetch video (${src.status})` };
    const bytes = await src.arrayBuffer();

    const name = (videoUrl.split("/").pop() || "video.mp4").split("?")[0];
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: "video/mp4" }), name);

    // No Content-Type header on purpose — fetch sets the multipart boundary,
    // and setting it by hand produces a body the server cannot parse.
    const up = await fetch(`${GHL_API_BASE}/medias/upload-file`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, Version: "2021-07-28" },
      body: form,
      cache: "no-store",
    });
    const text = await up.text();
    if (!up.ok) return { ok: false, error: `media upload ${up.status}: ${text.slice(0, 200)}` };

    const j = JSON.parse(text) as Record<string, any>;
    const url = j?.url ?? j?.fileUrl ?? j?.link ?? "";
    if (!url) return { ok: false, error: `upload returned no URL: ${text.slice(0, 200)}` };
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function publishToTikTokViaGhl(
  input: TikTokGhlPublishInput,
): Promise<TikTokGhlPublishResult> {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!apiKey || !locationId) {
    return { ok: false, error: "GHL_API_KEY / GHL_LOCATION_ID are not set." };
  }
  if (!input.videoUrl) return { ok: false, error: "No video URL on the queued item." };
  if (!input.accountId) return { ok: false, error: "No GHL TikTok account id configured." };

  const caption = input.caption.slice(0, TIKTOK_GHL_CAPTION_LIMIT);

  let userId = input.userId;
  if (!userId) {
    const resolved = await resolveGhlPostingUser();
    if (!resolved.ok) {
      /* The reason goes into the error string because that string is what ends
         up in publisher_queue.results, which is the only record that outlives
         the run. */
      return { ok: false, error: `Could not resolve a GHL user to post as — ${resolved.reason}` };
    }
    userId = resolved.id;
  }

  const uploaded = await uploadToGhlMedia(input.videoUrl, apiKey);
  if (!uploaded.ok) return { ok: false, error: uploaded.error };

  try {
    const res = await fetch(`${GHL_API_BASE}/social-media-posting/${locationId}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accountIds: [input.accountId],
        type: "post",
        summary: caption,
        userId,
        media: [{ url: uploaded.url, type: "video/mp4" }],
      }),
      cache: "no-store",
    });

    const text = await res.text();
    if (!res.ok) {
      return { ok: false, error: `GHL ${res.status}: ${text.slice(0, 300)}` };
    }

    let id = "";
    try {
      const j = JSON.parse(text) as Record<string, any>;
      id = j?.results?.post?._id ?? j?.post?._id ?? j?._id ?? j?.id ?? "";
    } catch {
      // A 2xx with an unparseable body still means GHL accepted it. Losing the
      // id is a reporting gap; treating it as a failure would cause a re-post.
    }

    return {
      ok: true,
      id: id || "accepted",
      note: "queued through GoHighLevel — appears in the GHL social planner",
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Which GHL social account is the TikTok one.
 *
 * GHL_SOCIAL_ACCOUNTS is a comma-separated list of opaque ids whose only clue
 * to platform is a suffix. Rather than parse that, the live account list is
 * asked — it is one call, it is authoritative, and it notices when an account
 * is disconnected or re-authorised under a new id.
 */
export async function findGhlTikTokAccountId(): Promise<string | null> {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!apiKey || !locationId) return null;
  try {
    const r = await fetch(`${GHL_API_BASE}/social-media-posting/${locationId}/accounts`, {
      headers: { Authorization: `Bearer ${apiKey}`, Version: "2021-07-28", Accept: "application/json" },
      cache: "no-store",
    });
    if (!r.ok) return null;
    const j = (await r.json()) as Record<string, any>;
    const accounts: any[] = j?.results?.accounts ?? j?.accounts ?? [];
    const tk = accounts.find((a) => String(a?.platform).toLowerCase() === "tiktok" && !a?.expired);
    return tk?.id ?? null;
  } catch {
    return null;
  }
}
