/* Upload the v7 Reels and queue them. Upserts on item_key, so a re-run after a
   partial failure repairs the rows rather than duplicating them.

   TITLES NAME THE TECHNIQUE OR THE AUDIENCE, NEVER THE REQUEST. Measured on
   this channel's own output: "6 Clipper Hair Designs" runs 54.8 views/day and
   is the best Lookbook so far, while "6 Hair Designs to Ask Your Barber For" —
   nearly the same subject, framed as a request — runs 7.5, and "6 Protective
   Styles to Ask For" runs 7.0. Both bottom-tier. So no "to Ask For" here.

   video_type is stated rather than derived. All four are lookbooks, and every
   title opens with a small count so the derivation would agree — but stating it
   is what stops a retitle from silently rerouting the card at a renderer that
   would charge for a talking head. */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BASE = "https://senkwhdxgtypcrtoggyf.supabase.co/storage/v1/object/public/entity-photos/";
const CFG = JSON.parse(fs.readFileSync("scripts/instagram/hairstyle-batch/concepts-v7-ready.json", "utf8"));

const TITLES = {
  "m-buzz": "6 Buzz Cut Variations #Shorts",
  "m-hawk": "6 Mohawk and Frohawk Styles for Men #Shorts",
  "w-shag": "6 Shag and Wolf Cut Variations #Shorts",
  "w-ponytail": "6 Ponytail Styles for Women #Shorts",
};
/* Per concept, not one shared list: two of these are men's barbering and two
   are women's salon work, and a single list would reach neither. */
const HASHTAGS = {
  "m-buzz": ["#buzzcut","#crewcut","#highandtight","#menshair","#barber","#barbershop","#barberlife","#clippercut","#mensgrooming","#shearquery"],
  "m-hawk": ["#mohawk","#frohawk","#fauxhawk","#burstfade","#menshair","#barber","#barbershop","#barberlife","#hairstylesformen","#shearquery"],
  "w-shag": ["#shag","#wolfcut","#shaghaircut","#layers","#haircut","#hairstylist","#salon","#hairinspo","#curlyshag","#shearquery"],
  "w-ponytail": ["#ponytail","#sleekponytail","#bubbleponytail","#braidedponytail","#hairstylist","#salon","#hairinspo","#updo","#protectivestyles","#shearquery"],
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
    const local = `experiments/hairstyle-reels-v7/${c.k}.mp4`;
    const localCover = `experiments/hairstyle-covers-v7/${c.k}.jpg`;
    if (!fs.existsSync(local) || !fs.existsSync(localCover)) { console.log(`SKIP ${c.k} (not rendered)`); continue; }
    const vid = `instagram/reel-${c.k}.mp4`;
    const up = await admin.storage.from("entity-photos").upload(vid, fs.readFileSync(local), { contentType: "video/mp4", upsert: true });
    if (up.error) { console.log(`ERR ${c.k}: ${up.error.message}`); continue; }
    const cov = `instagram/cover-${c.k}.jpg`;
    const upc = await admin.storage.from("entity-photos").upload(cov, fs.readFileSync(localCover), { contentType: "image/jpeg", upsert: true });
    if (upc.error) { console.log(`ERR cover ${c.k}: ${upc.error.message}`); continue; }
    pos += 1;
    const { error } = await admin.from("publisher_queue").upsert({
      item_key: `hairstyles-${c.k}`, title: TITLES[c.k], video_type: "lookbook",
      stat: null, label: c.h,
      question: "Comment the number you want and I will send you shops near you that do it.",
      video_url: BASE + vid, thumbnail_url: BASE + cov,
      duration_secs: 9, caption: caption(c), position: pos, status: "queued",
    }, { onConflict: "item_key" });
    console.log(error ? `ERR row ${c.k}: ${error.message}` : `pos ${pos}  hairstyles-${c.k}  ${TITLES[c.k]}`);
  }
})();
