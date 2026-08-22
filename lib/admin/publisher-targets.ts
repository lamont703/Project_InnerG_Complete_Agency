/**
 * The platforms the content publisher fans out to, and the rules for reaching
 * them.
 *
 * WHY A REGISTRY RATHER THAN MORE BRANCHES IN THE CRON. The route used to hold
 * one YouTube block and one Instagram block, which is readable at two
 * destinations. At six it becomes a long if/else where the interesting logic —
 * which platforms were attempted, and what that means for the row's status — is
 * buried inside the boilerplate of reaching each one. Adding a platform here is
 * one entry.
 *
 * WHAT IS AND IS NOT IN THIS FILE. YouTube and Instagram are NOT here. They
 * already work, they authenticate differently (YouTube from a refresh token in
 * the environment, Instagram from the instagram_connection singleton with its
 * own refresh cron), and rewriting a working publish path for symmetry is how
 * a change that was supposed to add platforms ends up breaking the two that
 * were fine. This file covers the four that are backed by
 * publisher_connections.
 *
 * SKIPPED IS NOT FAILED, and this is the rule the whole design turns on. A
 * platform that is switched off, or has no token, was never attempted — so it
 * cannot have failed. If skipping counted as failure, TikTok being unapproved
 * would mark every post 'partial' forever and the colour on the board would
 * stop meaning anything within a week.
 */

import { publishToLinkedIn } from "@/lib/linkedin-publish";
import { publishToX, refreshXToken } from "@/lib/x-publish";
import { publishToGbpBrand, verifyGbpCredentials } from "@/lib/gbp-brand-publish";
import { publishToTikTok } from "@/lib/tiktok-publish";
import { publishToTikTokViaGhl, findGhlTikTokAccountId } from "@/lib/tiktok-ghl-publish";
import {
  buildLinkedInCommentary,
  buildXText,
  buildGbpSummary,
  buildTikTokTitle,
  SITE,
  type CopyRow,
} from "@/lib/admin/publisher-copy";

export const TARGET_PLATFORMS = ["linkedin", "x", "gbp", "tiktok", "tiktok_ghl"] as const;
export type PlatformKey = (typeof TARGET_PLATFORMS)[number];

export const PLATFORM_LABELS: Record<PlatformKey, string> = {
  linkedin: "LinkedIn",
  x: "X",
  gbp: "Google Business Profile",
  tiktok: "TikTok",
  tiktok_ghl: "TikTok (via GoHighLevel)",
};

export interface PublisherConnection {
  platform: PlatformKey;
  enabled: boolean;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  status: string;
  account_label: string | null;
  config: Record<string, any> | null;
}

/**
 * One platform's outcome.
 *
 * Three shapes, not two. `skipped` exists so the row can record WHY nothing was
 * sent — "not enabled" and "no token" are different problems with different
 * fixes, and collapsing either into an error loses that.
 */
export type Outcome =
  | { ok: true; id: string; url?: string; note?: string }
  | { ok: false; error: string }
  | { skipped: string };

export function wasAttempted(o: Outcome | undefined): boolean {
  return Boolean(o && !("skipped" in o));
}

export function succeeded(o: Outcome | undefined): boolean {
  return Boolean(o && "ok" in o && o.ok);
}

/**
 * Compute the row's status from every outcome.
 *
 * ONLY ATTEMPTED PLATFORMS COUNT. This is the single most important line in the
 * fan-out and the one most likely to be "simplified" back into a bug later:
 * counting skipped platforms as failures makes 'partial' the permanent state of
 * every row.
 */
export function statusFromOutcomes(
  outcomes: Record<string, Outcome>
): "published" | "partial" | "failed" {
  const attempted = Object.values(outcomes).filter(wasAttempted);
  // Nothing was even tried — every destination is switched off or unconnected.
  // 'failed' is the honest answer: the item did not go out.
  if (attempted.length === 0) return "failed";

  const won = attempted.filter(succeeded).length;
  if (won === attempted.length) return "published";
  if (won === 0) return "failed";
  return "partial";
}

/** A token with no expiry recorded is treated as usable — many have none. */
function expired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

/**
 * Why this platform cannot be attempted, or null if it can.
 *
 * Deliberately checks the cheap things before any network call, so a slot is
 * not spent discovering that a connection was never authorised.
 */
function blocker(
  conn: PublisherConnection | undefined,
  needsVideo: boolean,
  hasVideo: boolean,
  allConnections: PublisherConnection[] = [],
): string | null {
  if (!conn) return "no connection row";
  if (!conn.enabled) return "not enabled";

  /*
   * TWO ROUTES, ONE TIKTOK ACCOUNT. When the native app is live the bridge
   * stands down, and it must say THAT rather than whatever it would have
   * complained about next.
   *
   * Checked here rather than at the point of publishing because it outranks
   * every other reason: if native is handling TikTok, missing GHL credentials
   * are irrelevant and reporting them would send someone to fix a setting that
   * does not matter. A wrong reason is worse than no reason — it costs
   * somebody an afternoon.
   */
  if (conn.platform === "tiktok_ghl" && allConnections.some((c) => c.platform === "tiktok" && c.enabled)) {
    return "native TikTok is enabled — not double-posting";
  }
  if (conn.status === "revoked") return "connection revoked — reconnect";
  if (needsVideo && !hasVideo) return "no video bytes available";

  /*
   * The GHL route holds no token of its own. It posts with the account-wide
   * GHL_API_KEY and hands GHL a public URL, so the generic access_token and
   * video-bytes checks below would block it for things it does not use.
   */
  if (conn.platform === "tiktok_ghl") {
    if (!process.env.GHL_API_KEY || !process.env.GHL_LOCATION_ID) {
      return "GHL_API_KEY / GHL_LOCATION_ID not set";
    }
    return null;
  }

  if (conn.platform === "gbp") {
    if (!conn.refresh_token) return "not connected";
    const cfg = conn.config ?? {};
    if (!cfg.accountName || !cfg.locationName) return "no GBP location selected";
    return null;
  }

  if (!conn.access_token) return "not connected";
  // X refreshes on every publish, so an expired access token is normal there
  // and not a blocker.
  if (conn.platform !== "x" && expired(conn.expires_at)) {
    return `token expired ${conn.expires_at}`;
  }
  if (conn.platform === "linkedin" && !(conn.config ?? {}).authorUrn) {
    return "no LinkedIn author recorded";
  }
  return null;
}

/** What each platform would be sent — used by the dry run and by the tests. */
export function previewCopy(platform: PlatformKey, row: CopyRow): string {
  switch (platform) {
    case "linkedin": return buildLinkedInCommentary(row);
    case "x": return buildXText(row);
    case "gbp": return buildGbpSummary(row);
    case "tiktok": return buildTikTokTitle(row);
    // Same destination, same limits — one caption builder, not two that drift.
    case "tiktok_ghl": return buildTikTokTitle(row);
  }
}

export interface FanOutArgs {
  admin: any;
  row: any;
  /** Fetched once by the caller and shared; null when it could not be read. */
  video: Buffer | null;
  /** Restrict to these platforms. Used by the manual per-platform publish. */
  only?: PlatformKey[];
  /** Resolve and build everything, send nothing. */
  dryRun?: boolean;
}

export async function fanOutToTargets(
  args: FanOutArgs
): Promise<Record<PlatformKey, Outcome>> {
  const { admin, row, video, only, dryRun } = args;

  const { data: rows } = await (admin.from("publisher_connections") as any).select("*");
  const byPlatform = new Map<string, PublisherConnection>(
    (rows ?? []).map((r: PublisherConnection) => [r.platform, r])
  );

  const wanted = only?.length ? only : [...TARGET_PLATFORMS];
  const outcomes = {} as Record<PlatformKey, Outcome>;

  /*
   * SEQUENTIAL, NOT CONCURRENT. Each of these uploads the same multi-megabyte
   * file, and running four at once inside one serverless invocation means four
   * copies of the buffer in flight and four sockets competing for the same
   * egress. The slot has eight hundred seconds and these are sub-minute clips;
   * there is nothing to win by parallelising and a memory ceiling to hit.
   *
   * ONE PLATFORM FAILING NEVER STOPS THE NEXT — the same principle the route
   * already applied to YouTube and Instagram. They are independent
   * destinations, and one refusing the file says nothing about the others.
   */
  for (const platform of wanted) {
    const conn = byPlatform.get(platform);
    // gbp posts text. tiktok_ghl hands GHL a public URL and lets GHL fetch the
    // bytes, so a failed download must not stop it — that is the whole point of
    // passing a URL rather than uploading.
    const needsVideo = platform !== "gbp" && platform !== "tiktok_ghl";

    /*
     * A DRY RUN JUDGES THE ROW, NOT THE DOWNLOAD. No bytes are fetched in a dry
     * run, so asking "do we have the video in memory?" answers no for every
     * platform that needs one - and the report then blames LinkedIn and X for a
     * blocker that exists only because this is a dry run. That is worse than no
     * report at all: it hides a genuinely broken connection behind a fake
     * reason, and it makes a healthy one look broken.
     *
     * What actually matters at publish time is whether the row HAS a video, so
     * that is what a dry run checks.
     */
    const hasVideo = dryRun ? Boolean(row.video_url) : Boolean(video);
    const why = blocker(conn, needsVideo, hasVideo, (rows ?? []) as PublisherConnection[]);

    if (why) {
      outcomes[platform] = { skipped: why };
      continue;
    }

    if (dryRun) {
      /*
       * GBP's credentials are ACTUALLY EXERCISED here, because storing a
       * refresh token and being able to redeem it are different facts and this
       * connection has already been broken by the second while looking fine by
       * the first. Redeeming a Google refresh token is read-only and does not
       * rotate it, so this costs nothing.
       *
       * The other platforms are not checked this way on purpose: X rotates its
       * refresh token on every redemption, so "verifying" it in a dry run would
       * consume the credential and leave the connection worse than it found it.
       */
      if (platform === "gbp") {
        const check = await verifyGbpCredentials(conn!.refresh_token!);
        outcomes[platform] = check.ok
          ? { ok: true, id: "dry-run", note: previewCopy(platform, row) }
          : { ok: false, error: check.error };
        continue;
      }

      outcomes[platform] = {
        ok: true,
        id: "dry-run",
        note: previewCopy(platform, row),
      };
      continue;
    }

    try {
      outcomes[platform] = await publishOne(platform, conn!, row, video, admin, (rows ?? []) as PublisherConnection[]);
    } catch (e) {
      // A publisher that throws rather than returning is a bug in that
      // publisher, but it must not take the remaining platforms down with it.
      outcomes[platform] = { ok: false, error: String((e as Error)?.message ?? e).slice(0, 500) };
    }

    // Record the outcome on the connection so a dead one explains itself on the
    // board instead of only in a queue row nobody thinks to open.
    const o = outcomes[platform];
    await (admin.from("publisher_connections") as any)
      .update(
        "ok" in o && o.ok
          ? { last_published_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }
          : { last_error: "error" in o ? o.error.slice(0, 500) : null, updated_at: new Date().toISOString() }
      )
      .eq("platform", platform);
  }

  return outcomes;
}

async function publishOne(
  platform: PlatformKey,
  conn: PublisherConnection,
  row: any,
  video: Buffer | null,
  admin: any,
  /** Every connection, so one platform can see another's state — tiktok_ghl
   *  has to know whether native TikTok is live before it posts. */
  allConnections: PublisherConnection[] = []
): Promise<Outcome> {
  const cfg = conn.config ?? {};

  if (platform === "tiktok_ghl") {
    /*
     * The native-wins rule lives in blocker(), which runs before this and
     * catches it earlier with the right reason. This is the second line: a
     * caller invoking publishOne directly still must not double-post.
     */
    if (allConnections.some((c) => c.platform === "tiktok" && c.enabled)) {
      return { skipped: "native TikTok is enabled — not double-posting" };
    }

    const accountId =
      (conn.config ?? {}).accountId || (await findGhlTikTokAccountId());
    if (!accountId) {
      return { skipped: "no TikTok account connected in GoHighLevel" };
    }

    const videoUrl = String((row as any).video_url ?? "");
    if (!videoUrl) return { skipped: "no public video URL on the queued item" };

    const r = await publishToTikTokViaGhl({
      videoUrl,
      caption: buildTikTokTitle(row),
      accountId,
    });
    return r.ok
      ? { ok: true, id: r.id, note: r.note }
      : { ok: false, error: r.error };
  }

  if (platform === "linkedin") {
    const r = await publishToLinkedIn({
      accessToken: conn.access_token!,
      authorUrn: cfg.authorUrn,
      video: video!,
      commentary: buildLinkedInCommentary(row),
      title: String(row.title ?? "ShearQuery").slice(0, 200),
    });
    return r.ok
      ? { ok: true, id: r.postUrn, url: r.url }
      : { ok: false, error: `${r.stage}: ${r.error}` };
  }

  if (platform === "x") {
    /*
     * REFRESHED EVERY TIME, NOT WHEN EXPIRED. X access tokens last about two
     * hours and the slots are five hours apart, so a stored one is essentially
     * always stale — checking first would just add a guaranteed-failing call.
     *
     * The rotated refresh token is written back BEFORE publishing. X
     * invalidates the old one the moment it is redeemed, so if the publish
     * throws after a successful refresh and we have not persisted it, the
     * connection is dead with no way back but re-authorising by hand.
     */
    if (!conn.refresh_token) return { skipped: "no refresh token — reconnect X" };

    const refreshed = await refreshXToken(conn.refresh_token);
    if (!refreshed.ok) {
      /*
       * ONLY A REFUSAL MARKS THE CONNECTION DEAD. 'not_configured' means this
       * environment is missing the OAuth client - nothing to do with the token,
       * and re-authorising would not help. 'transient' is X being briefly
       * unavailable. Marking either one revoked would discard a working grant
       * and send someone through a consent screen for no reason.
       */
      if (refreshed.reason === "refused") {
        await (admin.from("publisher_connections") as any)
          .update({ status: "revoked", last_error: refreshed.error.slice(0, 500) })
          .eq("platform", "x");
        return { ok: false, error: `token refresh refused: ${refreshed.error}` };
      }
      if (refreshed.reason === "not_configured") {
        return { skipped: refreshed.error };
      }
      return { ok: false, error: `token refresh failed: ${refreshed.error}` };
    }

    await (admin.from("publisher_connections") as any)
      .update({
        access_token: refreshed.accessToken,
        refresh_token: refreshed.refreshToken,
        expires_at: new Date(Date.now() + refreshed.expiresInSecs * 1000).toISOString(),
        status: "connected",
        updated_at: new Date().toISOString(),
      })
      .eq("platform", "x");

    const r = await publishToX({
      accessToken: refreshed.accessToken,
      video: video!,
      text: buildXText(row),
    });
    return r.ok
      ? { ok: true, id: r.postId, url: r.url }
      : { ok: false, error: `${r.stage}: ${r.error}` };
  }

  if (platform === "gbp") {
    const r = await publishToGbpBrand({
      refreshToken: conn.refresh_token!,
      accountName: cfg.accountName,
      locationName: cfg.locationName,
      summary: buildGbpSummary(row),
      photoUrl: row.thumbnail_url ?? null,
      url: SITE,
    });
    return r.ok ? { ok: true, id: r.postName } : { ok: false, error: r.error };
  }

  // TikTok. Reached only once someone enables it, which should follow approval
  // rather than precede it — see lib/tiktok-publish.ts.
  const r = await publishToTikTok({
    accessToken: conn.access_token!,
    video: video!,
    title: buildTikTokTitle(row),
    privacyLevel: cfg.privacyLevel ?? "SELF_ONLY",
  });
  return r.ok
    ? { ok: true, id: r.publishId, note: r.status }
    : { ok: false, error: `${r.stage}: ${r.error}` };
}
