#!/usr/bin/env node
/**
 * Mint a one-time signed upload URL for a storage path.
 *
 *   node scripts/instagram/signed_upload.js --path=instagram/grid-1.jpg
 *
 * WHY THIS EXISTS. Getting a generated image out of Google AI Studio means the
 * page has to hand us the bytes, and the page cannot be trusted with a key. A
 * service-role key pasted into a third-party tab bypasses every RLS policy we
 * have and can be read by anything else running there - it is the single worst
 * credential to expose and there is no way to scope it down.
 *
 * A signed upload URL is the opposite: one path, short expiry, no key. The page
 * can write exactly the object we asked for and nothing else.
 *
 * upsert:true because a generation often needs a second attempt - the model
 * errors intermittently, or the first result is wrong - and a URL that refuses
 * the retry means minting a new one every time something goes slightly wrong.
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const arg = (n) => { const m = process.argv.find((a) => a.startsWith(`--${n}=`)); return m ? m.split("=").slice(1).join("=") : null; };
const PATH = arg("path");

(async () => {
  if (!PATH) throw new Error("--path is required");
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await admin.storage.from("entity-photos").createSignedUploadUrl(PATH, { upsert: true });
  if (error) throw new Error(error.message);
  console.log(data.signedUrl);
})();
