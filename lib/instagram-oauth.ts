/**
 * Instagram Business Login — the three-step OAuth this platform needs.
 *
 * Verified against Meta's Business Login docs on 2026-08-18. The flow is:
 *
 *   1. Send the user to  https://www.instagram.com/oauth/authorize
 *   2. POST the returned code to  https://api.instagram.com/oauth/access_token
 *      -> a SHORT-lived token (about an hour)
 *   3. GET  https://graph.instagram.com/access_token?grant_type=ig_exchange_token
 *      -> the 60-day LONG-lived token, which is the one worth storing
 *
 * THREE DIFFERENT HOSTS, ONE PER STEP, and that is not a typo in any of them.
 * www.instagram.com authorises, api.instagram.com exchanges the code, and
 * graph.instagram.com does everything afterwards. Using the wrong one returns
 * an error that looks like bad credentials, which is the same confusion that
 * made a dead token look like a broken script.
 *
 * STEP 3 IS THE ONE PEOPLE SKIP. Stopping at step 2 stores a token that dies
 * within the hour, and the failure arrives later, detached from the cause.
 */

export const IG_AUTHORIZE = "https://www.instagram.com/oauth/authorize";
export const IG_TOKEN = "https://api.instagram.com/oauth/access_token";
export const IG_GRAPH = "https://graph.instagram.com";

/**
 * Everything we need, requested once.
 *
 * Ask for publishing NOW even though nothing publishes yet. Scopes are fixed at
 * authorisation, so a narrower ask means going through this again — and this is
 * a flow a human has to drive by hand.
 */
export const IG_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_business_manage_comments",
  "instagram_business_manage_messages",
];

export function instagramAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const q = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: IG_SCOPES.join(","),
    state,
  });
  return `${IG_AUTHORIZE}?${q}`;
}

export interface ExchangeResult {
  ok: boolean;
  accessToken?: string;
  expiresAt?: string;
  userId?: string;
  error?: string;
}

/** Steps 2 and 3 together, because a short-lived token alone is not worth storing. */
export async function exchangeCodeForLongLivedToken(args: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  now?: Date;
}): Promise<ExchangeResult> {
  const now = args.now || new Date();

  // Step 2 — the code becomes a short-lived token. Form-encoded POST, not JSON.
  let shortToken: string;
  let userId: string | undefined;
  try {
    const res = await fetch(IG_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: args.clientId,
        client_secret: args.clientSecret,
        grant_type: "authorization_code",
        redirect_uri: args.redirectUri,
        code: args.code,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok || !body?.access_token) {
      return { ok: false, error: body?.error_message || body?.error?.message || `code exchange failed (${res.status})` };
    }
    shortToken = body.access_token;
    userId = body.user_id ? String(body.user_id) : undefined;
  } catch (e: any) {
    return { ok: false, error: `code exchange threw: ${e?.message}` };
  }

  // Step 3 — and without this the token expires within the hour.
  try {
    const q = new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: args.clientSecret,
      access_token: shortToken,
    });
    const res = await fetch(`${IG_GRAPH}/access_token?${q}`, { signal: AbortSignal.timeout(15000) });
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok || !body?.access_token) {
      return { ok: false, error: body?.error?.message || `long-lived exchange failed (${res.status})` };
    }
    const seconds = Number(body.expires_in) || 60 * 24 * 60 * 60;
    return {
      ok: true,
      accessToken: body.access_token,
      expiresAt: new Date(now.getTime() + seconds * 1000).toISOString(),
      userId,
    };
  } catch (e: any) {
    return { ok: false, error: `long-lived exchange threw: ${e?.message}` };
  }
}
