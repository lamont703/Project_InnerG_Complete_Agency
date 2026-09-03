/**
 * CommonJS twin of lib/google-clients.ts — one purpose, one whole triple.
 *
 * WHY IT EXISTS. The setup scripts that MINT refresh tokens are CommonJS and
 * cannot import the TypeScript resolver, so they were each resolving
 * credentials on their own. gsc_oauth_setup.js minted against
 * `internalEnv().GOOGLE_CLIENT_ID` — the INTERNAL client — while the app reads
 * Search Console through `googleClient("gsc")`, which resolves
 * GOOGLE_GSC_CLIENT_ID. Two different clients.
 *
 * A REFRESH TOKEN BELONGS TO THE CLIENT THAT MINTED IT. So the script would
 * complete, print a token, and that token was dead on arrival — it had been
 * issued by a client the application never uses. Nothing errored at mint time;
 * it failed later as "TOKEN DEAD" in the doctor, which looks like the token
 * expired rather than like it was never valid here.
 *
 * KEEP THIS CHAIN IN STEP WITH lib/google-clients.ts. Two copies is one more
 * than anybody wants, but the alternative is a build step for scripts. The
 * doctor imports this file rather than holding a third copy.
 */

/**
 * The canonical env var for each purpose, and the older names still accepted.
 *
 * The fallbacks are a migration aid, not a design. Delete one the moment every
 * environment has the canonical name — a fallback that survives is how
 * GOOGLE_CLIENT_ID quietly became four different things.
 */
const CHAIN = {
  gbp_owner: {
    label: "Business Profile (shop owners)",
    id: ["GOOGLE_GBP_OWNER_CLIENT_ID", "GOOGLE_CLIENT_ID"],
    secret: ["GOOGLE_GBP_OWNER_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"],
  },
  gbp_brand: {
    label: "Business Profile (ours)",
    id: ["GOOGLE_GBP_BRAND_CLIENT_ID", "GOOGLE_INTERNAL_CLIENT_ID", "GOOGLE_CLIENT_ID"],
    secret: ["GOOGLE_GBP_BRAND_CLIENT_SECRET", "GOOGLE_INTERNAL_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"],
    /*
     * NO `refresh` ENTRY, DELIBERATELY — do not add one back.
     *
     * This purpose's token lives in the publisher_connections table, minted by
     * scripts/publisher_connect.js gbp, not in an environment variable. The
     * doctor reads the ABSENCE of this key as "the token lives in the database"
     * and reports it neutrally; adding GOOGLE_GBP_BRAND_REFRESH_TOKEN here made
     * it report a healthy purpose as a missing token.
     *
     * lib/google-clients.ts DOES list that variable, so the two chains disagree
     * on this one entry. The database is where the token actually is, so the
     * omission here is the correct half of the disagreement.
     */
  },
  youtube: {
    label: "YouTube publishing",
    id: ["GOOGLE_YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_ID", "GOOGLE_INTERNAL_CLIENT_ID"],
    secret: ["GOOGLE_YOUTUBE_CLIENT_SECRET", "YOUTUBE_CLIENT_SECRET", "GOOGLE_INTERNAL_CLIENT_SECRET"],
    refresh: ["GOOGLE_YOUTUBE_REFRESH_TOKEN", "YOUTUBE_REFRESH_TOKEN"],
  },
  gsc: {
    label: "Search Console",
    id: ["GOOGLE_GSC_CLIENT_ID", "GOOGLE_INTERNAL_CLIENT_ID", "GOOGLE_CLIENT_ID"],
    secret: ["GOOGLE_GSC_CLIENT_SECRET", "GOOGLE_INTERNAL_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"],
    refresh: ["GOOGLE_GSC_REFRESH_TOKEN"],
  },
  ads: {
    label: "Google Ads",
    id: ["GOOGLE_ADS_CLIENT_ID", "GOOGLE_INTERNAL_CLIENT_ID", "GOOGLE_CLIENT_ID"],
    secret: ["GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_INTERNAL_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"],
    refresh: ["GOOGLE_ADS_REFRESH_TOKEN"],
  },
  gmail: {
    label: "Gmail (video request agent)",
    /*
     * NO FALLBACKS, AND THAT IS THE POINT — do not add GOOGLE_INTERNAL_* here.
     *
     * Gmail scopes are RESTRICTED, a stricter tier than the sensitive scopes
     * every other purpose uses. Restricted scopes attach to the CLIENT, not to
     * the token, so pointing this purpose at a shared client would drag every
     * other service on that client into Gmail's verification review — the same
     * scope-contamination that lib/google-clients.ts was written to stop, where
     * the customer-facing client ended up holding YouTube scopes.
     *
     * A fallback here would also fail quietly rather than loudly: consent would
     * succeed against the wrong client and the token would be dead on arrival.
     * Missing variables are the better failure.
     */
    id: ["GOOGLE_GMAIL_CLIENT_ID"],
    secret: ["GOOGLE_GMAIL_CLIENT_SECRET"],
    refresh: ["GOOGLE_GMAIL_REFRESH_TOKEN"],
  },
};

function pick(names) {
  for (const n of names || []) {
    const v = process.env[n];
    if (v) return { value: v, from: n };
  }
  return { value: undefined, from: undefined };
}

/** The id, secret and refresh token that belong together for one purpose. */
function googleClient(purpose) {
  const c = CHAIN[purpose];
  if (!c) throw new Error(`unknown Google purpose "${purpose}"`);
  const id = pick(c.id);
  const secret = pick(c.secret);
  const refresh = pick(c.refresh);
  return {
    purpose,
    label: c.label,
    clientId: id.value,
    clientSecret: secret.value,
    refreshToken: refresh.value,
    idFrom: id.from,
    secretFrom: secret.from,
    refreshFrom: refresh.from,
    /** The canonical variable a newly minted token belongs in. */
    refreshVar: (c.refresh || [])[0],
    /** True while resolving through a pre-split legacy name. */
    legacy: id.from !== c.id[0],
  };
}

/**
 * Print which client a mint is about to use, and stop if it is not the one the
 * application reads.
 *
 * This is the whole point of the module. The old failure was silent: consent
 * succeeded, a token was printed, and it was worthless. Saying the client id
 * out loud before the browser opens makes a mismatch impossible to miss.
 */
function announce(purpose) {
  const c = googleClient(purpose);
  if (!c.clientId || !c.clientSecret) {
    console.error(`Missing ${CHAIN[purpose].id[0]} / ${CHAIN[purpose].secret[0]} in .env.local`);
    process.exit(1);
  }
  console.log(`Minting a refresh token for: ${c.label}`);
  console.log(`  client   ${c.clientId}`);
  console.log(`  from     ${c.idFrom} / ${c.secretFrom}`);
  if (c.legacy) {
    console.log(`  NOTE     falling back to a legacy variable name. The app reads`);
    console.log(`           ${CHAIN[purpose].id[0]} first — set it, or this token will`);
    console.log(`           be minted by a client the app never uses.`);
  }
  console.log(`  save as  ${c.refreshVar}`);
  console.log("");
  return c;
}

module.exports = { CHAIN, googleClient, announce };
