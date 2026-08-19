/**
 * Keeping the Instagram token alive.
 *
 * THE FAILURE THIS EXISTS TO PREVENT ALREADY HAPPENED. An Instagram Login token
 * lasts 60 days and must be refreshed before it lapses. Ours sat in an
 * environment variable with nothing refreshing it, expired on 2026-05-23, and
 * was discovered three months later only because someone went looking. Meta is
 * explicit that this is terminal: "Tokens that have not been refreshed in 60
 * days will expire and can no longer be refreshed." There is no recovery except
 * a fresh authorisation by a human.
 *
 * SO THE TOKEN CANNOT LIVE IN AN ENV VAR. A credential that must rotate has to
 * be somewhere a job can write to — hence instagram_connection. That is the
 * whole reason the table exists.
 *
 * TWO INSTAGRAM APIS, AND THEY ARE NOT INTERCHANGEABLE. Tokens beginning "IGAA"
 * are Instagram Login and live on graph.instagram.com; Facebook Login tokens
 * live on graph.facebook.com and reach Instagram through a Page. Calling the
 * wrong host returns "Cannot parse access token", which reads exactly like an
 * expired credential and sends people re-authorising in circles. It cost a
 * debugging session here, so the type is detected rather than assumed.
 *
 * Refresh rules, from Meta's Business Login docs:
 *   - GET https://graph.instagram.com/refresh_access_token
 *     ?grant_type=ig_refresh_token&access_token=...
 *   - the token must be at least 24 hours old
 *   - it must not already have expired
 *   - the authorisation must include instagram_business_basic
 */

export const IG_GRAPH = "https://graph.instagram.com";

/** Long-lived Instagram tokens last 60 days. */
export const TOKEN_LIFETIME_DAYS = 60;

/**
 * Refresh this far before expiry.
 *
 * Deliberately generous. A weekly cron with a 21-day cushion gets roughly three
 * chances to recover from a transient failure before anything is at risk —
 * and the cost of being wrong is not a retry, it is re-authorising by hand.
 */
export const REFRESH_WHEN_DAYS_LEFT = 21;

export type TokenType = "instagram_login" | "facebook_login";

/** Which API a token belongs to. Guessing wrong produces a misleading error. */
export function tokenType(token: string): TokenType {
  return String(token || "").startsWith("IGAA") ? "instagram_login" : "facebook_login";
}

export interface RefreshResult {
  ok: boolean;
  accessToken?: string;
  expiresAt?: string;
  error?: string;
  /** True when no retry will help and a human must re-authorise. */
  terminal?: boolean;
}

/** True when a connection is close enough to expiry to be worth refreshing. */
export function needsRefresh(expiresAt: string | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return true; // unknown expiry is a reason to refresh, not to wait
  const msLeft = new Date(expiresAt).getTime() - now.getTime();
  return msLeft <= REFRESH_WHEN_DAYS_LEFT * 24 * 60 * 60 * 1000;
}

/** True when the token is already dead and refresh is pointless. */
export function isExpired(expiresAt: string | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= now.getTime();
}

/**
 * Exchange a long-lived token for a fresh 60-day one.
 *
 * Refuses rather than calls when the token is already expired: Meta returns a
 * generic OAuth error there, and a generic error in a log is how "the token
 * died" becomes "something is wrong with Instagram" for three months.
 */
export async function refreshInstagramToken(
  currentToken: string,
  now = new Date()
): Promise<RefreshResult> {
  if (!currentToken) return { ok: false, error: "no token stored", terminal: true };

  if (tokenType(currentToken) !== "instagram_login") {
    return {
      ok: false,
      terminal: true,
      error: "stored token is not an Instagram Login token; refresh_access_token does not apply to it",
    };
  }

  try {
    const url = `${IG_GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(currentToken)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const body: any = await res.json().catch(() => ({}));

    if (!res.ok || !body?.access_token) {
      const message = body?.error?.message || `refresh failed (${res.status})`;
      // An expired token cannot be refreshed, ever. Say so plainly so nobody
      // schedules a retry that can only fail.
      const terminal = /expired|Cannot parse|OAuthException/i.test(message);
      return { ok: false, error: message, terminal };
    }

    const seconds = Number(body.expires_in) || TOKEN_LIFETIME_DAYS * 24 * 60 * 60;
    return {
      ok: true,
      accessToken: body.access_token as string,
      expiresAt: new Date(now.getTime() + seconds * 1000).toISOString(),
    };
  } catch (e: any) {
    // Network trouble is retryable; the weekly cadence means a blip costs
    // nothing as long as it is not mistaken for the terminal case.
    return { ok: false, error: `refresh threw: ${e?.message}`, terminal: false };
  }
}
