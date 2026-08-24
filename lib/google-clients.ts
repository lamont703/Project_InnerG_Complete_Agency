/**
 * Every Google OAuth credential this project uses, one purpose at a time.
 *
 * WHY THIS EXISTS. The credentials drifted into a state that cost a day to
 * untangle, and none of it was visible from the code:
 *
 *   • GOOGLE_CLIENT_SECRET held a secret that no longer matched its client, so
 *     /account/gbp-audit failed with "invalid client secret" — while the very
 *     same client authenticated fine, because its CURRENT secret happened to be
 *     sitting in YOUTUBE_CLIENT_SECRET.
 *   • YOUTUBE_CLIENT_ID and GOOGLE_CLIENT_ID were the SAME client, so the
 *     customer-facing app that shop owners consent to was also holding
 *     youtube.force-ssl, youtube.readonly and yt-analytics.readonly — the exact
 *     drift lib/google-internal-oauth.ts was written to stop, fixed for Search
 *     Console and Ads and never finished for YouTube.
 *   • GOOGLE_GSC_REFRESH_TOKEN and GOOGLE_ADS_REFRESH_TOKEN were dead against
 *     every client we hold, and nothing noticed.
 *
 * The common cause is that a client id, its secret and the refresh token minted
 * from it are three values that MUST agree, and they were stored as six loose
 * environment variables with names that did not say which went with which.
 *
 * SO A PURPOSE RETURNS THE WHOLE TRIPLE. Ask for "youtube" and you get the id,
 * the secret and the refresh token that belong together. There is no way to
 * hand one client's secret to another client's token without going out of your
 * way, which is precisely the mistake that was made.
 *
 * A REFRESH TOKEN BELONGS TO THE CLIENT THAT MINTED IT. That is the rule behind
 * all of this: changing a purpose's client id means re-minting its refresh
 * token, and the old token cannot be carried across. The doctor script
 * (scripts/google_clients_doctor.js) checks every triple against Google and is
 * the only reliable way to know a credential works — reading config proves
 * nothing, as `vercel env pull` returning empty strings for set variables
 * demonstrated.
 */

export type GooglePurpose = "gbp_owner" | "gbp_brand" | "youtube" | "gsc" | "ads";

export interface GoogleCredentials {
  purpose: GooglePurpose;
  clientId?: string;
  clientSecret?: string;
  /** Absent for gbp_owner, which is per-user and stores tokens in the database. */
  refreshToken?: string;
  /** Which env var the id came from — what the doctor and the logs report. */
  source: string;
  /** True while still resolving through a pre-split legacy name. */
  legacy: boolean;
}

/**
 * The canonical name for each purpose, and the older names it still accepts.
 *
 * THE FALLBACKS ARE A MIGRATION AID, NOT A DESIGN. They exist so this module can
 * ship before the new clients are created in Google Cloud Console, and so a
 * half-finished migration degrades to today's behaviour instead of an outage.
 * Once every purpose reports legacy:false in the doctor, delete them — a
 * fallback that survives is how GOOGLE_CLIENT_ID quietly became four things.
 */
const CHAIN: Record<GooglePurpose, { id: string[]; secret: string[]; refresh?: string[] }> = {
  // Shop owners connecting their own Business Profile. THE ONLY CUSTOMER-FACING
  // CLIENT — the one strangers see a consent screen for. It must carry
  // non-sensitive scopes only; that is what keeps owners off the "unverified
  // app" warning, and why no internal tool may borrow it.
  gbp_owner: {
    id: ["GOOGLE_GBP_OWNER_CLIENT_ID", "GOOGLE_CLIENT_ID"],
    secret: ["GOOGLE_GBP_OWNER_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"],
  },

  // Our own Business Profile listing, for the content publisher line.
  gbp_brand: {
    id: ["GOOGLE_GBP_BRAND_CLIENT_ID", "GOOGLE_INTERNAL_CLIENT_ID", "GOOGLE_CLIENT_ID"],
    secret: ["GOOGLE_GBP_BRAND_CLIENT_SECRET", "GOOGLE_INTERNAL_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"],
    refresh: ["GOOGLE_GBP_BRAND_REFRESH_TOKEN"],
  },

  // YouTube publishing and analytics. Sensitive scopes.
  youtube: {
    id: ["GOOGLE_YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_ID", "GOOGLE_INTERNAL_CLIENT_ID"],
    secret: ["GOOGLE_YOUTUBE_CLIENT_SECRET", "YOUTUBE_CLIENT_SECRET", "GOOGLE_INTERNAL_CLIENT_SECRET"],
    refresh: ["GOOGLE_YOUTUBE_REFRESH_TOKEN", "YOUTUBE_REFRESH_TOKEN"],
  },

  // Search Console.
  gsc: {
    id: ["GOOGLE_GSC_CLIENT_ID", "GOOGLE_INTERNAL_CLIENT_ID", "GOOGLE_CLIENT_ID"],
    secret: ["GOOGLE_GSC_CLIENT_SECRET", "GOOGLE_INTERNAL_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"],
    refresh: ["GOOGLE_GSC_REFRESH_TOKEN"],
  },

  // Google Ads. Note this is the OAuth client — the developer token and customer
  // id are separate values and are not resolved here.
  ads: {
    id: ["GOOGLE_ADS_CLIENT_ID", "GOOGLE_INTERNAL_CLIENT_ID", "GOOGLE_CLIENT_ID"],
    secret: ["GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_INTERNAL_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"],
    refresh: ["GOOGLE_ADS_REFRESH_TOKEN"],
  },
};

/** First name in the list that holds a non-empty value. */
function pick(names: string[]): { value?: string; name?: string; index: number } {
  for (let i = 0; i < names.length; i++) {
    const v = process.env[names[i]];
    // Empty string is treated as unset on purpose: Vercel happily stores an
    // empty value for a variable that exists, and `if (clientId)` then falls
    // through to a fallback while `vercel env ls` shows the key as present.
    if (v && v.trim()) return { value: v.trim(), name: names[i], index: i };
  }
  return { index: -1 };
}

export function googleClient(purpose: GooglePurpose): GoogleCredentials {
  const chain = CHAIN[purpose];
  const id = pick(chain.id);
  const secret = pick(chain.secret);
  const refresh = chain.refresh ? pick(chain.refresh) : { index: -1 };

  return {
    purpose,
    clientId: id.value,
    clientSecret: secret.value,
    refreshToken: refresh.value,
    source: id.name ?? "(unset)",
    // Index 0 is the canonical name; anything past it is a pre-split fallback.
    legacy: id.index > 0 || secret.index > 0,
  };
}

/** Names the doctor and the setup scripts should tell someone to set. */
export function canonicalNames(purpose: GooglePurpose): {
  id: string; secret: string; refresh?: string;
} {
  const c = CHAIN[purpose];
  return { id: c.id[0], secret: c.secret[0], refresh: c.refresh?.[0] };
}

export const ALL_PURPOSES: GooglePurpose[] = ["gbp_owner", "gbp_brand", "youtube", "gsc", "ads"];

export const PURPOSE_LABELS: Record<GooglePurpose, string> = {
  gbp_owner: "Business Profile — owner connect (customer-facing)",
  gbp_brand: "Business Profile — our own listing",
  youtube: "YouTube publishing",
  gsc: "Search Console",
  ads: "Google Ads",
};
