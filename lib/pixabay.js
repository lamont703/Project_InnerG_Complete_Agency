/**
 * Pixabay video search, for b-roll. Free, keyed, and with terms worth obeying.
 *
 * THREE RULES FROM THEIR OWN DOCUMENTATION, all of them load-bearing:
 *
 *  1. "permanent hotlinking of images (using Pixabay URLs in your app) is not
 *     allowed... please download them to your server first." So this downloads.
 *  2. "requests must be cached for 24 hours". So searches are cached to disk,
 *     which also makes a re-run of the pipeline free and repeatable.
 *  3. Rate limit is 100 requests per 60 seconds against the KEY, not the IP.
 *
 * THE LICENCE IS PERMISSIVE BUT NOT UNLIMITED. The Pixabay Content License
 * allows commercial use and does not require attribution, but it forbids
 * selling content on a standalone basis and forbids commercial use of content
 * showing recognisable trademarks. It also says only the full licence binds.
 * That is why every clip used gets written into a manifest: attribution is not
 * required, but PROVENANCE is the only thing that lets a claim be answered
 * later, and a clip you cannot trace is a clip you cannot defend.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CACHE = path.join(".cache", "broll");
const CACHE_MS = 24 * 60 * 60 * 1000;   // their 24h requirement, not a preference

function cachePath(kind, key) {
  const h = crypto.createHash("sha1").update(key).digest("hex").slice(0, 16);
  return path.join(CACHE, `${kind}-${h}.json`);
}

/** @returns {Promise<any[]>} raw hits */
async function searchVideos(query, opts = {}) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) throw new Error("PIXABAY_API_KEY is not set");

  const params = new URLSearchParams({
    key,
    q: query,
    per_page: String(opts.perPage ?? 20),
    safesearch: "true",
    order: opts.order ?? "popular",
  });
  if (opts.videoType) params.set("video_type", opts.videoType);

  const cp = cachePath("search", params.toString().replace(key, ""));
  if (fs.existsSync(cp) && Date.now() - fs.statSync(cp).mtimeMs < CACHE_MS) {
    return JSON.parse(fs.readFileSync(cp, "utf8"));
  }

  const res = await fetch(`https://pixabay.com/api/videos/?${params}`);
  if (!res.ok) throw new Error(`pixabay ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const hits = (await res.json()).hits ?? [];
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(cp, JSON.stringify(hits));
  return hits;
}

/**
 * Pick the clip most likely to survive being cropped to 9:16.
 *
 * HEIGHT IS THE CONSTRAINT, NOT WIDTH. The output is 1080x1920 and a landscape
 * source gets cropped to a narrow vertical slice, so a 1920x1080 clip
 * contributes only 607 usable pixels across and is upscaled 1.78x. Preferring
 * the tallest available source is the difference between soft and unusable.
 *
 * LONG ENOUGH TO COVER THE CUTAWAY, with a little to spare — a clip shorter
 * than the window freezes on its last frame, which looks like a broken render.
 */
function pickBest(hits, opts = {}) {
  const need = opts.seconds ?? 3;
  const scored = (hits ?? [])
    .filter((h) => (h.duration ?? 0) >= need + 0.5)
    .map((h) => {
      const sizes = Object.values(h.videos ?? {}).filter((v) => v && v.url);
      const best = sizes.sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0];
      return best ? { hit: h, file: best } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (b.file.height ?? 0) - (a.file.height ?? 0));
  return scored[0] ?? null;
}

/** Download once, keyed by the pixabay id and size, and reuse thereafter. */
async function download(pick, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `pixabay-${pick.hit.id}-${pick.file.height}p.mp4`);
  if (!fs.existsSync(out)) {
    const r = await fetch(pick.file.url);
    if (!r.ok) throw new Error(`download ${r.status}`);
    fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  }
  return {
    path: out,
    /*
     * The manifest row. Attribution is not required by the licence, but this is
     * what makes a clip traceable months later — which is the only way to
     * answer a claim or prove where something came from.
     */
    credit: {
      id: pick.hit.id,
      source: "Pixabay",
      license: "Pixabay Content License",
      licenseUrl: "https://pixabay.com/service/license-summary/",
      author: pick.hit.user,
      pageUrl: pick.hit.pageURL,
      resolution: `${pick.file.width}x${pick.file.height}`,
      durationSecs: pick.hit.duration,
    },
  };
}

module.exports = { searchVideos, pickBest, download, CACHE };
