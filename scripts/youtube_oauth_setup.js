/**
 * One-time interactive script to mint the YouTube refresh token.
 *
 *   node scripts/youtube_oauth_setup.js
 *
 * WHY THIS SCRIPT DID NOT EXIST UNTIL NOW, and why its absence cost a slot.
 * YouTube was the last thing still riding on the shared customer-facing OAuth
 * client — Search Console and Ads had been moved to their own, YouTube never
 * was. So its refresh token was issued by the SAME client shop owners consent
 * to for Business Profile. When the old GBP connection was disconnected, that
 * revoked the grant on that client, and the YouTube token died with it:
 *
 *   invalid_grant — "Token has been expired or revoked."
 *
 * Nothing about YouTube changed. Revoking one integration silently killed
 * another, because they shared a credential. That is the whole argument for a
 * client per purpose, demonstrated the expensive way.
 *
 * MINTS AGAINST GOOGLE_YOUTUBE_CLIENT_ID, deliberately and with no fallback to
 * the old shared client. A refresh token belongs to the client that mints it,
 * so falling back would quietly recreate the coupling this exists to end.
 *
 * SCOPES ARE THE THREE THE PREVIOUS GRANT ACTUALLY HELD, no more. Google's own
 * guidance is to "request the narrowest scope(s) your app needs", and these
 * three are proven sufficient for this workload — the daily Shorts upload,
 * thumbnails.set, comment reads and the analytics pulls all ran on them.
 * youtube.force-ssl is the one that carries the upload: it grants management of
 * the account, which is why no separate youtube.upload was ever needed.
 */

require("dotenv").config({ path: ".env.local" });
const readline = require("readline");

const clientId = process.env.GOOGLE_YOUTUBE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_YOUTUBE_CLIENT_SECRET;

// The same already-registered redirect the other internal setup scripts use.
// The page does not need to render anything; only the address bar matters.
const REDIRECT_URI = process.env.REDIRECT_URI || "http://localhost:3000/youtube/callback";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
].join(" ");

if (!clientId || !clientSecret) {
  console.error(
    "\nGOOGLE_YOUTUBE_CLIENT_ID / GOOGLE_YOUTUBE_CLIENT_SECRET are not set in .env.local.\n" +
    "This must be the DEDICATED YouTube client, not the old shared one — minting against\n" +
    "the shared client is what let a Business Profile disconnect kill YouTube publishing."
  );
  process.exit(1);
}

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", clientId);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPES);
authUrl.searchParams.set("access_type", "offline");
// Without prompt=consent a re-authorisation returns no refresh token at all,
// and the connection silently becomes unrenewable.
authUrl.searchParams.set("prompt", "consent");

console.log(`\nClient: ${clientId.split(".")[0]}`);
console.log(`Redirect URI: ${REDIRECT_URI}`);
console.log("  ^ this EXACT string must be registered on that client in Google Cloud Console.\n");
console.log("1. Open this and approve as the Google account that owns the YouTube channel:\n");
console.log(authUrl.toString());
console.log(`\n2. The browser lands on ${REDIRECT_URI} and may show an error page. That is fine —`);
console.log("   read the address bar and copy the code, or just paste the whole URL.\n");

/** Accept the bare code, code&state=..., or the entire redirected URL. */
function extractCode(pasted) {
  let raw = (pasted || "").trim().replace(/^["']|["']$/g, "");
  if (raw.includes("code=")) {
    try {
      const params = new URLSearchParams(raw.slice(raw.indexOf("code=")));
      const c = params.get("code");
      if (c) return c.trim();
    } catch { /* fall through */ }
  }
  return raw.split("&")[0].split("#")[0].trim();
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Paste the code (the whole redirected URL is fine): ", async (answer) => {
  rl.close();
  const code = extractCode(answer);
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      }),
    });
    const tokens = await res.json();
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);
    if (!tokens.refresh_token) {
      throw new Error(
        "no refresh_token returned. Revoke this app at myaccount.google.com/permissions and retry — " +
        "Google withholds it when a grant already exists."
      );
    }

    // Prove the token before telling anyone it works. The whole reason this
    // migration hurt is that credentials were trusted on the basis of being
    // stored rather than being redeemed.
    const check = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId, client_secret: clientSecret,
        refresh_token: tokens.refresh_token, grant_type: "refresh_token",
      }),
    }).then((r) => r.json());

    if (!check.access_token) {
      throw new Error(`minted, but it will not redeem: ${check.error_description || check.error}`);
    }
    const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${check.access_token}`)
      .then((r) => r.json()).catch(() => ({}));

    console.log("\n✓ Verified — the token redeems and carries:");
    for (const s of (info.scope || "").split(" ").filter(Boolean)) {
      console.log(`    ${s.replace("https://www.googleapis.com/auth/", "")}`);
    }
    console.log("\nSet this in .env.local AND in Vercel (production + preview):\n");
    console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(
      "\nIt must go in alongside GOOGLE_YOUTUBE_CLIENT_ID / _SECRET — a token and its client\n" +
      "have to travel together, or the next slot fails with unauthorized_client.\n" +
      "Then confirm with: node scripts/google_clients_doctor.js\n"
    );
  } catch (err) {
    console.error("\n✗ Token exchange failed:", err.message);
    process.exit(1);
  }
});
