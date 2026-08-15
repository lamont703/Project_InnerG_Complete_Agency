const fs = require('fs');
const readline = require('readline');
const https = require('https');

// Simple env parser to avoid external dependencies
const envContent = fs.readFileSync('./.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2];
  }
});

// Internal automation client, not the customer-facing app's — this flow asks
// for sensitive YouTube scopes, which must not be attributed to the client that
// shows barbershop owners a consent screen. See lib/google-internal-oauth.ts.
const CLIENT_ID = env['GOOGLE_INTERNAL_CLIENT_ID'] || env['GOOGLE_CLIENT_ID'];
const CLIENT_SECRET = env['GOOGLE_INTERNAL_CLIENT_SECRET'] || env['GOOGLE_CLIENT_SECRET'];
if (!env['GOOGLE_INTERNAL_CLIENT_ID']) {
  console.warn("[youtube-oauth] GOOGLE_INTERNAL_CLIENT_ID not set — using the app's client.");
}

/**
 * The exact redirect URI configured in Google Cloud. It must match BYTE FOR
 * BYTE or Google refuses the request with redirect_uri_mismatch — scheme,
 * host, path, and the presence or absence of a trailing slash all count.
 *
 * TWO THINGS WERE WRONG WITH THE PREVIOUS VALUE, not one:
 *
 *   1. The host was agency.innergcomplete.com, the domain the site has moved
 *      away from (SITE_HOST is shearquery.com).
 *   2. The path was /auth/google/callback, which is not a route in this app
 *      and never has been. `find app -type d -name callback` lists eight
 *      callbacks and that is not among them. /youtube/callback IS one, so the
 *      redirect now lands on a page that actually exists.
 *
 * It only ever "worked" because this is a manual copy-paste flow: you read the
 * ?code= value out of the address bar, so a 404 at the destination is
 * survivable. It is still worth landing somewhere real.
 *
 * Override without editing this file when Google Cloud says otherwise:
 *   YOUTUBE_OAUTH_REDIRECT_URI=... node scripts/test-youtube-oauth.js
 */
const REDIRECT_URI =
  process.env.YOUTUBE_OAUTH_REDIRECT_URI ||
  env['YOUTUBE_OAUTH_REDIRECT_URI'] ||
  'https://shearquery.com/youtube/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.local");
  process.exit(1);
}

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl'
];

async function run() {
  console.log("=== YouTube API Auth Flow ===");
  
  // 1. Generate Auth URL
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', SCOPES.join(' '));
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent');
  
  // Printed prominently because a mismatch here is the single most common way
  // this flow fails, and the error Google returns names the URI it expected.
  console.log("\nRedirect URI this flow will send: " + REDIRECT_URI);
  console.log("It must match an Authorised redirect URI on the OAuth client EXACTLY.");
  console.log("If you get redirect_uri_mismatch, copy the value above into Google Cloud,");
  console.log("or re-run with YOUTUBE_OAUTH_REDIRECT_URI=<the one Google has>.\n");

  console.log("PICK THE RIGHT CHANNEL. If this Google account owns more than one");
  console.log("YouTube channel, Google will ask which to authorise — choose the");
  console.log("ShearQuery channel, not a personal one. The audit prints the channel");
  console.log("it authenticated as so you can confirm afterwards.\n");

  console.log("1. Visit this URL to authorize:\n");
  console.log(authUrl.toString());
  
  console.log("\n2. After authorizing, you will be redirected to: " + REDIRECT_URI);
  console.log("The URL you are redirected to will look like: " + REDIRECT_URI + "?code=4/0AeaY...&scope=...");
  console.log("Copy EVERYTHING after 'code=' (until any other parameter like '&scope=').\n");
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question("Enter the authorization code here: ", async (code) => {
    rl.close();

    if (!code) {
      console.error("No code provided. Exiting.");
      process.exit(1);
    }

    console.log("\nExchanging code for tokens...");

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code: code.trim(),
          grant_type: 'authorization_code',
          redirect_uri: REDIRECT_URI
        })
      });
      
      const tokens = await tokenResponse.json();
      
      console.log("\n=== AUTHENTICATION SUCCESSFUL ===");
      console.log("Copy these values into your Admin Connectors page:");
      console.log("--------------------------------------------------");
      console.log("Access Token:  " + tokens.access_token);
      console.log("Refresh Token: " + (tokens.refresh_token || "Already have one (or re-auth to see it)"));
      console.log("--------------------------------------------------");
      
      console.log("\n3. Making a test call to YouTube API (Channels List)...");
      const ytResponse = await fetch('https://youtube.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Accept': 'application/json'
        }
      });

      const ytData = await ytResponse.json();
      
      if (ytData.error) {
        console.error("YouTube API Error:", ytData.error.message);
      } else {
        console.log("YouTube API Call Successful!");
        if (ytData.items && ytData.items.length > 0) {
          console.log(`Channel Found: ${ytData.items[0].snippet.title}`);
          console.log(`Subscribers: ${ytData.items[0].statistics.subscriberCount}`);
          console.log(`Views: ${ytData.items[0].statistics.viewCount}`);
          console.log(`Videos: ${ytData.items[0].statistics.videoCount}`);
        } else {
          console.log("No channels found for this account.");
        }
      }
    } catch (err) {
      console.error("Error:", err);
    }
  });
}

run();
