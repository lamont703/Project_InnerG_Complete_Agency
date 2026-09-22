/**
 * Uploading a Short to YouTube.
 *
 * MOVED OUT OF THE CRON so that a republish uses the SAME code a scheduled slot
 * does. The alternative — a second copy in a script — is the drift that has
 * already bitten this project repeatedly: two implementations of one API call
 * disagree quietly, and the one nobody runs daily is the one that rots.
 *
 * IT TAKES BYTES, NOT A URL. The publisher fetches the MP4 once and shares it
 * with every platform that needs it; downloading it again here would waste the
 * slot's budget and add another way to fail.
 */

import { googleClient } from "@/lib/google-clients";
import { buildYouTubeDescription, YOUTUBE_TAGS } from "@/lib/admin/publisher-copy";

export async function youtubeAccessToken(): Promise<string> {
  /*
   * RESOLVED BY PURPOSE, not read from YOUTUBE_CLIENT_ID directly.
   *
   * YouTube was the last integration still riding on the shared customer-facing
   * OAuth client. When the old Business Profile connection was disconnected, it
   * revoked the grant on that client and the YouTube refresh token died with
   * it — a slot failed with invalid_grant, "Token has been expired or revoked",
   * and nothing about YouTube had changed.
   *
   * googleClient("youtube") prefers the dedicated GOOGLE_YOUTUBE_CLIENT_ID and
   * returns the id, secret and refresh token as ONE triple, so a client cannot
   * be swapped without its token coming along. That pairing is the actual fix;
   * the rename is incidental.
   */
  const { clientId, clientSecret, refreshToken } = googleClient("youtube");
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("YouTube credentials are not configured (GOOGLE_YOUTUBE_CLIENT_ID / _SECRET / YOUTUBE_REFRESH_TOKEN)");
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body });
  const j = await r.json();
  if (!j.access_token) throw new Error(`token refresh failed: ${JSON.stringify(j).slice(0, 200)}`);
  return j.access_token as string;
}

/**
 * THE CHANNEL UPLOADS GO TO: @shearqueryai.
 *
 * TWO CHANNELS SHARE THE TITLE "ShearQuery by Inner G Complete Agency", and
 * nothing in an upload response says which one received the video. The token
 * above (youtubeAccessToken) belongs to the OLDER one, @shearquery
 * (UC0gJXad-Y8_Mlg8rMN8U57Q, 508 videos), and every publisher upload went there
 * until 2026-09-22 — found by looking up the channelId of the last eight
 * youtube_ids, not by any error. That token stays as it is, because the comment
 * sync and the reporting scripts READ the older channel through it.
 *
 * So uploads get their own credential, and the channel is checked on every
 * upload rather than trusted: a token minted against the wrong account uploads
 * happily and the title check that looks right cannot tell the two apart.
 */
export const YOUTUBE_PUBLISH_CHANNEL_ID = "UC2R_pYoza1bxm-iOhWtO6AA";

/** Refuses unless the token's own channel is the publishing channel. */
export function assertPublishChannel(channelIds: string[]): void {
  if (channelIds.length !== 1 || channelIds[0] !== YOUTUBE_PUBLISH_CHANNEL_ID) {
    throw new Error(
      `YouTube publish token belongs to ${channelIds.join(", ") || "no channel"}, ` +
        `not @shearqueryai (${YOUTUBE_PUBLISH_CHANNEL_ID}) — refusing to upload to the wrong channel`
    );
  }
}

/**
 * Access token for UPLOADS ONLY, from GOOGLE_YOUTUBE_PUBLISH_REFRESH_TOKEN.
 *
 * NO FALLBACK to the purpose chain. Falling back is exactly how uploads ended up
 * on the older channel; a missing variable should stop YouTube publishing
 * loudly, not quietly redirect it. The client id and secret still come from
 * googleClient("youtube") — a refresh token belongs to the client that minted
 * it, and scripts/youtube_oauth_setup.js mints with that client.
 */
export async function youtubePublishAccessToken(): Promise<string> {
  const { clientId, clientSecret } = googleClient("youtube");
  const refreshToken = process.env.GOOGLE_YOUTUBE_PUBLISH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("GOOGLE_YOUTUBE_PUBLISH_REFRESH_TOKEN is not set — YouTube publishing is off until it points at @shearqueryai");
  }
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`publish token refresh failed: ${JSON.stringify(j).slice(0, 200)}`);

  // 1 quota unit. Cheap insurance against the silent failure described above.
  const ch = await fetch("https://www.googleapis.com/youtube/v3/channels?part=id&mine=true", {
    headers: { Authorization: `Bearer ${j.access_token}` },
  });
  if (!ch.ok) throw new Error(`channel check ${ch.status}: ${(await ch.text()).slice(0, 200)}`);
  assertPublishChannel(((await ch.json()).items ?? []).map((i: { id: string }) => i.id));
  return j.access_token as string;
}

/**
 * Upload to YouTube. Takes the bytes rather than fetching them, so the same
 * download serves every platform that needs the file.
 */
export async function publishToYouTube(
  row: any,
  bytes: Buffer
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const token = await youtubePublishAccessToken();

    const metadata = {
      snippet: {
        title: String(row.title).slice(0, 100),
        description: buildYouTubeDescription(row),
        tags: YOUTUBE_TAGS,
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
      body: new Uint8Array(bytes),
    });
    const text = await put.text();
    if (!put.ok) throw new Error(`upload ${put.status}: ${text.slice(0, 300)}`);
    const id = JSON.parse(text).id;

    /*
     * THE THUMBNAIL IS BEST-EFFORT AND ITS FAILURE IS NOT THE UPLOAD'S FAILURE.
     * YouTube's own help page says custom thumbnails for Shorts "are currently
     * only available to add in YouTube Studio on a computer", and there is an
     * open feature request to expose it through the API. thumbnails.set may
     * therefore refuse, or accept and not apply it to the Shorts player.
     *
     * It is still worth the call: the method is documented for videos, the
     * channel is verified, and a thumbnail that only takes effect in search
     * results and on the channel page is better than none. What is NOT
     * acceptable is turning a published Short into a "failed" row because the
     * cover did not stick - so this swallows its own errors and only logs.
     */
    if (row.thumbnail_url) {
      try {
        const img = await fetch(row.thumbnail_url);
        if (!img.ok) throw new Error(`cover fetch HTTP ${img.status}`);
        const cover = Buffer.from(await img.arrayBuffer());
        // 2MB is the documented ceiling for thumbnails.set - smaller than the
        // 8MB Instagram allows, so a cover can pass one and fail the other.
        if (cover.length > 2 * 1024 * 1024) {
          throw new Error(`cover is ${Math.round(cover.length / 1024)}KB, over the 2MB limit`);
        }
        const t = await fetch(
          `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${id}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/jpeg" },
            body: new Uint8Array(cover),
          }
        );
        if (!t.ok) throw new Error(`thumbnails.set ${t.status}: ${(await t.text()).slice(0, 200)}`);
        console.log(`[publish-content] thumbnail set on ${id}`);
      } catch (e) {
        console.warn(`[publish-content] thumbnail skipped on ${id}: ${String((e as Error)?.message ?? e)}`);
      }
    }

    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e).slice(0, 500) };
  }
}
