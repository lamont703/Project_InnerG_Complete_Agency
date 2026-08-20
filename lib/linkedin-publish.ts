/**
 * Publishing to LinkedIn: initialize, upload the parts, finalize, then post.
 *
 * NOT server-only, and for the same reason lib/instagram-publish.ts is not: the
 * token and the author URN arrive as ARGUMENTS rather than being read from the
 * environment, so there is nothing here for a client bundle to leak and scripts
 * can import it without a second copy of the sequence.
 *
 * THIS IS THE VIDEOS API, NOT THE ASSETS API. The older code in
 * supabase/functions/connector-sync/providers/linkedin/client.ts uses
 * `/assets?action=registerUpload` and `/ugcPosts`. LinkedIn's own docs now say
 * "The Videos API replaces the Assets API" and "The Posts API replaces the
 * ugcPosts API", so this is a port to the current pair rather than a copy of
 * the old one. The shapes are genuinely different - registerUpload returns a
 * single uploadUrl nested three levels deep, initializeUpload returns an ARRAY
 * of byte-ranged upload instructions - so the old code could not simply be
 * moved across.
 *
 * FOUR CALLS, NOT ONE.
 *   1. POST /rest/videos?action=initializeUpload  -> video URN + upload parts
 *   2. PUT  each part to its own signed URL       -> an ETag per part
 *   3. POST /rest/videos?action=finalizeUpload    -> links the parts together
 *   4. POST /rest/posts                           -> the actual post
 *
 * THE ETAGS ARE THE PART RECEIPTS AND THEY ARE ORDERED. finalizeUpload takes
 * `uploadedPartIds` and LinkedIn's docs are explicit that "the order needs to
 * be the same as the order of parts in the upload instructions". Uploading the
 * parts concurrently and collecting ETags as they land would reorder them, so
 * they are written into a fixed-length array at their own index rather than
 * pushed.
 *
 * THE POST URN COMES BACK IN A HEADER, NOT THE BODY. A successful create is a
 * 201 with an empty body and `x-restli-id` carrying the urn. Parsing the body
 * for an id yields undefined and looks like a silent failure.
 */

const API = "https://api.linkedin.com/rest";

/**
 * LinkedIn versions its API by month and REQUIRES the header on every call.
 *
 * This is a live dependency, not a constant to set and forget: LinkedIn sunsets
 * versions on a rolling schedule (the 202508 version was retired on
 * 2026-08-17). If calls start failing with a version error, check the current
 * supported range in LinkedIn's migration docs and move this forward - do not
 * guess a newer month, because an unreleased version is rejected too.
 */
const LINKEDIN_VERSION = "202608";

/** Documented part size for multipart video upload: `split -b 4194303`. */
const PART_SIZE = 4 * 1024 * 1024;

/** LinkedIn rejects a longer commentary with 400 FIELD_LENGTH_TOO_LONG. */
const COMMENTARY_LIMIT = 3000;

/** Documented video bounds: 75KB to 500MB, MP4, 3 seconds to 30 minutes. */
const MIN_BYTES = 75 * 1024;
const MAX_BYTES = 500 * 1024 * 1024;

export interface LinkedInPublishInput {
  accessToken: string;
  /**
   * `urn:li:person:{id}` for a member post, `urn:li:organization:{id}` for a
   * company page. Passed in whole rather than assembled here - the old client
   * defaulted a bare id to an ORGANISATION urn, which silently posts to the
   * wrong place when a member id is handed to it.
   */
  authorUrn: string;
  video: Buffer;
  commentary: string;
  /** Shown beside the video in the feed, not the post body. */
  title: string;
}

export type LinkedInPublishResult =
  | { ok: true; postUrn: string; videoUrn: string; url: string }
  | { ok: false; error: string; stage: LinkedInStage };

type LinkedInStage = "precheck" | "initialize" | "upload" | "finalize" | "post";

function headers(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": LINKEDIN_VERSION,
    "Content-Type": "application/json",
  };
}

interface UploadInstruction {
  uploadUrl: string;
  firstByte: number;
  lastByte: number;
}

export async function publishToLinkedIn(
  input: LinkedInPublishInput
): Promise<LinkedInPublishResult> {
  const { accessToken, authorUrn, video, commentary, title } = input;

  /*
   * CHECKED HERE RATHER THAN DISCOVERED AT UPLOAD. A file outside the
   * documented range fails somewhere in the middle of a four-call sequence with
   * an error that names neither the size nor the limit, after the bytes have
   * already been pushed over the wire.
   */
  if (video.length < MIN_BYTES || video.length > MAX_BYTES) {
    return {
      ok: false,
      stage: "precheck",
      error: `video is ${Math.round(video.length / 1024)}KB, outside LinkedIn's 75KB-500MB range`,
    };
  }
  if (!authorUrn.startsWith("urn:li:")) {
    return { ok: false, stage: "precheck", error: `authorUrn is not a URN: ${authorUrn}` };
  }

  // 1. Initialize.
  let videoUrn: string;
  let uploadToken: string;
  let instructions: UploadInstruction[];
  try {
    const res = await fetch(`${API}/videos?action=initializeUpload`, {
      method: "POST",
      headers: headers(accessToken),
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: authorUrn,
          fileSizeBytes: video.length,
          uploadCaptions: false,
          uploadThumbnail: false,
        },
      }),
      signal: AbortSignal.timeout(60000),
    });
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        stage: "initialize",
        error: `${res.status}: ${JSON.stringify(body).slice(0, 300)}`,
      };
    }
    videoUrn = body?.value?.video;
    uploadToken = body?.value?.uploadToken ?? "";
    instructions = body?.value?.uploadInstructions ?? [];
    if (!videoUrn || !instructions.length) {
      return {
        ok: false,
        stage: "initialize",
        error: `no video urn or upload instructions: ${JSON.stringify(body).slice(0, 300)}`,
      };
    }
  } catch (e) {
    return { ok: false, stage: "initialize", error: String((e as Error)?.message ?? e) };
  }

  /*
   * 2. Upload each part, in order.
   *
   * The parts are uploaded SEQUENTIALLY. LinkedIn's byte ranges are 4MB and
   * these Shorts are a handful of parts at most, so the wall-clock saving from
   * parallelism is small - and the failure mode it introduces is not: a
   * concurrent upload that half-succeeds leaves some ETags collected and others
   * missing, with nothing to distinguish "not finished" from "will never
   * finish".
   */
  const partIds: string[] = new Array(instructions.length);
  for (let i = 0; i < instructions.length; i++) {
    const part = instructions[i];
    // lastByte is INCLUSIVE in LinkedIn's instructions; Buffer.subarray's end
    // is exclusive. Off by one here truncates every part by a byte and the
    // video finalizes into a corrupt file rather than an error.
    const chunk = video.subarray(part.firstByte, part.lastByte + 1);
    try {
      const put = await fetch(part.uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/octet-stream",
        },
        body: new Uint8Array(chunk),
        signal: AbortSignal.timeout(180000),
      });
      if (!put.ok) {
        return {
          ok: false,
          stage: "upload",
          error: `part ${i + 1}/${instructions.length} HTTP ${put.status}: ${(await put.text()).slice(0, 200)}`,
        };
      }
      const etag = put.headers.get("etag");
      if (!etag) {
        return {
          ok: false,
          stage: "upload",
          error: `part ${i + 1} returned no ETag, so it cannot be finalized`,
        };
      }
      // The docs show the ETag quoted in the response header and unquoted in
      // the finalize payload.
      partIds[i] = etag.replace(/^"|"$/g, "");
    } catch (e) {
      return {
        ok: false,
        stage: "upload",
        error: `part ${i + 1}: ${String((e as Error)?.message ?? e)}`,
      };
    }
  }

  // 3. Finalize.
  try {
    const res = await fetch(`${API}/videos?action=finalizeUpload`, {
      method: "POST",
      headers: headers(accessToken),
      body: JSON.stringify({
        finalizeUploadRequest: { video: videoUrn, uploadToken, uploadedPartIds: partIds },
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      return {
        ok: false,
        stage: "finalize",
        error: `${res.status}: ${(await res.text()).slice(0, 300)}`,
      };
    }
  } catch (e) {
    return { ok: false, stage: "finalize", error: String((e as Error)?.message ?? e) };
  }

  /*
   * 4. Create the post.
   *
   * NO POLLING FOR AVAILABLE. A finalized video sits in PROCESSING for a while,
   * and the instinct is to wait for status AVAILABLE before posting. LinkedIn
   * does not require it - the post is accepted against a processing video and
   * renders when transcoding finishes - and polling would hold this slot open
   * for minutes inside a cron that also has YouTube, Instagram and X to get
   * through.
   */
  try {
    const res = await fetch(`${API}/posts`, {
      method: "POST",
      headers: headers(accessToken),
      body: JSON.stringify({
        author: authorUrn,
        commentary: commentary.slice(0, COMMENTARY_LIMIT),
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        content: { media: { title: title.slice(0, 200), id: videoUrn } },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      return {
        ok: false,
        stage: "post",
        error: `${res.status}: ${(await res.text()).slice(0, 300)}`,
      };
    }

    const postUrn = res.headers.get("x-restli-id");
    if (!postUrn) {
      // The post very likely exists. Saying so matters: treating this as a
      // plain failure invites a retry that posts the same video twice.
      return {
        ok: false,
        stage: "post",
        error: "post accepted but no x-restli-id header returned — check the feed before retrying",
      };
    }

    return {
      ok: true,
      postUrn,
      videoUrn,
      url: `https://www.linkedin.com/feed/update/${postUrn}/`,
    };
  } catch (e) {
    return { ok: false, stage: "post", error: String((e as Error)?.message ?? e) };
  }
}
