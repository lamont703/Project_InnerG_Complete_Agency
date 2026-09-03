// One-time interactive script to mint the Gmail refresh token for the video
// request agent. Run locally with: node scripts/gmail_oauth_setup.js
//
// Requires GOOGLE_GMAIL_CLIENT_ID and GOOGLE_GMAIL_CLIENT_SECRET in .env.local.
// That OAuth client's Google Cloud project needs the "Gmail API" enabled
// (console.cloud.google.com -> APIs & Services -> Library).
//
// LOG IN AS THE AGENT, NOT AS YOURSELF. The consent screen must be approved
// while signed in as claudedawg113@gmail.com. Approving as a human account
// mints a token that reads the wrong mailbox — and it will look like it worked.
//
// TWO THINGS ABOUT THIS TOKEN THAT DO NOT APPLY TO THE OTHERS:
//
//   1. PUBLISH THE APP BEFORE MINTING. Google's OAuth docs: "A Google Cloud
//      Platform project with an OAuth consent screen configured for an external
//      user type and a publishing status of 'Testing' is issued a refresh token
//      expiring in 7 days." Minted in Testing, the agent dies silently one week
//      later. Set the consent screen to "In production" first, then run this.
//
//   2. A PASSWORD CHANGE REVOKES IT. Google revokes refresh tokens when the
//      account password changes IF Gmail scopes were granted. That is the whole
//      reason the agent has its own account: rotating your own password must
//      not take the pipeline down.
require("dotenv").config({ path: ".env.local" });
const { announce } = require("./_google_clients");
const readline = require("readline");

/*
 * Resolved BY PURPOSE. announce() prints the client id before the browser
 * opens, because the failure this guards against is silent: consent succeeds,
 * a token is printed, and it was minted by a client the app never reads.
 */
const creds = announce("gmail");
const clientId = creds.clientId;
const clientSecret = creds.clientSecret;

// Register EXACTLY this string as an Authorized redirect URI on the client.
// It never has to serve anything — the code is read out of the address bar.
const REDIRECT_URI = "http://localhost:3000/oauth/callback";

/*
 * gmail.modify covers reading messages, downloading attachments, and applying
 * the label state machine. The send reference lists modify as sufficient to
 * send, but gmail.send is requested alongside it: both sit in the same
 * RESTRICTED tier so it costs nothing extra at review time, and re-minting
 * because of a scope guess is the expensive outcome.
 *
 * Scopes are granted at consent time and frozen into the token, so widening
 * this list later means running this script again.
 */
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
];

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.append("client_id", clientId);
authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
authUrl.searchParams.append("response_type", "code");
authUrl.searchParams.append("scope", SCOPES.join(" "));
authUrl.searchParams.append("access_type", "offline");
// Without prompt=consent Google returns no refresh_token on a repeat grant.
authUrl.searchParams.append("prompt", "consent");

console.log("\n1. Open this URL in a browser SIGNED IN AS claudedawg113@gmail.com:\n");
console.log(authUrl.toString());
console.log("\n   If you are signed into another Google account, use a private window.");
console.log("   Approving as the wrong account is the one mistake this script cannot detect.\n");
console.log("2. You will see an 'unverified app' warning. Click Advanced -> Go to (unsafe).");
console.log("   That warning is expected for a restricted-scope app used by its own owner.\n");
console.log("3. The browser redirects to " + REDIRECT_URI + " and shows an error page.");
console.log("   That's expected — the page doesn't need to exist. Read the address bar:");
console.log("   it looks like " + REDIRECT_URI + "?code=4/0AeaY...&scope=...");
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
    if (!tokens.refresh_token) {
      throw new Error(
        "Google returned an access token but no refresh_token. That happens when " +
          "the account has already granted this client and prompt=consent was not " +
          "honoured. Revoke the app at myaccount.google.com/permissions and re-run."
      );
    }

    // Confirm WHICH mailbox was actually granted, rather than trusting that the
    // right account was signed in. This is the check that catches the mistake
    // step 1 warns about, and it costs one API call.
    let mailbox = "(could not read profile)";
    try {
      const who = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const profile = await who.json();
      if (profile.emailAddress) mailbox = profile.emailAddress;
    } catch {
      /* non-fatal: the token is still good, we just cannot name the mailbox */
    }

    console.log(`\nGranted for mailbox: ${mailbox}`);
    if (mailbox !== "claudedawg113@gmail.com") {
      console.log("\n  STOP — that is not the agent's mailbox.");
      console.log("  Revoke at myaccount.google.com/permissions and re-run signed in as");
      console.log("  claudedawg113@gmail.com. Do not save the token below.\n");
    } else {
      console.log("\nSuccess. Add this to .env.local:\n");
      console.log(`GOOGLE_GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log("\nThen: node scripts/google_clients_doctor.js — it should report the");
      console.log("gmail purpose as healthy against Google, which is the only proof that");
      console.log("the id, the secret and this token actually belong together.\n");
    }
  } catch (err) {
    console.error("\nToken exchange failed:", err.message);
    process.exit(1);
  }
});
