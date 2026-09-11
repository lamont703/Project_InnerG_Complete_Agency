/**
 * Post a Google Business Profile update to OUR OWN listing, ad hoc.
 *
 *   node --experimental-strip-types --import ./scripts/_alias-loader.mjs \
 *     scripts/gbp/post_brand_image.mjs \
 *     --image=<public https url> --summary-file=<path> [--url=...] [--dry-run]
 *
 * WHY A SCRIPT. lib/gbp-brand-publish.ts is only ever reached from the content
 * publisher's fan-out, which starts from a publisher_queue row — so a one-off
 * marketing image had no route to the listing without inventing a fake queue
 * row. This calls the same library the cron does.
 *
 * IT DOES NOT RE-IMPLEMENT writeLocalPost, and that matters beyond tidiness:
 * that function records a gbp_write_snapshots row on every write. A hand-rolled
 * copy of the same HTTP call posts successfully and writes nothing to the audit
 * trail — the post appears on a public listing with no record of who made it.
 *
 * THE DRY RUN REDEEMS THE REFRESH TOKEN. verifyGbpCredentials mints an access
 * token, which is read-only and does not rotate the refresh token on Google.
 * Checking only that a token is STORED proves nothing: a token belongs to the
 * client that minted it, so the wrong client id in the environment fails at
 * post time with invalid_grant while every local check looks perfect.
 */
import dotenv from "dotenv";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
dotenv.config({ path: ".env.local", override: true });

const { publishToGbpBrand, verifyGbpCredentials, GBP_SUMMARY_LIMIT } = await import("../../lib/gbp-brand-publish.ts");

const arg = (n, d) => { const m = process.argv.find((a) => a.startsWith(`--${n}=`)); return m ? m.split("=").slice(1).join("=") : d; };
const IMAGE = arg("image");
const SUMMARY_FILE = arg("summary-file");
const URL_ = arg("url", "https://shearquery.com");
const DRY = process.argv.includes("--dry-run");

if (!SUMMARY_FILE) { console.error("--summary-file is required"); process.exit(1); }
const summary = fs.readFileSync(SUMMARY_FILE, "utf8").trimEnd();
if (summary.length > GBP_SUMMARY_LIMIT) { console.error(`summary is ${summary.length} chars, over Google's ${GBP_SUMMARY_LIMIT}`); process.exit(1); }

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: conn, error } = await s.from("publisher_connections").select("*").eq("platform", "gbp").single();
if (error) { console.error(`publisher_connections: ${error.message}`); process.exit(1); }
if (!conn.enabled) { console.error("the gbp connection is disabled"); process.exit(1); }

if (IMAGE) {
  const head = await fetch(IMAGE, { method: "HEAD" });
  if (!head.ok) { console.error(`image not reachable: HTTP ${head.status}`); process.exit(1); }
}

console.log(`  listing : ${conn.account_label}`);
console.log(`  location: ${conn.config.locationName}`);
console.log(`  image   : ${IMAGE || "(none)"}`);
console.log(`  button  : LEARN_MORE -> ${URL_}`);
console.log(`  summary : ${summary.length}/${GBP_SUMMARY_LIMIT} chars\n${summary.split("\n").map((l) => "    | " + l).join("\n")}\n`);

const cred = await verifyGbpCredentials(conn.refresh_token);
console.log(`  credentials: ${cred.ok ? "redeemable" : "FAILED — " + cred.error}`);
if (!cred.ok) process.exit(1);
if (DRY) { console.log("\n  Dry run — nothing posted.\n"); process.exit(0); }

const r = await publishToGbpBrand({
  refreshToken: conn.refresh_token,
  accountName: conn.config.accountName,
  locationName: conn.config.locationName,
  summary,
  photoUrl: IMAGE || null,
  url: URL_,
});
console.log(r.ok ? `\n  POSTED  ${r.postName}` : `\n  FAILED  ${r.error}`);
process.exit(r.ok ? 0 : 1);
