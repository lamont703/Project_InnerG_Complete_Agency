import "server-only";

/**
 * Reading TikTok comments, which only exists because GoHighLevel sits in the
 * middle.
 *
 * TIKTOK'S OWN API CANNOT DO THIS. Its published developer scopes are
 * user.info.basic, user.info.stats, video.list, video.publish and video.upload
 * — there is no comment scope of any kind. The only first-party way to read
 * comments is the Research API, which is read-only and not for commercial use.
 * GoHighLevel evidently holds partner access that the public docs do not
 * describe, and this file is the whole benefit of publishing through them.
 *
 * THE REQUEST SHAPE COST SEVERAL WRONG GUESSES, so it is written down exactly.
 * `originIds` is the ACCOUNT's originId — not the post id, and not the TikTok
 * video id. Passing video ids returns a valid, cheerful, permanently empty
 * result, which is the worst kind of wrong answer because nothing looks broken.
 *
 * Comments are TWO LEVELS DEEP. The list returns thread roots, which are the
 * posts themselves (isPost: true) carrying a replyCount. The actual comments
 * come back only when the root's _id is passed as `parentId`.
 *
 *   POST /social-media-posting/comments/tiktok/list?locationId={loc}
 *     { originIds: ["<account originId>"], limit: 100 }   -> roots
 *     { originIds: [...], parentId: "<root _id>" }        -> the comments
 *
 * REPLYING IS POSSIBLE — see postTikTokCommentReply at the bottom. An earlier
 * version of this comment said it was not, on the strength of four guessed
 * paths returning 404. That was wrong, and it nearly cost a working feature.
 */

const GHL = "https://services.leadconnectorhq.com";

export interface TikTokComment {
  /** GoHighLevel's id — what its API and workflow builder both key on. */
  id: string;
  /** TikTok's own id for the comment. */
  platformCommentId: string | null;
  /** TikTok's id for the post it sits under. */
  platformPostId: string | null;
  authorName: string | null;
  /**
   * An opaque per-account token, NOT a TikTok user id. Unlike Instagram — where
   * the comment and messaging webhooks turned out to share one scoped id — this
   * cannot be joined to anything else, so a returning commenter can only be
   * recognised by this string and it may not be stable.
   */
  authorId: string | null;
  content: string;
  publishedAt: string | null;
  isRead: boolean;
  likeCount: number;
}

function headers(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    Version: "2021-07-28",
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function listComments(
  apiKey: string,
  locationId: string,
  body: Record<string, unknown>
): Promise<any[]> {
  const r = await fetch(
    `${GHL}/social-media-posting/comments/tiktok/list?locationId=${encodeURIComponent(locationId)}`,
    { method: "POST", headers: headers(apiKey), body: JSON.stringify(body), signal: AbortSignal.timeout(20000) }
  );
  if (!r.ok) throw new Error(`GHL comments list ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json().catch(() => ({}));
  return j?.results?.comments ?? [];
}

/** The TikTok account's originId, which every comment call is keyed on. */
export async function tiktokAccountOriginId(
  apiKey: string,
  locationId: string
): Promise<string | null> {
  const r = await fetch(`${GHL}/social-media-posting/${locationId}/accounts`, {
    headers: headers(apiKey),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) return null;
  const j = await r.json().catch(() => ({}));
  const accounts = j?.results?.accounts ?? j?.accounts ?? [];
  const tiktok = accounts.find((a: any) => a.platform === "tiktok");
  return tiktok?.originId ?? null;
}

/**
 * Every comment across the account, newest post first.
 *
 * One call per thread that actually has replies — replyCount is checked before
 * asking, because a root with none would cost a round trip to learn nothing and
 * most posts have no comments at all.
 */
export async function fetchTikTokComments(input: {
  apiKey: string;
  locationId: string;
  originId: string;
  maxThreads?: number;
}): Promise<TikTokComment[]> {
  const roots = await listComments(input.apiKey, input.locationId, {
    originIds: [input.originId],
    limit: 100,
  });

  const withReplies = roots
    .filter((r: any) => (r.replyCount ?? 0) > 0)
    .slice(0, input.maxThreads ?? 25);

  const out: TikTokComment[] = [];
  for (const root of withReplies) {
    const replies = await listComments(input.apiKey, input.locationId, {
      originIds: [input.originId],
      parentId: root._id,
      limit: 50,
    });
    for (const c of replies) {
      if (c.isPost) continue;
      out.push({
        id: c._id,
        platformCommentId: c.platformCommentId ?? null,
        platformPostId: c.platformPostId ?? root.platformPostId ?? null,
        authorName: c.author?.name ?? c.author?.username ?? null,
        authorId: c.author?.id ?? null,
        content: String(c.content ?? ""),
        publishedAt: c.publishedAt ?? c.createdAt ?? null,
        isRead: Boolean(c.isRead),
        likeCount: c.likeCount ?? 0,
      });
    }
  }

  return out.sort((a, b) => String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? "")));
}

/**
 * Reply to a TikTok comment, publicly, through GoHighLevel.
 *
 * THIS WAS WRONGLY BELIEVED IMPOSSIBLE, and the mistake is worth recording
 * because it nearly shipped a copy-and-paste workflow around a working API.
 * Four guessed paths — /create, /reply, /{id}/reply, /{id}/replies — all
 * returned 404, and that was taken as proof no reply endpoint existed. The real
 * one has no suffix at all:
 *
 *   POST /social-media-posting/comments/{platform}?locationId={loc}
 *     { parentId, isParentThread, content }
 *
 * Found by probing the bare path and reading the schema off the 422s rather
 * than guessing more names. A 404 means the path is wrong; only a 422 tells you
 * the path is right.
 *
 * parentId IS GOHIGHLEVEL'S ID, a 24-character hex string — the `_id` on a
 * comment, not TikTok's platformCommentId. The API validates the format, so
 * passing TikTok's 19-digit numeric id fails with a message about HighLevel IDs
 * rather than anything about the comment.
 *
 * isParentThread FALSE means this is a reply to a comment. True would make it a
 * top-level comment on the post itself, which is not what answering somebody
 * means.
 */
export async function postTikTokCommentReply(input: {
  apiKey: string;
  locationId: string;
  /** GoHighLevel's 24-char comment id — NOT TikTok's platformCommentId. */
  parentId: string;
  content: string;
}): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const content = String(input.content || "").trim();
  if (!content) return { ok: false, error: "empty reply" };
  if (!/^[0-9a-f]{24}$/i.test(input.parentId)) {
    return { ok: false, error: `parentId must be a 24-char HighLevel id, got "${input.parentId}"` };
  }

  try {
    const r = await fetch(
      `${GHL}/social-media-posting/comments/tiktok?locationId=${encodeURIComponent(input.locationId)}`,
      {
        method: "POST",
        headers: headers(input.apiKey),
        body: JSON.stringify({ parentId: input.parentId, isParentThread: false, content }),
        signal: AbortSignal.timeout(20000),
      }
    );
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = Array.isArray(body?.message) ? body.message.join("; ") : body?.message;
      return { ok: false, error: msg || `reply failed (${r.status})` };
    }
    return { ok: true, id: body?.results?._id ?? body?.id };
  } catch (err: any) {
    return { ok: false, error: err?.message || "reply threw" };
  }
}
