/*
 * Upload each rendered v2 Reel and put it in the content publisher line.
 *
 * IDEMPOTENT ON item_key so a re-run after a partial failure repairs rather
 * than duplicates - the same discipline the first five followed. Position is
 * taken from the current tail each time, so nothing already queued moves.
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BASE = "https://senkwhdxgtypcrtoggyf.supabase.co/storage/v1/object/public/entity-photos/";
const CFG = JSON.parse(fs.readFileSync("scripts/instagram/hairstyle-batch/concepts.json", "utf8"));

const TITLES = {
  "w1-bobs": "6 Bob Haircuts, Explained #Shorts",
  "w2-layers": "6 Layered Haircuts for Women #Shorts",
  "w3-pixie": "6 Short Haircuts for Women #Shorts",
  "w4-curly": "6 Styles for Natural Curly Hair #Shorts",
  "w5-braids": "6 Protective Styles to Ask For #Shorts",
  "m1-classic": "6 Classic Mens Haircuts #Shorts",
  "m2-undercut": "6 Undercut Variations for Men #Shorts",
  "m3-business": "6 Smart Professional Mens Cuts #Shorts",
  "m4-long": "6 Long Hairstyles for Men #Shorts",
  "m5-locs": "6 Braid and Loc Styles for Men #Shorts",
};

const HASHTAGS = [
  "#hairstyles", "#haircut", "#barber", "#barbershop", "#hairstylist", "#salon",
  "#hairinspo", "#newhair", "#hairgoals", "#fresh", "#shearquery",
];

function caption(cfg) {
  const list = cfg.n.map((s, i) => `${i + 1}. ${s}`).join("\n");
  return [
    cfg.h,
    "",
    list,
    "",
    "Comment the number you want and I'll ask which city you're in, then send you shops near you that actually do it.",
    "",
    "We track 8,800+ barbershops, salons and stylists, so it's a real shop with real reviews - not a guess.",
    "", ".", ".", ".", "",
    HASHTAGS.join(" "),
  ].join("\n");
}

(async () => {
  const { data: tail } = await admin.from("publisher_queue")
    .select("position").order("position", { ascending: false }).limit(1);
  let pos = tail?.[0]?.position || 0;

  for (const c of CFG) {
    const local = `experiments/hairstyle-reels-v2/${c.k}.mp4`;
    if (!fs.existsSync(local)) { console.log(`  SKIP ${c.k} - not rendered`); continue; }

    const vidPath = `instagram/reel-${c.k}.mp4`;
    const up = await admin.storage.from("entity-photos")
      .upload(vidPath, fs.readFileSync(local), { contentType: "video/mp4", upsert: true });
    if (up.error) { console.log(`  ERR upload ${c.k}: ${up.error.message}`); continue; }

    pos += 1;
    const { error } = await admin.from("publisher_queue").upsert({
      item_key: `hairstyles-${c.k}`,
      title: TITLES[c.k],
      stat: null,
      label: c.h,
      question: "Comment the number you want and I will send you shops near you that do it.",
      video_url: BASE + vidPath,
      thumbnail_url: `${BASE}instagram/cover-${c.k}.jpg`,
      duration_secs: 9,
      caption: caption(c),
      position: pos,
      status: "queued",
    }, { onConflict: "item_key" });
    console.log(error ? `  ERR row ${c.k}: ${error.message}` : `  pos ${pos}  hairstyles-${c.k}`);
  }
})();
