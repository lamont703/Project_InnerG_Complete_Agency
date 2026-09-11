/**
 * Post a STILL IMAGE to the ShearQuery Instagram account.
 *
 *   node --experimental-strip-types scripts/instagram/post_image.mjs \
 *     --image=<public https url> --caption-file=<path> [--dry-run]
 *
 * WHY THIS EXISTS. Every publishing path in this repo posts VIDEO — the cron
 * publishes Reels from publisher_queue, and the hairstyle batch queues MP4s.
 * A plain marketing image had no route at all, and the gap is not obvious from
 * the outside because lib/instagram-publish.ts has supported images the whole
 * time; nothing had ever called it that way.
 *
 * IT IMPORTS THE LIB RATHER THAN REPEATING IT. That file's own header asks for
 * exactly this: it takes the token and account id as arguments so scripts can
 * import it, because a second copy of the container-then-publish sequence
 * "drifts and then fails differently in the two places". The cost is the
 * --experimental-strip-types flag, since the lib is TypeScript and this repo
 * has no TS runner. That is the cheaper of the two prices.
 *
 * THE CAPTION COMES FROM A FILE, NOT A FLAG. Captions carry newlines, emoji,
 * quotes and hashtags, and passing that through a shell argument is how a post
 * goes out with a mangled line break or a swallowed quote — in public, on the
 * brand account, where it cannot be edited without deleting the post.
 *
 * THE IMAGE MUST BE A PUBLIC URL. Instagram cURLs it itself, so a local path, a
 * signed URL, or anything behind auth fails at container creation with an error
 * that does not say so.
 */
import dotenv from "dotenv";
import fs from "node:fs";
/*
 * .env.local EXPLICITLY, with override. `import "dotenv/config"` reads .env,
 * which on this machine still holds a legacy Supabase service key — the call
 * fails with "Legacy API keys are disabled", which reads like a Supabase
 * account problem rather than the wrong file being loaded. Every other script
 * in this repo names .env.local for the same reason.
 */
dotenv.config({ path: ".env.local", override: true });
import { createClient } from "@supabase/supabase-js";
import { publishToInstagram } from "../../lib/instagram-publish.ts";

const arg = (n) => { const m = process.argv.find((a) => a.startsWith(`--${n}=`)); return m ? m.split("=").slice(1).join("=") : null; };
const IMAGE = arg("image");
const CAPTION_FILE = arg("caption-file");
const DRY = process.argv.includes("--dry-run");

if (!IMAGE || !CAPTION_FILE) { console.error("--image and --caption-file are both required"); process.exit(1); }
const caption = fs.readFileSync(CAPTION_FILE, "utf8").trimEnd();

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: conn, error } = await s.from("instagram_connection").select("*").limit(1).single();
if (error) { console.error(`instagram_connection: ${error.message}`); process.exit(1); }

// Fail before the container call rather than after, so an unreachable image is
// reported as an unreachable image instead of as an Instagram permissions error.
const head = await fetch(IMAGE, { method: "HEAD" });
if (!head.ok) { console.error(`image not reachable: HTTP ${head.status}`); process.exit(1); }

console.log(`  account : @${conn.username}`);
console.log(`  image   : ${IMAGE} (${head.headers.get("content-type")})`);
console.log(`  caption : ${caption.length} chars\n${caption.split("\n").map((l) => "    | " + l).join("\n")}\n`);
if (DRY) { console.log("  Dry run — nothing posted.\n"); process.exit(0); }

const r = await publishToInstagram({
  igUserId: conn.ig_user_id || conn.user_id,
  accessToken: conn.access_token,
  imageUrls: [IMAGE],
  caption,
});
console.log(r.ok ? `  POSTED  media ${r.mediaId}\n  ${r.permalink || "(no permalink returned)"}`
                 : `  FAILED at ${r.stage}: ${r.error}`);
process.exit(r.ok ? 0 : 1);
