import "server-only";

/**
 * Publishing to Instagram: container, then publish.
 *
 * TWO CALLS, NEVER ONE. Instagram will not take a post in a single request. You
 * create a media CONTAINER, which is a staged, invisible object, and then you
 * publish it. That split is useful rather than annoying: a container proves the
 * image is reachable and the permissions are granted, and creating one costs
 * nothing and shows nobody anything. It is how content_publish was verified on
 * this account before a single post existed.
 *
 * A CAROUSEL IS THE SAME SHAPE WITH ONE MORE LAYER — a container per image,
 * then a parent container listing the children, then publish. A single image is
 * modelled as a carousel of one so there is one code path; the difference lives
 * in the data.
 *
 * INSTAGRAM FETCHES THE IMAGE ITSELF, so image_url must be publicly reachable
 * over the open internet. A localhost URL, a signed URL, or anything behind
 * auth fails at container creation with an error that does not say so clearly.
 *
 * TAGGING IS DELIBERATELY NOT AUTOMATIC HERE. user_tags is passed through from
 * the queue row, and that row is written by a human-reviewed process. Every
 * handle we hold was scraped and none is verified; tagging the wrong account is
 * a mistake made in public with someone else's name on it.
 */

const IG = "https://graph.instagram.com";

export interface PublishInput {
  igUserId: string;
  accessToken: string;
  imageUrls: string[];
  caption: string;
  /** Handles WITHOUT the @, already reviewed. */
  tagHandles?: string[];
}

export interface PublishResult {
  ok: boolean;
  mediaId?: string;
  permalink?: string;
  error?: string;
  /** Which step failed, because "it didn't post" is not a diagnosis. */
  stage?: "child_container" | "parent_container" | "publish" | "permalink";
}

async function igPost(path: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${IG}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

export async function publishToInstagram(input: PublishInput): Promise<PublishResult> {
  const { igUserId, accessToken, imageUrls, caption } = input;
  if (!imageUrls.length) return { ok: false, error: "no images", stage: "child_container" };

  const tags = (input.tagHandles || []).filter(Boolean).map((h) => ({ username: h.replace(/^@/, "") }));
  const single = imageUrls.length === 1;

  // --- containers -------------------------------------------------------
  const childIds: string[] = [];
  for (const url of imageUrls) {
    const payload: Record<string, unknown> = { image_url: url, access_token: accessToken };
    if (single) {
      payload.caption = caption;
      if (tags.length) payload.user_tags = tags;
    } else {
      // Children of a carousel carry no caption; the parent does.
      payload.is_carousel_item = true;
      if (tags.length) payload.user_tags = tags;
    }
    const { status, body } = await igPost(`${igUserId}/media`, payload);
    if (!body?.id) {
      return {
        ok: false, stage: "child_container",
        error: body?.error?.message || `container failed (${status})`,
      };
    }
    childIds.push(body.id);
  }

  let publishId = childIds[0];

  if (!single) {
    const { status, body } = await igPost(`${igUserId}/media`, {
      media_type: "CAROUSEL",
      children: childIds,
      caption,
      access_token: accessToken,
    });
    if (!body?.id) {
      return { ok: false, stage: "parent_container", error: body?.error?.message || `carousel container failed (${status})` };
    }
    publishId = body.id;
  }

  // --- publish ----------------------------------------------------------
  const { status, body } = await igPost(`${igUserId}/media_publish`, {
    creation_id: publishId,
    access_token: accessToken,
  });
  if (!body?.id) {
    return { ok: false, stage: "publish", error: body?.error?.message || `publish failed (${status})` };
  }

  // The permalink is what makes a published row checkable by a human later.
  // Its absence is not a failure — the post is already live by this point.
  let permalink: string | undefined;
  try {
    const res = await fetch(`${IG}/${body.id}?fields=permalink&access_token=${accessToken}`, {
      signal: AbortSignal.timeout(15000),
    });
    const j = await res.json().catch(() => ({}));
    permalink = j?.permalink;
  } catch { /* already published; a missing link is cosmetic */ }

  return { ok: true, mediaId: body.id, permalink };
}
