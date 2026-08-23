import "server-only";

/**
 * Reading and answering YouTube comments.
 *
 * THE SIMPLEST OF THE THREE PLATFORMS, and the last one wired. Instagram needed
 * a webhook, an app review and a scoped-id investigation; TikTok needs
 * GoHighLevel standing in the middle because TikTok's own API has no comment
 * scope at all. YouTube needs neither — the token the Shorts publisher already
 * refreshes carries youtube.force-ssl, which is exactly what comments.insert
 * requires. Nothing new had to be authorised.
 *
 * QUOTA IS THE REAL CONSTRAINT HERE, not permission. comments.insert costs 50
 * units against the same daily allowance videos.insert draws on at roughly
 * 1,600 a go, and the publisher uploads three Shorts a day. Replies are cheap
 * individually and the uploads are not — so if the allowance is ever exhausted
 * it will be posting that stops, which is a far worse outcome than an
 * unanswered comment. Anything automatic here should be metered with that in
 * mind.
 */

const API = "https://www.googleapis.com/youtube/v3";

export interface YouTubeComment {
  /** The id comments.insert needs as parentId. */
  id: string;
  videoId: string;
  authorName: string | null;
  /** The commenter's channel id, stable across videos — unlike TikTok's opaque token. */
  authorChannelId: string | null;
  text: string;
  publishedAt: string | null;
  likeCount: number;
  totalReplyCount: number;
}

/**
 * A fresh access token from the stored refresh token.
 *
 * Duplicated from the publisher rather than shared because the publisher's copy
 * lives inside a route handler; if a third caller appears this is the moment to
 * lift it into one place.
 */
export async function youtubeAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID!,
    client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN!,
    grant_type: "refresh_token",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body });
  const j = await r.json();
  if (!j.access_token) throw new Error(`youtube token refresh failed: ${JSON.stringify(j).slice(0, 200)}`);
  return j.access_token as string;
}

/**
 * Top-level comments on one video.
 *
 * Only top-level threads are read. A reply inside a thread is usually somebody
 * talking to another commenter rather than to us, and answering those turns a
 * conversation between two strangers into one we have inserted ourselves into.
 */
export async function fetchVideoComments(input: {
  accessToken: string;
  videoId: string;
  max?: number;
}): Promise<YouTubeComment[]> {
  const url =
    `${API}/commentThreads?part=snippet&videoId=${encodeURIComponent(input.videoId)}` +
    `&maxResults=${input.max ?? 50}&order=time`;

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${input.accessToken}` },
    signal: AbortSignal.timeout(20000),
  });
  const j = await r.json().catch(() => ({}));

  /*
   * commentsDisabled is a normal state, not a fault — plenty of Shorts have
   * comments turned off — so it returns empty rather than throwing and filling
   * the log with something nobody needs to act on.
   */
  if (!r.ok) {
    const reason = j?.error?.errors?.[0]?.reason;
    if (reason === "commentsDisabled" || reason === "videoNotFound") return [];
    throw new Error(`commentThreads ${r.status}: ${JSON.stringify(j?.error ?? {}).slice(0, 200)}`);
  }

  return (j.items ?? []).map((item: any) => {
    const s = item.snippet.topLevelComment.snippet;
    return {
      id: item.snippet.topLevelComment.id,
      videoId: input.videoId,
      authorName: s.authorDisplayName ?? null,
      authorChannelId: s.authorChannelId?.value ?? null,
      text: String(s.textOriginal ?? s.textDisplay ?? ""),
      publishedAt: s.publishedAt ?? null,
      likeCount: s.likeCount ?? 0,
      totalReplyCount: item.snippet.totalReplyCount ?? 0,
    };
  });
}

/**
 * Reply under a comment, as the channel.
 *
 * parentId is the TOP-LEVEL comment's id. YouTube has no nesting beyond one
 * level, so replying to a reply still attaches to the thread root — which is
 * why only roots are read in the first place.
 */
export async function replyToComment(input: {
  accessToken: string;
  parentId: string;
  text: string;
}): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const text = String(input.text || "").trim();
  if (!text) return { ok: false, error: "empty reply" };

  try {
    const r = await fetch(`${API}/comments?part=snippet`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ snippet: { parentId: input.parentId, textOriginal: text } }),
      signal: AbortSignal.timeout(20000),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = j?.error?.errors?.[0];
      return { ok: false, error: e ? `${e.reason}: ${e.message}` : `reply failed (${r.status})` };
    }
    return { ok: true, id: j?.id };
  } catch (err: any) {
    return { ok: false, error: err?.message || "reply threw" };
  }
}
