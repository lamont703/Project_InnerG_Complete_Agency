#!/usr/bin/env node
/**
 * Pull a few images off @shearquery to test depth parallax against.
 *
 * EXPERIMENT ONLY. Nothing here is imported by the app, and the whole
 * experiments/depth-parallax directory is meant to be deletable without
 * touching anything in production.
 *
 * media_url is a signed CDN link that expires, so the file is downloaded now
 * and the URL is never stored.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const OUT = path.join(__dirname, "images");
const N = Number((process.argv.find((a) => a.startsWith("--n=")) || "").split("=")[1]) || 4;

(async () => {
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: c } = await a.from("instagram_connection").select("*").eq("id", 1).maybeSingle();

  const res = await fetch(
    `https://graph.instagram.com/me/media?fields=id,media_type,media_url,caption,like_count,timestamp&limit=60&access_token=${c.access_token}`
  );
  const j = await res.json();
  // Stills only, best-engaged first — depth parallax needs foreground/background
  // separation to show anything, and a well-liked photo usually has a subject.
  const imgs = (j.data || [])
    .filter((m) => m.media_type === "IMAGE" && m.media_url)
    .sort((x, y) => (y.like_count || 0) - (x.like_count || 0))
    .slice(0, N);

  fs.mkdirSync(OUT, { recursive: true });
  for (const [i, m] of imgs.entries()) {
    const r = await fetch(m.media_url);
    const buf = Buffer.from(await r.arrayBuffer());
    const name = `${String(i + 1).padStart(2, "0")}-${m.id}.jpg`;
    fs.writeFileSync(path.join(OUT, name), buf);
    console.log(`  ${name}  ${Math.round(buf.length / 1024)}KB  ${m.like_count || 0} likes  ${String(m.caption || "").replace(/\n/g, " ").slice(0, 46)}`);
  }
  console.log(`\n${imgs.length} images in ${OUT}`);
})();
