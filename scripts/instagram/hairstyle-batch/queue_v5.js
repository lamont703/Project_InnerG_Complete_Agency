/* Upload the v5 Reels and queue them. Upserts on item_key, so a re-run after a
   partial failure repairs the rows rather than duplicating them.

   HASHTAGS ARE PER CONCEPT here, unlike v4's single shared list. Two of these
   three are facial hair and the third is colour work; one list covering both
   would reach neither audience. */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BASE = "https://senkwhdxgtypcrtoggyf.supabase.co/storage/v1/object/public/entity-photos/";
const CFG = JSON.parse(fs.readFileSync("scripts/instagram/hairstyle-batch/concepts-v5-ready.json", "utf8"));
const TITLES = {
  "b-shapes": "6 Beard Shapes, Explained #Shorts",
  "b-mustache": "6 Mustache Styles to Ask For #Shorts",
  "w-color": "6 Ways to Place Hair Color #Shorts",
};
const HASHTAGS = {
  "b-shapes": ["#beard","#beardstyles","#beardgang","#beardtrim","#barber","#barbershop","#barberlife","#menshair","#beardcare","#shearquery"],
  "b-mustache": ["#mustache","#moustache","#mustachestyles","#barber","#barbershop","#barberlife","#menshair","#beardgang","#straightrazor","#shearquery"],
  "w-color": ["#haircolor","#balayage","#ombre","#moneypiece","#highlights","#colorist","#hairstylist","#salon","#hairinspo","#shearquery"],
};
const caption = (c) => [
  c.h, "", c.n.map((s, i) => `${i + 1}. ${s}`).join("\n"), "",
  "Comment the number you want and I'll ask which city you're in, then send you shops near you that actually do it.", "",
  "We track 8,800+ barbershops, salons and stylists, so it's a real shop with real reviews - not a guess.",
  "", ".", ".", ".", "", HASHTAGS[c.k].join(" "),
].join("\n");
(async () => {
  const { data: tail } = await admin.from("publisher_queue").select("position").order("position", { ascending: false }).limit(1);
  let pos = tail?.[0]?.position || 0;
  for (const c of CFG) {
    const local = `experiments/hairstyle-reels-v5/${c.k}.mp4`;
    const localCover = `experiments/hairstyle-covers-v5/${c.k}.jpg`;
    if (!fs.existsSync(local) || !fs.existsSync(localCover)) { console.log(`SKIP ${c.k} (not rendered)`); continue; }
    const vid = `instagram/reel-${c.k}.mp4`;
    const up = await admin.storage.from("entity-photos").upload(vid, fs.readFileSync(local), { contentType: "video/mp4", upsert: true });
    if (up.error) { console.log(`ERR ${c.k}: ${up.error.message}`); continue; }
    const cov = `instagram/cover-${c.k}.jpg`;
    const upc = await admin.storage.from("entity-photos").upload(cov, fs.readFileSync(localCover), { contentType: "image/jpeg", upsert: true });
    if (upc.error) { console.log(`ERR cover ${c.k}: ${upc.error.message}`); continue; }
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
