// Lists every Search Console property this OAuth account can access, so we
// can grab the exact site URL string the API expects (e.g.
// "https://agency.innergcomplete.com/" for a URL-prefix property, or
// "sc-domain:innergcomplete.com" for a domain property) — GSC's API rejects
// anything that isn't an exact match, unlike the human-friendly GSC web UI.
// Run: node scripts/gsc_list_sites.js
require("dotenv").config({ path: ".env.local" });
const { google } = require("googleapis");

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_GSC_REFRESH_TOKEN } = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_GSC_REFRESH_TOKEN) {
  console.error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_GSC_REFRESH_TOKEN in .env.local.");
  console.error("Run node scripts/gsc_oauth_setup.js first.");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
oauth2Client.setCredentials({ refresh_token: GOOGLE_GSC_REFRESH_TOKEN });

const searchconsole = google.searchconsole({ version: "v1", auth: oauth2Client });

(async () => {
  try {
    const res = await searchconsole.sites.list();
    const sites = res.data.siteEntry || [];
    if (sites.length === 0) {
      console.log("No sites found for this account — make sure you approved with the Google account that owns the Search Console property.");
      return;
    }
    console.log("\nVerified sites this account can access:\n");
    for (const s of sites) {
      console.log(`  ${s.siteUrl}   (permission: ${s.permissionLevel})`);
    }
    console.log("\nAdd the exact siteUrl above to .env.local as GSC_SITE_URL.");
  } catch (err) {
    console.error("Failed to list sites:", err.message);
    process.exit(1);
  }
})();
