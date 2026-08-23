/*
 * Wait for the v3 Reels to finish rendering, then upload and queue each one at
 * the BACK of the publisher line.
 *
 * WAITS RATHER THAN ASSUMING. Rendering is ~250s per Reel on an idle machine
 * and was measured at 1709s under load, so "it should be done by now" is not a
 * safe assumption to build a queue insert on. It polls, and only queues Reels
 * whose file actually exists.
 *
 * Idempotent on item_key, so re-running repairs rather than duplicates.
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BASE = "https://senkwhdxgtypcrtoggyf.supabase.co/storage/v1/object/public/entity-photos/";
const CFG = JSON.parse(fs.readFileSync("scripts/instagram/hairstyle-batch/concepts-v3-ready.json", "utf8"));

const TITLES = {
  "m-designs": "6 Clipper Hair Designs #Shorts",
  "m-black":   "6 Barbershop Classics #Shorts",
  "m-latino":  "6 Cuts From the Latino Barbershop #Shorts",
  "m-asian":   "6 Korean and Japanese Mens Cuts #Shorts",
};
const HASHTAGS = ["#hairstyles","#haircut","#barber","#barbershop","#hairstylist","#salon",
                  "#hairinspo","#newhair","#hairgoals","#fresh","#shearquery"];

const caption = (c) => [
  c.h, "", c.n.map((s, i) => `${i + 1}. ${s}`).join("\n"), "",
  "Comment the number you want and I'll ask which city you're in, then send you shops near you that actually do it.", "",
  "We track 8,800+ barbershops, salons and stylists, so it's a real shop with real reviews - not a guess.",
  "", ".", ".", ".", "", HASHTAGS.join(" "),
].join("\n");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // Wait up to three hours for every Reel to appear and stop growing.
  for (let i = 0; i < 360; i++) {
    const missing = CFG.filter((c) => !fs.existsSync(`experiments/hairstyle-reels-v3/${c.k}.mp4`));
    if (!missing.length) break;
    if (i % 12 === 0) console.log(`waiting on ${missing.map((m) => m.k).join(", ")}`);
    await sleep(30000);
  }
  await sleep(20000);   // let the last ffmpeg mux flush

  const { data: tail } = await admin.from("publisher_queue")
    .select("position").order("position", { ascending: false }).limit(1);
  let pos = tail?.[0]?.position || 0;

  for (const c of CFG) {
    const local = `experiments/hairstyle-reels-v3/${c.k}.mp4`;
    if (!fs.existsSync(local)) { console.log(`SKIP ${c.k} - never rendered`); continue; }

    const vid = `instagram/reel-${c.k}.mp4`;
    const up = await admin.storage.from("entity-photos")
      .upload(vid, fs.readFileSync(local), { contentType: "video/mp4", upsert: true });
    if (up.error) { console.log(`ERR upload ${c.k}: ${up.error.message}`); continue; }

    const cov = `instagram/cover-${c.k}.jpg`;
    const cf = `experiments/hairstyle-covers-v3/${c.k}.jpg`;
    if (fs.existsSync(cf)) {
      await admin.storage.from("entity-photos")
        .upload(cov, fs.readFileSync(cf), { contentType: "image/jpeg", upsert: true });
    }

    pos += 1;
    const { error } = await admin.from("publisher_queue").upsert({
      item_key: `hairstyles-${c.k}`, title: TITLES[c.k], stat: null, label: c.h,
      question: "Comment the number you want and I will send you shops near you that do it.",
      video_url: BASE + vid, thumbnail_url: BASE + cov,
      duration_secs: 9, caption: caption(c), position: pos, status: "queued",
    }, { onConflict: "item_key" });
    console.log(error ? `ERR row ${c.k}: ${error.message}` : `pos ${pos}  hairstyles-${c.k}`);
  }
  console.log("QUEUE DONE");
})();
