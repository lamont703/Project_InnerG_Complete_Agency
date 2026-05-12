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

const CLIENT_ID = env['GOOGLE_CLIENT_ID'];
const CLIENT_SECRET = env['GOOGLE_CLIENT_SECRET'];

// The exact redirect URI configured in Google Cloud
const REDIRECT_URI = 'https://agency.innergcomplete.com/auth/google/callback';

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
  
  console.log("\n1. To test the API, you first need an access token.");
  console.log("Please visit the following URL to authorize this application:\n");
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
