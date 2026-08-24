/**
 * One-time interactive connect for the content publisher's destinations.
 *
 *   node scripts/publisher_connect.js linkedin
 *   node scripts/publisher_connect.js x
 *   node scripts/publisher_connect.js gbp
 *   node scripts/publisher_connect.js tiktok
 *   node scripts/publisher_connect.js status
 *
 * WHY A SCRIPT AND NOT OAUTH ROUTES. These are FIRST-PARTY MACHINE CREDENTIALS,
 * the same category as YOUTUBE_REFRESH_TOKEN: one account per platform, ours,
 * authorised once by a person at a keyboard. They are not a customer consent
 * surface, so the app does not need to host a consent flow, a callback route or
 * a state store for them — that would be more code and more attack surface for
 * a button pressed roughly once a year. lib/google-internal-oauth.ts makes the
 * same argument for Search Console and Ads, and scripts/gsc_oauth_setup.js is
 * the pattern this follows.
 *
 * THE TOKENS LAND IN publisher_connections, NOT .env. Two of these rotate: X
 * issues a new refresh token on every use, and its access token lasts about two
 * hours. A value that changes three times a day cannot live in an environment
 * variable — the cron has to be able to write it back.
 *
 * REDIRECT URIS MUST MATCH WHAT IS REGISTERED. Each platform's developer portal
 * holds a fixed list, and the value sent here has to be one of them, character
 * for character. The existing scripts/get-linkedin-tokens.js and
 * scripts/get-tiktok-tokens.js still point at agency.innergcomplete.com, which
 * this project migrated away from — so do not copy a redirect URI from them
 * without checking the portal first. Override with REDIRECT_URI=... if needed.
 */

require("dotenv").config({ path: ".env.local" });
const readline = require("readline");
const crypto = require("crypto");
const { internalEnv } = require("./_google_internal_oauth");

const SITE = process.env.REDIRECT_BASE || "https://shearquery.com";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()); }));
}

/**
 * Pull the authorization code out of whatever got pasted.
 *
 * WHY THIS EXISTS. The first version told the operator to "copy everything
 * after code= up to the next &" and then sent the result verbatim. Paste one
 * character too many - the trailing `&state=...`, which sits immediately after
 * the code in every one of these redirects - and the provider answers
 * "authorization code not found", which reads like an expired or rejected code
 * rather than a copy-paste artefact. That cost a round trip through a consent
 * screen to diagnose.
 *
 * Asking a person to do string surgery on a 300-character token and then
 * trusting the result was the mistake. This accepts any of:
 *   - the bare code
 *   - code&state=...
 *   - the whole redirect URL
 *   - ?code=...&state=... 
 */
function extractCode(pasted) {
  let raw = (pasted || "").trim().replace(/^["']|["']$/g, "");

  // A full URL, or any query string: read the code parameter properly rather
  // than slicing, so an encoded value survives.
  if (raw.includes("code=")) {
    try {
      const qs = raw.slice(raw.indexOf("code="));
      const params = new URLSearchParams(qs);
      const fromParams = params.get("code");
      if (fromParams) return fromParams.trim();
    } catch { /* fall through to the cruder cut below */ }
  }

  // Bare code that still carries a trailing &state= or #fragment.
  raw = raw.split("&")[0].split("#")[0];
  return raw.trim();
}

async function saveConnection(platform, patch) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("\nMissing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local.");
    console.error("The tokens above are valid — rerun once those are set, or paste them in by hand.");
    process.exit(1);
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/publisher_connections?platform=eq.${platform}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ ...patch, status: "connected", connected_at: new Date().toISOString(), updated_at: new Date().toISOString(), last_error: null }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(body) || body.length === 0) {
    console.error(`\nCould not save the connection: ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
    console.error("Has migration 20260820090000_publisher_fanout.sql been applied?");
    process.exit(1);
  }
  console.log(`\n✓ ${platform} saved to publisher_connections (${body[0].account_label || "no label"}).`);
  if (!body[0].enabled) {
    console.log(`  NOTE: ${platform} is stored but NOT ENABLED, so the cron will skip it.`);
  }
}

/* ------------------------------------------------------------------ LinkedIn */

async function connectLinkedIn() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("LINKEDIN_CLIENT_ID / _SECRET missing");

  const redirectUri = process.env.REDIRECT_URI || `${SITE}/linkedin/callback`;
  // Posting as the member needs w_member_social; openid+profile is how we learn
  // WHICH member, which becomes the author URN. Asking for the organisation
  // scopes here would be requesting more than this connection uses.
  const scopes = "openid profile w_member_social";

  const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("state", crypto.randomBytes(8).toString("hex"));

  console.log(`\nRedirect URI in use: ${redirectUri}`);
  console.log("  ^ this EXACT string must be in the LinkedIn app's Auth tab -> Authorized redirect URLs.");
  console.log("\n1. Open this and approve as the LinkedIn account that should author the posts:\n");
  console.log(authUrl.toString());
  console.log(`\n2. You will land on ${redirectUri}?code=...  — copy everything after code= up to the next &\n`);

  const code = extractCode(await ask("Paste the code (the whole redirected URL is fine): "));

  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const token = await tokenRes.json();
  if (!token.access_token) throw new Error(`token exchange failed: ${JSON.stringify(token)}`);

  // The author URN comes from the OIDC subject. Guessing it from a profile id
  // is how a member post ends up addressed to an organisation URN and refused.
  const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const me = await meRes.json();
  if (!me.sub) throw new Error(`could not read userinfo: ${JSON.stringify(me)}`);

  await saveConnection("linkedin", {
    access_token: token.access_token,
    refresh_token: token.refresh_token || null,
    expires_at: new Date(Date.now() + Number(token.expires_in || 5184000) * 1000).toISOString(),
    account_label: `${me.name || me.email || me.sub} (member)`,
    config: { authorUrn: `urn:li:person:${me.sub}` },
  });

  console.log(`\nLinkedIn access tokens last about 60 days. Rerun this before ${new Date(Date.now() + Number(token.expires_in || 5184000) * 1000).toDateString()}.`);
}

/* ------------------------------------------------------------------------- X */

async function connectX() {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("TWITTER_CLIENT_ID / _SECRET missing");

  const redirectUri = process.env.REDIRECT_URI || `${SITE}/x/callback`;
  /*
   * offline.access is what yields a refresh token; without it the connection
   * dies in two hours and there is nothing to renew it with.
   *
   * media.write is documented as a valid scope ("Upload media") but is NOT what
   * the previous connection here requested - components/social/twitter-login-button.tsx
   * asks for the other four and nothing else. If the authorize screen refuses
   * the whole request, drop it and find out whether the scope or the callback
   * URL is the problem:
   *
   *   X_SCOPES="tweet.read tweet.write users.read offline.access" node scripts/publisher_connect.js x
   *
   * A connection without media.write can still post text; the chunked upload in
   * lib/x-publish.ts is what would fail.
   */
  const scopes = process.env.X_SCOPES || "tweet.read tweet.write users.read media.write offline.access";

  const verifier = crypto.randomBytes(48).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");

  const authUrl = new URL("https://x.com/i/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("state", crypto.randomBytes(8).toString("hex"));
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  console.log(`\nRedirect URI in use: ${redirectUri}`);
  console.log("  ^ this EXACT string must be in the X app's \"Callback URI / Redirect URL\" list.");
  console.log(`  Scopes: ${scopes}`);
  console.log("\n1. Open this and approve as the X account that should post:\n");
  console.log(authUrl.toString());
  console.log(`\n2. You will land on ${redirectUri}?code=... — copy everything after code= up to the next &\n`);

  const code = extractCode(await ask("Paste the code (the whole redirected URL is fine): "));

  const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier,
    }),
  });
  const token = await tokenRes.json();
  if (!token.access_token) throw new Error(`token exchange failed: ${JSON.stringify(token)}`);
  if (!token.refresh_token) {
    throw new Error("X returned no refresh token — offline.access was not granted, so this connection would die in two hours");
  }

  const meRes = await fetch("https://api.x.com/2/users/me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const me = await meRes.json().catch(() => ({}));

  await saveConnection("x", {
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: new Date(Date.now() + Number(token.expires_in || 7200) * 1000).toISOString(),
    account_label: me?.data?.username ? `@${me.data.username}` : "X account",
    config: { userId: me?.data?.id || null },
  });
}

/* ----------------------------------------------------------------------- GBP */

async function connectGbp() {
  // THE BRAND CLIENT, not the shared internal one. Each Google purpose has its
  // own client now, and a refresh token belongs to the client that minted it —
  // minting this one against anything else produces a token the publisher
  // cannot redeem, which surfaces at a publishing slot as a revoked connection.
  const clientId = process.env.GOOGLE_GBP_BRAND_CLIENT_ID || internalEnv().GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_GBP_BRAND_CLIENT_SECRET || internalEnv().GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_GBP_BRAND_CLIENT_ID / _SECRET are not set");
  }
  if (!process.env.GOOGLE_GBP_BRAND_CLIENT_ID) {
    console.warn("⚠ Falling back to the old shared internal client. Set GOOGLE_GBP_BRAND_CLIENT_ID.");
  }

  // Same already-registered redirect the other internal scripts use. The page
  // does not need to exist; only the address bar matters.
  const redirectUri = process.env.REDIRECT_URI || "http://localhost:3000/youtube/callback";

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/business.manage");
  authUrl.searchParams.set("access_type", "offline");
  // Without prompt=consent a re-authorisation returns no refresh token, and the
  // connection silently becomes unrenewable.
  authUrl.searchParams.set("prompt", "consent");

  console.log("\n1. Open this and approve as the Google account that owns the ShearQuery Business Profile:\n");
  console.log(authUrl.toString());
  console.log(`\n2. The browser lands on ${redirectUri} and probably shows an error page. That is fine —`);
  console.log("   read the address bar and copy everything after code= up to the next &\n");

  const code = extractCode(await ask("Paste the code (the whole redirected URL is fine): "));

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret, code,
      grant_type: "authorization_code", redirect_uri: redirectUri,
    }),
  });
  const token = await tokenRes.json();
  if (!token.refresh_token) {
    throw new Error(`no refresh token returned: ${JSON.stringify(token)} — revoke the app at myaccount.google.com/permissions and retry`);
  }

  // The account list is the entry point: a Business Profile location always
  // hangs off an account, and there is no way to query locations without one.
  const accRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const accPayload = await accRes.json().catch(() => ({}));
  if (!accRes.ok) {
    throw new Error(
      `could not list Business Profile accounts: ${accRes.status} ${JSON.stringify(accPayload).slice(0, 300)}\n` +
      "  A 403 here usually means the Business Profile APIs are not enabled on this Google Cloud project."
    );
  }
  const accounts = accPayload.accounts || [];
  if (!accounts.length) {
    throw new Error(
      "this Google login manages no Business Profile accounts at all.\n" +
      "  Check which account owns the listing at business.google.com, then rerun and approve as that one."
    );
  }

  /*
   * EVERY ACCOUNT, NOT JUST THE FIRST.
   *
   * This originally read accounts[0] and listed only that account's locations,
   * which is wrong in the common case: a Google login usually carries a
   * PERSONAL account AND any LOCATION_GROUP or ORGANIZATION accounts the
   * business is managed under. A brand managed through a location group is
   * invisible to accounts[0], so the listing you are looking for simply never
   * appears in the picker and the flow looks like the business does not exist.
   *
   * Every account is listed with its type, so if the one you want still is not
   * here the answer is visible rather than inferred: either this Google login
   * has no access to it, or it is not a verified Business Profile.
   */
  const accountList = accounts.map((a) => `${a.name}  ${a.accountName || "unnamed"}  [${a.type || "?"}]`);
  console.log(`\nBusiness Profile accounts on this Google login (${accounts.length}):`);
  accountList.forEach((a) => console.log(`  ${a}`));

  const choices = [];
  for (const account of accounts) {
    const locRes = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,storefrontAddress&pageSize=100`,
      { headers: { Authorization: `Bearer ${token.access_token}` } }
    );
    const payload = await locRes.json().catch(() => ({}));
    if (!locRes.ok) {
      // One account refusing must not hide the others - a location group can
      // 403 while the personal account lists fine.
      console.log(`  (could not read locations for ${account.name}: ${locRes.status} ${JSON.stringify(payload).slice(0, 120)})`);
      continue;
    }
    for (const loc of payload.locations || []) {
      choices.push({
        accountName: account.name,
        accountLabel: account.accountName || account.name,
        locationName: loc.name,
        title: loc.title,
        city: loc.storefrontAddress?.locality || "",
      });
    }
  }

  if (!choices.length) {
    throw new Error(
      "no locations found on ANY account for this Google login.\n" +
      "  Either this login does not manage the listing, or the listing is not a verified Business Profile.\n" +
      "  Check which Google account owns it at business.google.com, then rerun and approve as that account."
    );
  }

  console.log("\nLocations you can post to:");
  choices.forEach((c, i) =>
    console.log(`  ${i + 1}. ${c.title}${c.city ? ` — ${c.city}` : ""}   [${c.accountLabel}]`)
  );

  const pick = Number(await ask("\nWhich number should the publisher post to? ")) - 1;
  const chosen = choices[pick];
  if (!chosen) throw new Error("no location chosen");

  await saveConnection("gbp", {
    refresh_token: token.refresh_token,
    access_token: null,
    expires_at: null,
    account_label: chosen.title,
    config: { accountName: chosen.accountName, locationName: chosen.locationName },
  });
}

/* -------------------------------------------------------------------- TikTok */

async function connectTikTok() {
  const clientKey = process.env.TIKTOK_PRODUCTION_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_PRODUCTION_CLIENT_SECRET;
  if (!clientKey || !clientSecret) throw new Error("TIKTOK_PRODUCTION_CLIENT_KEY / _SECRET missing");

  const redirectUri = process.env.REDIRECT_URI || `${SITE}/tiktok/callback`;
  // video.publish is the whole point of this connection and the app must be
  // APPROVED for it first — an unapproved scope is simply dropped from the
  // grant, and the failure only shows up at publish time.
  const scopes = "user.info.basic,video.publish";

  const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
  authUrl.searchParams.set("client_key", clientKey);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", crypto.randomBytes(8).toString("hex"));

  console.log(`\nRedirect URI in use: ${redirectUri}`);
  console.log("  ^ this EXACT string must be registered in the TikTok app's redirect URI list.");
  console.log("\n1. Open this and approve as the TikTok account that should post:\n");
  console.log(authUrl.toString());
  console.log(`\n2. You will land on ${redirectUri}?code=... — copy everything after code= up to the next &\n`);

  const code = extractCode(await ask("Paste the code (the whole redirected URL is fine): "));

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey, client_secret: clientSecret, code,
      grant_type: "authorization_code", redirect_uri: redirectUri,
    }),
  });
  const token = await tokenRes.json();
  if (!token.access_token) throw new Error(`token exchange failed: ${JSON.stringify(token)}`);

  const granted = String(token.scope || "");
  if (!granted.includes("video.publish")) {
    console.warn("\n⚠ video.publish was NOT granted. The app is not approved for it yet.");
    console.warn("  Saving the connection anyway, but leave tiktok disabled until it is.");
  }

  await saveConnection("tiktok", {
    access_token: token.access_token,
    refresh_token: token.refresh_token || null,
    expires_at: new Date(Date.now() + Number(token.expires_in || 86400) * 1000).toISOString(),
    account_label: token.open_id ? `open_id ${String(token.open_id).slice(0, 12)}…` : "TikTok account",
    config: { openId: token.open_id || null, privacyLevel: "SELF_ONLY" },
  });
}

/* -------------------------------------------------------------------- status */

async function showStatus() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/publisher_connections?select=*`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  const rows = await res.json();
  if (!Array.isArray(rows)) return console.error(rows);
  console.log("\nplatform   enabled  status        account");
  console.log("-".repeat(64));
  for (const r of rows) {
    console.log(
      `${r.platform.padEnd(10)} ${String(r.enabled).padEnd(8)} ${String(r.status).padEnd(13)} ${r.account_label || "—"}${r.last_error ? `\n           last error: ${r.last_error}` : ""}`
    );
  }
  console.log("");
}

const HANDLERS = { linkedin: connectLinkedIn, x: connectX, gbp: connectGbp, tiktok: connectTikTok, status: showStatus };

(async () => {
  const platform = (process.argv[2] || "").toLowerCase();
  const handler = HANDLERS[platform];
  if (!handler) {
    console.log(`Usage: node scripts/publisher_connect.js <${Object.keys(HANDLERS).join("|")}>`);
    process.exit(1);
  }
  try {
    await handler();
  } catch (e) {
    console.error(`\n✗ ${e.message}`);
    process.exit(1);
  }
})();
