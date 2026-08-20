/**
 * Publishing to TikTok. WRITTEN BUT NOT YET USABLE — see the gate below.
 *
 * THIS CANNOT WORK UNTIL TWO THINGS HAPPEN, and both are outside the codebase:
 *
 *   1. The app must be granted the `video.publish` scope, and the connected
 *      user must have authorised it. The tokens this project holds were minted
 *      for user.info.basic / user.info.profile / user.info.stats / video.list —
 *      read scopes only. Adding the scope means re-authorising; an existing
 *      token does not gain it.
 *   2. The app must pass TikTok's audit. Until it does, TikTok's own words are
 *      "All content posted by unaudited clients will be restricted to private
 *      viewing mode" — so a post would succeed and be invisible.
 *
 * That is why publisher_connections seeds tiktok with enabled = false. The code
 * is here so that approval is a switch rather than a project.
 *
 * FILE_UPLOAD, NOT PULL_FROM_URL, and the reason is worth keeping. PULL_FROM_URL
 * makes TikTok fetch the MP4 itself, which requires proving ownership of the URL
 * prefix in the developer portal. Our videos are served from a Supabase storage
 * domain we do not own and cannot verify. FILE_UPLOAD pushes the bytes and needs
 * no verification at all.
 *
 * UNVERIFIED: the status-polling endpoint. The init and upload calls below are
 * written from TikTok's direct-post reference. The reference page did not
 * document a status endpoint, so `/v2/post/publish/status/fetch/` is an
 * educated guess and is treated as best-effort — a failure to read status does
 * NOT fail the publish. Confirm it against the docs when the app is approved,
 * rather than trusting this comment.
 */

const API = "https://open.tiktokapis.com/v2";

/** TikTok's documented title ceiling, in UTF-16 runes. */
export const TIKTOK_TITLE_LIMIT = 2200;

/**
 * Chunk sizing, from TikTok's media transfer guide: each chunk at least 5MB and
 * no more than 64MB, with the final chunk allowed to run over. A video under
 * 5MB must go as a single chunk — which is what these vertical clips will be.
 */
const MIN_CHUNK = 5 * 1024 * 1024;
const MAX_CHUNK = 64 * 1024 * 1024;

export interface TikTokPublishInput {
  accessToken: string;
  video: Buffer;
  title: string;
  /**
   * Defaults to SELF_ONLY, which is deliberate rather than cautious-by-habit:
   * an unaudited client cannot post publicly anyway, so asking for
   * PUBLIC_TO_EVERYONE before approval invites a refusal that reads like a bug.
   */
  privacyLevel?: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR" | "SELF_ONLY";
}

export type TikTokPublishResult =
  | { ok: true; publishId: string; status?: string }
  | { ok: false; error: string; stage: "init" | "upload" };

/** One chunk for anything small, otherwise even chunks inside the bounds. */
function planChunks(size: number): { chunkSize: number; count: number } {
  if (size <= MIN_CHUNK) return { chunkSize: size, count: 1 };
  const chunkSize = Math.min(MAX_CHUNK, MIN_CHUNK);
  // The last chunk absorbs the remainder rather than becoming a short chunk of
  // its own, which TikTok rejects when it falls under the 5MB floor.
  const count = Math.floor(size / chunkSize);
  return { chunkSize, count };
}

export async function publishToTikTok(
  input: TikTokPublishInput
): Promise<TikTokPublishResult> {
  const { accessToken, video, title, privacyLevel = "SELF_ONLY" } = input;
  const { chunkSize, count } = planChunks(video.length);

  // 1. Initialize.
  let publishId: string;
  let uploadUrl: string;
  try {
    const res = await fetch(`${API}/post/publish/video/init/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: title.slice(0, TIKTOK_TITLE_LIMIT),
          privacy_level: privacyLevel,
          disable_duet: false,
          disable_stitch: false,
          disable_comment: false,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: video.length,
          chunk_size: chunkSize,
          total_chunk_count: count,
        },
      }),
      signal: AbortSignal.timeout(60000),
    });
    const body: any = await res.json().catch(() => ({}));
    publishId = body?.data?.publish_id;
    uploadUrl = body?.data?.upload_url;
    if (!res.ok || !publishId || !uploadUrl) {
      return { ok: false, stage: "init", error: `${res.status}: ${JSON.stringify(body).slice(0, 300)}` };
    }
  } catch (e) {
    return { ok: false, stage: "init", error: String((e as Error)?.message ?? e) };
  }

  // 2. Upload the chunks. Content-Range is required and its total is the whole
  // file, not the chunk — getting that wrong is accepted at upload and fails
  // later at assembly, which is much harder to diagnose.
  for (let i = 0; i < count; i++) {
    const first = i * chunkSize;
    const last = i === count - 1 ? video.length - 1 : first + chunkSize - 1;
    const chunk = video.subarray(first, last + 1);
    try {
      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": String(chunk.length),
          "Content-Range": `bytes ${first}-${last}/${video.length}`,
        },
        body: new Uint8Array(chunk),
        signal: AbortSignal.timeout(180000),
      });
      if (!put.ok) {
        return {
          ok: false,
          stage: "upload",
          error: `chunk ${i + 1}/${count} HTTP ${put.status}: ${(await put.text()).slice(0, 200)}`,
        };
      }
    } catch (e) {
      return {
        ok: false,
        stage: "upload",
        error: `chunk ${i + 1}/${count}: ${String((e as Error)?.message ?? e)}`,
      };
    }
  }

  // 3. Status, best-effort. The upload succeeded either way; an unreadable
  // status is a reporting gap, not a failed post, and must not be turned into
  // one.
  let status: string | undefined;
  try {
    const res = await fetch(`${API}/post/publish/status/fetch/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: publishId }),
      signal: AbortSignal.timeout(30000),
    });
    const body: any = await res.json().catch(() => ({}));
    status = body?.data?.status;
  } catch {
    /* unverified endpoint — silence is expected here, not alarming */
  }

  return { ok: true, publishId, status };
}
