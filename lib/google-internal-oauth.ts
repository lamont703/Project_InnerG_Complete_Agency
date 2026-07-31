/**
 * Credentials for our OWN Google data — Search Console, Google Ads, YouTube.
 *
 * These are first-party machine credentials: we authorise our own Google account
 * once, store a refresh token, and use it from cron jobs, agents and scripts.
 * No customer ever sees this consent screen.
 *
 * They must NOT share an OAuth client with the customer-facing app. The app's
 * client (GOOGLE_CLIENT_ID) exists to ask barbershop owners for
 * `business.manage`, and its Data Access page declares exactly four
 * non-sensitive scopes. But the same client had also been used to request
 * youtube.readonly, youtube.force-ssl, yt-analytics.readonly,
 * webmasters.readonly and adwords — five sensitive scopes, none of them
 * declared. That makes the client Google evaluates look like it's reaching for a
 * user's whole account, which is both a verification problem and simply untrue
 * of what the app does.
 *
 * So internal automation gets its own client (a Desktop app client is the right
 * type — no browser redirect to host, and it isn't a public consent surface).
 *
 * IMPORTANT: a refresh token belongs to the client that minted it. Switching
 * these variables means re-minting GOOGLE_GSC_REFRESH_TOKEN and
 * GOOGLE_ADS_REFRESH_TOKEN with the setup scripts; the old tokens keep working
 * on the old client until then, which is why this falls back rather than
 * failing.
 *
 * The CommonJS twin for scripts lives at scripts/_google_internal_oauth.js —
 * keep the two in step.
 */

let warned = false;

export interface InternalGoogleCredentials {
  clientId: string | undefined;
  clientSecret: string | undefined;
  /** True while still borrowing the customer-facing app's client. */
  usingAppClient: boolean;
}

export function internalGoogleCredentials(): InternalGoogleCredentials {
  const clientId = process.env.GOOGLE_INTERNAL_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_INTERNAL_CLIENT_SECRET;

  if (clientId && clientSecret) {
    return { clientId, clientSecret, usingAppClient: false };
  }

  if (!warned) {
    warned = true;
    console.warn(
      "[google-internal-oauth] GOOGLE_INTERNAL_CLIENT_ID / _SECRET are not set — " +
        "falling back to the customer-facing app's OAuth client. Internal Google " +
        "traffic (Search Console, Ads, YouTube) is being attributed to the client " +
        "that shows barbershop owners a consent screen."
    );
  }

  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    usingAppClient: true,
  };
}

/**
 * A stand-in for `process.env` with the two OAuth client variables swapped for
 * the internal ones.
 *
 * Exists so the many call sites that do
 *   `const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ... } = process.env`
 * can switch by changing one identifier, instead of each growing its own
 * credential-resolution logic that can drift.
 */
export function internalEnv(): NodeJS.ProcessEnv {
  const { clientId, clientSecret } = internalGoogleCredentials();
  return {
    ...process.env,
    GOOGLE_CLIENT_ID: clientId,
    GOOGLE_CLIENT_SECRET: clientSecret,
  };
}
