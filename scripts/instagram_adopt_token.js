#!/usr/bin/env node
/**
 * Move a working Instagram token into instagram_connection, where it can be
 * refreshed.
 *
 *   node scripts/instagram_adopt_token.js           # check only
 *   node scripts/instagram_adopt_token.js --apply   # store it
 *
 * WHY THIS EXISTS. A token obtained any way other than /api/instagram/callback
 * — pasted into INSTAGRAM_ACCESS_TOKEN by hand, recovered from a dev session —
 * lives somewhere no job can write to. That is exactly how the last one died:
 * it worked for 60 days and then expired with nothing watching. A token that is
 * valid today but unrefreshable is not a working integration, it is the same
 * outage on a delay.
 *
 * IT DOES NOT GUESS THE EXPIRY IF IT CAN AVOID IT. Instagram Login tokens do
 * not expose their expiry — debug_token is a Facebook-Login endpoint and does
 * not accept them. So this tries a refresh first: on success Meta returns a
 * real expires_in and we store that with the new token. Refresh requires the
 * token to be at least 24 hours old, so a just-authorised token will be
 * refused — in which case we fall back to assuming 60 days from now, which is
 * true for a token authorised today, and the first cron run after 24 hours
 * replaces the assumption with the real figure.
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const { refreshInstagramToken, tokenType, TOKEN_LIFETIME_DAYS } = require("../lib/instagram-token.ts");
const { IG_SCOPES } = require("../lib/instagram-oauth.ts");

const APPLY = process.argv.includes("--apply");
const IG = "https://graph.instagram.com";

(async () => {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return console.error("INSTAGRAM_ACCESS_TOKEN is not set.");

  if (tokenType(token) !== "instagram_login") {
    return console.error("That is not an Instagram Login token (expected it to start IGAA).");
  }

  // 1. Does it work, and whose account is it?
  const meRes = await fetch(`${IG}/me?fields=id,username,account_type&access_token=${token}`);
  const me = await meRes.json().catch(() => ({}));
  if (me.error) return console.error("Token rejected:", me.error.message);

  console.log(`connected as @${me.username}  (id ${me.id}, ${me.account_type})`);

  // 2. Prefer a real expiry from Meta over an assumption.
  let accessToken = token;
  let expiresAt = null;
  let note = "";
  const refreshed = await refreshInstagramToken(token);
  if (refreshed.ok) {
    accessToken = refreshed.accessToken;
    expiresAt = refreshed.expiresAt;
    note = "refreshed on adoption, so the expiry is Meta's own figure";
  } else {
    expiresAt = new Date(Date.now() + TOKEN_LIFETIME_DAYS * 864e5).toISOString();
    note = `could not refresh yet (${refreshed.error}); assuming ${TOKEN_LIFETIME_DAYS} days from now — the first cron run after 24h will replace this with the real expiry`;
  }
  console.log(`expires_at: ${expiresAt}`);
  console.log(`  ${note}`);

  if (!APPLY) return console.log("\nCheck only. Re-run with --apply to store it.");

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await admin.from("instagram_connection").upsert(
    {
      id: 1,
      token_type: "instagram_login",
      access_token: accessToken,
      expires_at: expiresAt,
      ig_user_id: String(me.id),
      username: me.username || null,
      account_type: me.account_type || null,
      // What we ASKED for at authorisation. Instagram Login tokens do not
      // enumerate grants, so this is a claim to verify, not a fact.
      scopes: IG_SCOPES,
      last_refreshed_at: refreshed.ok ? new Date().toISOString() : null,
      last_refresh_error: refreshed.ok ? null : refreshed.error,
      status: "connected",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) return console.error("could not store:", error.message);

  console.log("\nstored in instagram_connection. The weekly cron will now keep it alive.");
  if (!refreshed.ok) {
    console.log("NOTE: rotate INSTAGRAM_ACCESS_TOKEN out of the env once you trust the table —");
    console.log("two copies of a rotating credential is how they drift apart.");
  }
})();
