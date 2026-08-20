/**
 * Publishing to X: chunked media upload, then a post.
 *
 * THREE DEDICATED PATHS, NOT ONE ENDPOINT WITH A command PARAMETER. This is
 * the correction that cost a live slot on 2026-08-20. The first version posted
 * multipart form data with `command=INIT` to `/2/media/upload`, which is the
 * shape the v1.1 API used and which several current-looking guides still show.
 * X answered:
 *
 *   400 "Missing media field in JSON"  {"parameters":{"media":[]}}
 *
 * - an error that names neither the endpoint nor the real problem, and reads
 * like a malformed upload rather than the wrong URL entirely. What actually
 * exists is a separate path per step:
 *
 *   1. POST /2/media/upload/initialize      JSON, returns the media id
 *   2. POST /2/media/upload/{id}/append     multipart, one call per chunk
 *   3. POST /2/media/upload/{id}/finalize   no body, returns processing_info
 *   4. GET  /2/media/upload?media_id={id}   polled until state is 'succeeded'
 *
 * The id goes in the PATH for append and finalize, not the body.
 *
 * POSTING BEFORE PROCESSING FINISHES FAILS. Unlike LinkedIn, X will reject a
 * post that references a media_id still being transcoded, so step 4 is a real
 * dependency rather than a nicety. The response tells you how long to wait via
 * check_after_secs; honouring it is better than a fixed interval because the
 * value grows with the size of the file.
 *
 * THE REFRESH TOKEN ROTATES ON USE. X returns a NEW refresh token every time
 * one is redeemed and invalidates the old one. Whatever calls this must persist
 * the returned token immediately - dropping it means the next publish cannot
 * authenticate and the connection has to be re-authorised by hand. That is why
 * refreshXToken is exported separately rather than hidden inside the publish
 * call: the caller owns the write.
 */

const API = "https://api.x.com/2";

/** X counts a post in UTF-8-ish characters; anything longer is a 400. */
export const X_TEXT_LIMIT = 280;

/**
 * 4MB chunks. X's documented ceiling per APPEND is 5MB; staying under it with a
 * round number leaves room for the multipart envelope, which counts toward the
 * request size and would otherwise make a 5MB chunk marginally too big.
 */
const CHUNK_SIZE = 4 * 1024 * 1024;

export interface XPublishInput {
  accessToken: string;
  video: Buffer;
  text: string;
}

export type XPublishResult =
  | { ok: true; postId: string; url: string }
  | { ok: false; error: string; stage: XStage };

type XStage = "init" | "append" | "finalize" | "processing" | "post";

/**
 * Redeem a refresh token. Returns the NEW pair — persist both.
 *
 * Separate from publishing on purpose: the caller has the database handle and
 * must write the rotated refresh token before the next publish, and burying
 * that in the publish path makes it easy to lose on an error branch.
 */
export type XRefreshFailure = "not_configured" | "refused" | "transient";

export async function refreshXToken(refreshToken: string): Promise<
  | { ok: true; accessToken: string; refreshToken: string; expiresInSecs: number }
  | { ok: false; error: string; reason: XRefreshFailure }
> {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  /*
   * A MISSING CLIENT IS NOT A DEAD GRANT, and the difference decides what the
   * caller does about it. Collapsing the two would let an unset environment
   * variable mark a perfectly good connection 'revoked' - sending someone
   * through a consent screen to re-authorise a token that was never the
   * problem, and which would be marked revoked again on the next slot.
   */
  if (!clientId || !clientSecret) {
    return {
      ok: false,
      reason: "not_configured",
      error: "TWITTER_CLIENT_ID / TWITTER_CLIENT_SECRET are not set in this environment",
    };
  }

  try {
    const res = await fetch(`${API}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
      signal: AbortSignal.timeout(30000),
    });
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok || !body?.access_token) {
      /*
       * Only a 4xx means X actually rejected the token. A 5xx or a rate limit
       * is X having a bad minute and will very likely work at the next slot -
       * treating it as a revoked grant would throw away a live connection over
       * a transient blip.
       */
      const reason: XRefreshFailure =
        res.status >= 400 && res.status < 500 && res.status !== 429 ? "refused" : "transient";
      return { ok: false, reason, error: `${res.status}: ${JSON.stringify(body).slice(0, 300)}` };
    }
    return {
      ok: true,
      accessToken: body.access_token,
      // If X ever omits it, keeping the old one is better than storing
      // undefined and losing the connection outright.
      refreshToken: body.refresh_token ?? refreshToken,
      expiresInSecs: Number(body.expires_in ?? 7200),
    };
  } catch (e) {
    // A thrown fetch is a network problem, never a verdict on the token.
    return { ok: false, reason: "transient", error: String((e as Error)?.message ?? e) };
  }
}

/**
 * Trim to the post limit on a word boundary.
 *
 * Exported because it is the thing most worth testing: a caption one character
 * over produces a 400 with no hint about which field, and every builder feeding
 * this has to respect the same ceiling.
 */
export function fitToXLimit(text: string, limit: number = X_TEXT_LIMIT): string {
  const clean = text.trim();
  if (clean.length <= limit) return clean;
  // One character is reserved for the ellipsis, so the result is always inside
  // the limit rather than exactly on it.
  const room = limit - 1;
  const cut = clean.slice(0, room);
  const lastSpace = cut.lastIndexOf(" ");
  // Only break on a word if that does not throw away most of the text - a long
  // unbroken string (a URL) has no space and should be cut where it lands.
  const body = lastSpace > room * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${body.trimEnd()}…`;
}

/**
 * POST a multipart body to a media path.
 *
 * Content-Type is deliberately NOT set - fetch derives it from the FormData
 * along with the multipart boundary, and setting it by hand produces a header
 * with no boundary, which the server cannot parse.
 */
async function mediaPost(
  accessToken: string,
  path: string,
  form: FormData,
  timeoutMs = 120000
): Promise<{ status: number; body: any }> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
    signal: AbortSignal.timeout(timeoutMs),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

/**
 * Upload the video and return its media id. NOTHING IS POSTED.
 *
 * Separated from publishToX precisely because this is the half that broke: the
 * media pipeline is four calls against endpoints that changed shape, while
 * creating the post is one obvious call. Uploaded media is invisible until a
 * post references it and X expires an unused upload on its own, so this can be
 * run against the live API as a real check without putting anything on the
 * timeline - see lib/x-publish.live.test.ts.
 */
export async function uploadVideoToX(
  accessToken: string,
  video: Buffer
): Promise<{ ok: true; mediaId: string } | { ok: false; error: string; stage: XStage }> {

  // 1. Initialize. JSON, not multipart - this is the step that was wrong.
  let mediaId: string;
  {
    try {
      const res = await fetch(`${API}/media/upload/initialize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          media_type: "video/mp4",
          total_bytes: video.length,
          // Without tweet_video X treats the upload as an image and finalize
          // rejects an MP4 with an error that does not mention the category.
          media_category: "tweet_video",
        }),
        signal: AbortSignal.timeout(30000),
      });
      const body: any = await res.json().catch(() => ({}));
      // The v2 response nests under data; older shapes returned it flat, and
      // reading only one of the two turns a success into "no media id".
      mediaId = body?.data?.id ?? body?.id ?? body?.media_id_string;
      if (!res.ok || !mediaId) {
        return { ok: false, stage: "init", error: `${res.status}: ${JSON.stringify(body).slice(0, 300)}` };
      }
    } catch (e) {
      return { ok: false, stage: "init", error: String((e as Error)?.message ?? e) };
    }
  }

  // 2. APPEND — sequential, because segment_index must be contiguous.
  const chunks = Math.ceil(video.length / CHUNK_SIZE);
  for (let i = 0; i < chunks; i++) {
    const slice = video.subarray(i * CHUNK_SIZE, Math.min((i + 1) * CHUNK_SIZE, video.length));
    const form = new FormData();
    form.append("segment_index", String(i));
    form.append("media", new Blob([new Uint8Array(slice)], { type: "application/octet-stream" }));

    try {
      // The media id is a PATH segment here. Sending it in the body instead is
      // what the command-style API wanted and is silently ignored by this one.
      const { status, body } = await mediaPost(
        accessToken,
        `/media/upload/${encodeURIComponent(mediaId)}/append`,
        form
      );
      // A successful append may answer with an empty body, so an empty parse is
      // expected here rather than a problem.
      if (status >= 400) {
        return {
          ok: false,
          stage: "append",
          error: `chunk ${i + 1}/${chunks} ${status}: ${JSON.stringify(body).slice(0, 200)}`,
        };
      }
    } catch (e) {
      return {
        ok: false,
        stage: "append",
        error: `chunk ${i + 1}/${chunks}: ${String((e as Error)?.message ?? e)}`,
      };
    }
  }

  // 3. Finalize. Documented as taking NO body at all.
  let processing: any;
  {
    try {
      const res = await fetch(`${API}/media/upload/${encodeURIComponent(mediaId)}/finalize`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(60000),
      });
      const body: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, stage: "finalize", error: `${res.status}: ${JSON.stringify(body).slice(0, 300)}` };
      }
      processing = body?.data?.processing_info ?? body?.processing_info;
    } catch (e) {
      return { ok: false, stage: "finalize", error: String((e as Error)?.message ?? e) };
    }
  }

  /*
   * 4. STATUS — only when FINALIZE said transcoding is still running.
   *
   * Bounded at roughly five minutes. These are sub-minute vertical clips; a
   * file still pending after that is stuck, and an unbounded loop inside a cron
   * slot is how one bad upload eats the whole invocation.
   */
  if (processing && processing.state !== "succeeded") {
    const deadline = Date.now() + 5 * 60 * 1000;
    let waitSecs = Number(processing.check_after_secs ?? 5);

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, Math.max(1, waitSecs) * 1000));
      try {
        const res = await fetch(
          `${API}/media/upload?media_id=${encodeURIComponent(mediaId)}`,
          { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(30000) }
        );
        const body: any = await res.json().catch(() => ({}));
        const info = body?.data?.processing_info ?? body?.processing_info;
        const state = info?.state;

        if (state === "succeeded") { processing = info; break; }
        if (state === "failed") {
          return {
            ok: false,
            stage: "processing",
            error: `transcode failed: ${JSON.stringify(info?.error ?? info).slice(0, 250)}`,
          };
        }
        waitSecs = Number(info?.check_after_secs ?? waitSecs);
      } catch {
        /* a transient read is not a verdict — keep polling until the deadline */
      }
    }

    if (processing?.state !== "succeeded") {
      return { ok: false, stage: "processing", error: "media never finished processing within 5 minutes" };
    }
  }

  return { ok: true, mediaId };
}

export async function publishToX(input: XPublishInput): Promise<XPublishResult> {
  const { accessToken, video, text } = input;

  const uploaded = await uploadVideoToX(accessToken, video);
  if (!uploaded.ok) return { ok: false, stage: uploaded.stage, error: uploaded.error };
  const mediaId = uploaded.mediaId;

  try {
    const res = await fetch(`${API}/tweets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: fitToXLimit(text), media: { media_ids: [mediaId] } }),
      signal: AbortSignal.timeout(60000),
    });
    const body: any = await res.json().catch(() => ({}));
    const postId = body?.data?.id;
    if (!res.ok || !postId) {
      return { ok: false, stage: "post", error: `${res.status}: ${JSON.stringify(body).slice(0, 300)}` };
    }
    return { ok: true, postId, url: `https://x.com/i/web/status/${postId}` };
  } catch (e) {
    return { ok: false, stage: "post", error: String((e as Error)?.message ?? e) };
  }
}
