/**
 * Publishing a Google Post as ShearQuery itself.
 *
 * SEPARATE FROM THE OWNER-FACING GBP PATH ON PURPOSE, and this is the whole
 * reason the file exists. app/api/account/gbp-posts and
 * app/api/cron/gbp-publish-scheduled publish to a BARBERSHOP OWNER'S listing,
 * using their connection, in their voice, against gbp_connections. Nothing here
 * touches any of that. This publishes to our own listing from the content
 * publisher queue, and the two must not share a connection: mixing them would
 * mean one revoked owner grant could stop our own posting, or worse, that a
 * queue item could reach a customer's profile.
 *
 * THE OAUTH CLIENT IS THE INTERNAL ONE. lib/google-internal-oauth.ts explains
 * at length why our own machine credentials must not ride on the customer-facing
 * OAuth client: that client's consent screen exists to ask shop owners for
 * business.manage and its Data Access page declares a specific, small set of
 * scopes. Borrowing it for first-party automation makes the app Google reviews
 * look like it reaches for more than it does.
 *
 * IT POSTS THE COVER IMAGE, NOT THE VIDEO. A LocalPost MediaItem accepts
 * `sourceUrl` and a `mediaFormat`, and lib/gbp-write.ts sends PHOTO. Google's
 * help pages say Business Profile posts support video, but the v4 localPosts
 * reference does not document a video mediaFormat, so attaching the MP4 here
 * would be writing against an unverified claim on a public listing. The Reel's
 * thumbnail carries the same message and is known to work.
 */

import { googleClient } from "@/lib/google-clients";
import { writeLocalPost } from "@/lib/gbp-write";

/** Google truncates a longer summary; sending one is a 400. */
export const GBP_SUMMARY_LIMIT = 1500;

export interface GbpBrandPublishInput {
  refreshToken: string;
  /** "accounts/{id}" — resolved at connect time and stored on the connection. */
  accountName: string;
  /** "locations/{id}" — likewise. */
  locationName: string;
  summary: string;
  /** Public https URL of the Reel cover. Google fetches it itself. */
  photoUrl?: string | null;
  /** Where the LEARN_MORE button goes. */
  url: string;
}

export type GbpBrandPublishResult =
  | { ok: true; postName: string }
  | { ok: false; error: string };

/**
 * An access token minted from the INTERNAL client.
 *
 * Deliberately not lib/google-business.ts's gbpAccessToken(), which hardcodes
 * GOOGLE_CLIENT_ID/SECRET. A refresh token belongs to the client that minted
 * it, so passing an internally-minted token to that function fails with
 * invalid_grant and reads, wrongly, as a revoked connection.
 */
async function internalGbpAccessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = googleClient("gbp_brand");
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_GBP_BRAND_CLIENT_ID / _SECRET are not set");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(30000),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    // Same distinction lib/google-business.ts draws: invalid_grant is dead and
    // needs a human to reconnect, everything else is worth retrying at the next
    // slot. Collapsing them hides which one happened.
    const err = new Error(
      body.error === "invalid_grant"
        ? "the internal Google connection was revoked — reconnect Google Business Profile"
        : `token refresh ${res.status}: ${body.error_description || body.error || "no access_token"}`
    ) as Error & { code?: string };
    err.code = body.error || `http_${res.status}`;
    throw err;
  }
  return body.access_token as string;
}

/**
 * Prove the credential chain without posting anything.
 *
 * WHY THE DRY RUN NEEDS THIS. Checking that a refresh token is STORED says
 * nothing about whether it can still be redeemed, and for this connection the
 * gap is not theoretical: a refresh token belongs to the client that minted it,
 * so an environment where GOOGLE_INTERNAL_CLIENT_ID is unset falls back to the
 * customer-facing client and every redemption fails with invalid_grant. The
 * stored token is perfect; the environment is wrong. A dry run that reports
 * "would post" there is worse than no dry run - it is confidence pointing the
 * wrong way, and the truth only arrives on a live slot.
 *
 * SAFE TO CALL IN A DRY RUN. Minting an access token is read-only and Google
 * does NOT rotate the refresh token on redemption, so this leaves nothing
 * changed. That is specific to Google - the same trick would be actively
 * harmful for X, which issues a new refresh token and invalidates the old one
 * every time, so a dry run there would consume the credential it was checking.
 */
export async function verifyGbpCredentials(
  refreshToken: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await internalGbpAccessToken(refreshToken);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) };
  }
}

export async function publishToGbpBrand(
  input: GbpBrandPublishInput
): Promise<GbpBrandPublishResult> {
  const { refreshToken, accountName, locationName, summary, photoUrl, url } = input;

  if (!accountName || !locationName) {
    return { ok: false, error: "the GBP connection has no account/location recorded" };
  }

  let token: string;
  try {
    token = await internalGbpAccessToken(refreshToken);
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) };
  }

  try {
    const res = await writeLocalPost({
      token,
      accountName,
      locationName,
      summary: summary.slice(0, GBP_SUMMARY_LIMIT),
      callToAction: { actionType: "LEARN_MORE", url },
      photoUrl: photoUrl ?? null,
      // No member owns this write — it is ours. writeLocalPost still records a
      // gbp_write_snapshots row, which is what we want: the audit trail is the
      // same whoever the post belongs to.
      memberId: null,
      note: "content publisher queue",
    });

    if (!res.ok) return { ok: false, error: res.error || "post refused" };
    return { ok: true, postName: res.postName || "" };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) };
  }
}
