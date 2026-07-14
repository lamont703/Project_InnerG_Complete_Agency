// One-time interactive script to mint a Google Search Console API refresh
// token. Run locally with: node scripts/gsc_oauth_setup.js
//
// Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local, and that
// OAuth client's Google Cloud project has the "Google Search Console API"
// enabled (console.cloud.google.com -> APIs & Services -> Library).
//
// Separate refresh token from GOOGLE_ADS_REFRESH_TOKEN — a refresh token is
// scoped to whatever was granted at consent time, so the Ads-scoped token
// can't be reused here. Mirrors scripts/google_ads_oauth_setup.js exactly,
// same already-registered redirect URI, different scope.
require("dotenv").config({ path: ".env.local" });
const readline = require("readline");

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/youtube/callback";

if (!clientId || !clientSecret) {
  console.error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env.local");
  process.exit(1);
}

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.append("client_id", clientId);
authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
authUrl.searchParams.append("response_type", "code");
authUrl.searchParams.append("scope", "https://www.googleapis.com/auth/webmasters.readonly");
authUrl.searchParams.append("access_type", "offline");
authUrl.searchParams.append("prompt", "consent");

console.log("\n1. Open this URL and log in with the Google account that has Search Console access to the site:\n");
console.log(authUrl.toString());
console.log("\n2. After approving, the browser will redirect to " + REDIRECT_URI + " and likely show an error page.");
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
    console.log(`GOOGLE_GSC_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(
      "\nNext: run `node scripts/gsc_list_sites.js` once that env var is set — it'll list every site " +
        "this account can access in Search Console, so we can grab the exact site URL string " +
        "(e.g. \"https://agency.innergcomplete.com/\" or \"sc-domain:innergcomplete.com\") the API expects."
    );
  } catch (err) {
    console.error("\nToken exchange failed:", err.message);
    process.exit(1);
  }
});
