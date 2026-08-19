/**
 * Publishing to Instagram: container, then publish.
 *
 * NOT MARKED server-only, deliberately. It takes the token and account id as
 * ARGUMENTS rather than reading them from the environment, so there is nothing
 * here for a client bundle to leak — and scripts need to import it. The
 * alternative was a second copy of the container-then-publish sequence in
 * scripts/, which is the kind of duplication that drifts and then fails
 * differently in the two places.
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

/**
 * Poll a container until Instagram has finished processing it.
 *
 * Generous but bounded: a still image is usually ready within a second or two,
 * and anything that has not finished in ~30s is stuck rather than slow.
 */
async function waitForContainer(
  containerId: string,
  accessToken: string,
  attempts = 15,
  gapMs = 2000
): Promise<{ ok: boolean; error?: string }> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(
        `${IG}/${containerId}?fields=status_code,status&access_token=${accessToken}`,
        { signal: AbortSignal.timeout(15000) }
      );
      const body: any = await res.json().catch(() => ({}));
      const code = body?.status_code;
      if (code === "FINISHED") return { ok: true };
      if (code === "ERROR" || code === "EXPIRED") {
        return { ok: false, error: `container ${code}: ${body?.status || "no detail"}` };
      }
    } catch {
      /* a transient read failure is not a verdict; keep polling */
    }
    await new Promise((r) => setTimeout(r, gapMs));
  }
  return { ok: false, error: "container never reported FINISHED" };
}

export async function publishToInstagram(input: PublishInput): Promise<PublishResult> {
  const { igUserId, accessToken, imageUrls, caption } = input;
  if (!imageUrls.length) return { ok: false, error: "no images", stage: "child_container" };

  /*
   * JPEG ONLY. A PNG creates a container quite happily and then fails at
   * media_publish with "Media ID is not available" - an error that says nothing
   * about the format and reads like a timing problem, which sends you looking
   * at the container polling that is working fine. Caught by publishing a
   * branded card as PNG; the identical image as JPEG published first try.
   */
  const png = imageUrls.find((u) => /\.png(\?|$)/i.test(u));
  if (png) {
    return {
      ok: false, stage: "child_container",
      error: `Instagram will not publish PNG. Convert to JPEG first: ${png}`,
    };
  }

  /*
   * IMAGE TAGS NEED COORDINATES. Instagram rejects a container with
   * `user_tags: [{username}]` on a photo — "User tag positions are required for
   * image" — even though the same shape is valid for video. It is the error you
   * get after everything else is right, so it is worth the comment.
   *
   * The positions are where the little tag markers sit when someone taps the
   * photo. On a typographic card there is no subject to point at, so they are
   * spread down the middle rather than stacked: overlapping markers are
   * unreadable, and a column keeps them clear of the stat and the caption block
   * whatever the card says.
   */
  const handles = (input.tagHandles || []).filter(Boolean).map((h) => h.replace(/^@/, ""));
  const tags = handles.map((username, i) => ({
    username,
    x: 0.5,
    // Evenly spaced through the middle band, away from the top and bottom edges.
    y: handles.length === 1 ? 0.5 : 0.2 + (0.6 * i) / Math.max(1, handles.length - 1),
  }));
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

  /*
   * WAIT FOR THE CONTAINER TO FINISH BEFORE PUBLISHING.
   *
   * Creating a container returns an id immediately, but Instagram is still
   * fetching and processing the image behind it. Publishing too early fails
   * with "Media ID is not available" — an error that says nothing about timing
   * and reads like the container was rejected, when in fact it was fine and we
   * were early. status_code goes IN_PROGRESS -> FINISHED, and only FINISHED can
   * be published.
   */
  const ready = await waitForContainer(publishId, accessToken);
  if (!ready.ok) {
    return { ok: false, stage: "publish", error: ready.error };
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
