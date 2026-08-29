// One-time interactive script to mint a Google Ads API refresh token.
// Run locally with: node scripts/google_ads_oauth_setup.js
//
// Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local, and that
// OAuth client's Google Cloud project has the Google Ads API enabled
// (console.cloud.google.com -> APIs & Services -> Library -> "Google Ads API" -> Enable).
//
// Google retired the old "urn:ietf:wg:oauth:2.0:oob" copy-paste flow, so the
// redirect_uri must be one already allow-listed in Google Cloud Console for
// this exact OAuth client. Reusing the URI already registered there for the
// existing YouTube integration (app/youtube/callback/page.tsx) — the scope
// we request doesn't have to match what that page expects, since we only
// need the "code=" value out of the URL bar, not anything that page renders.
require("dotenv").config({ path: ".env.local" });
const { announce } = require('./_google_clients');
const readline = require("readline");

/*
 * Resolved BY PURPOSE, not from GOOGLE_CLIENT_ID.
 *
 * This script used internalEnv().GOOGLE_CLIENT_ID, which resolves the
 * INTERNAL client — while the application reads this service through
 * googleClient("ads"), which resolves its own client. The two are
 * different, so every token this script minted was issued by a client the
 * app never uses: dead on arrival, with nothing failing at mint time.
 *
 * announce() prints the client before the browser opens, so a mismatch is
 * visible rather than discovered days later as "TOKEN DEAD".
 */
const creds = announce("ads");
const clientId = creds.clientId;
const clientSecret = creds.clientSecret;
const REDIRECT_URI = "http://localhost:3000/youtube/callback";

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.append("client_id", clientId);
authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
authUrl.searchParams.append("response_type", "code");
authUrl.searchParams.append("scope", "https://www.googleapis.com/auth/adwords");
authUrl.searchParams.append("access_type", "offline");
authUrl.searchParams.append("prompt", "consent");

console.log("\n1. Open this URL and log in with the Google account tied to your Google Ads manager account:\n");
console.log(authUrl.toString());
console.log("\n2. After approving, the browser will redirect to " + REDIRECT_URI + " and likely show a 404 page.");
console.log("   That's expected — the page doesn't need to exist. Look at the address bar instead:");
console.log("   it will look like " + REDIRECT_URI + "?code=4/0AeaY...&scope=...");
console.log("   Copy EVERYTHING after 'code=' up to (not including) the next '&'.\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Paste the authorization code here: ", async (code) => {
  rl.close();
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code.trim(),
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      }),
    });
    const tokens = await res.json();
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);

    console.log("\nSuccess. Add this to .env.local:\n");
    console.log(`GOOGLE_ADS_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(
      "\nYou also still need GOOGLE_ADS_CUSTOMER_ID (and GOOGLE_ADS_LOGIN_CUSTOMER_ID if this account " +
        "sits under a manager/MCC account) — both are visible in the Google Ads UI in the top-right corner, " +
        "formatted like 123-456-7890 (strip the dashes when you paste it into .env.local)."
    );
  } catch (err) {
    console.error("\nToken exchange failed:", err.message);
    process.exit(1);
  }
});
