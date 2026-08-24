require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BASE = "https://senkwhdxgtypcrtoggyf.supabase.co/storage/v1/object/public/entity-photos/";
const CFG = JSON.parse(fs.readFileSync("scripts/instagram/hairstyle-batch/concepts-v4-ready.json", "utf8"));
const TITLES = {
  "w-african-braids": "6 Braided Styles to Ask For #Shorts",
  "w-african-natural": "6 Natural Hair Styles #Shorts",
  "w-locs": "6 Loc Styles for Women #Shorts",
};
const HASHTAGS = ["#hairstyles","#braids","#naturalhair","#locs","#protectivestyles","#hairstylist",
                  "#salon","#hairinspo","#braider","#loctician","#shearquery"];
const caption = (c) => [
  c.h, "", c.n.map((s, i) => `${i + 1}. ${s}`).join("\n"), "",
  "Comment the number you want and I'll ask which city you're in, then send you shops near you that actually do it.", "",
  "We track 8,800+ barbershops, salons and stylists, so it's a real shop with real reviews - not a guess.",
  "", ".", ".", ".", "", HASHTAGS.join(" "),
].join("\n");
(async () => {
  const { data: tail } = await admin.from("publisher_queue").select("position").order("position", { ascending: false }).limit(1);
  let pos = tail?.[0]?.position || 0;
  for (const c of CFG) {
    const local = `experiments/hairstyle-reels-v3/${c.k}.mp4`;
    if (!fs.existsSync(local)) { console.log(`SKIP ${c.k}`); continue; }
    const vid = `instagram/reel-${c.k}.mp4`;
    const up = await admin.storage.from("entity-photos").upload(vid, fs.readFileSync(local), { contentType: "video/mp4", upsert: true });
    if (up.error) { console.log(`ERR ${c.k}: ${up.error.message}`); continue; }
    const cov = `instagram/cover-${c.k}.jpg`;
    await admin.storage.from("entity-photos").upload(cov, fs.readFileSync(`experiments/hairstyle-covers-v3/${c.k}.jpg`), { contentType: "image/jpeg", upsert: true });
    pos += 1;
    const { error } = await admin.from("publisher_queue").upsert({
      item_key: `hairstyles-${c.k}`, title: TITLES[c.k], stat: null, label: c.h,
      question: "Comment the number you want and I will send you shops near you that do it.",
      video_url: BASE + vid, thumbnail_url: BASE + cov,
      duration_secs: 9, caption: caption(c), position: pos, status: "queued",
    }, { onConflict: "item_key" });
    console.log(error ? `ERR row ${c.k}: ${error.message}` : `pos ${pos}  hairstyles-${c.k}`);
  }
})();
