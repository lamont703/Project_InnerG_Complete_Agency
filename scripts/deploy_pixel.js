/**
 * Publish public/pixel/inner-g-pixel.js to Supabase Storage.
 *
 * The pixel is loaded from Storage, not from this app, so editing the file in
 * the repo changes nothing on the live site until it is uploaded. There was no
 * script for this — the served copy had already drifted from the repo copy,
 * which means a fix could sit in git looking done while every visitor ran the
 * old code.
 *
 * Dry-run by default; --live uploads.
 *
 *   node scripts/deploy_pixel.js          # show the diff size, upload nothing
 *   node scripts/deploy_pixel.js --live   # publish
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const BUCKET = "pixel";
const OBJECT = "inner-g-pixel.js";
const LOCAL = path.join(__dirname, "..", "public", "pixel", OBJECT);
const LIVE = process.argv.includes("--live");

(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("Missing Supabase credentials"); process.exit(1); }

  const local = fs.readFileSync(LOCAL);
  const servedRes = await fetch(`${url}/storage/v1/object/public/${BUCKET}/${OBJECT}`);
  const served = servedRes.ok ? Buffer.from(await servedRes.arrayBuffer()) : null;

  console.log(`local  ${local.length} bytes`);
  console.log(`served ${served ? served.length + " bytes" : "(not found)"}`);
  if (served && served.equals(local)) {
    console.log("\nIdentical — nothing to publish.");
    return;
  }
  if (!LIVE) {
    console.log("\nThey differ. Re-run with --live to publish.");
    return;
  }

  const db = createClient(url, key);
  const { error } = await db.storage.from(BUCKET).upload(OBJECT, local, {
    contentType: "application/javascript",
    upsert: true,
    // The <script> tag is not versioned, so a long cache would strand visitors
    // on old code. An hour matches what Storage was already serving.
    cacheControl: "3600",
  });
  if (error) { console.error("Upload failed:", error.message); process.exit(1); }
  console.log("\nPublished. Cached for an hour, so allow that long for the change to reach everyone.");
})();
