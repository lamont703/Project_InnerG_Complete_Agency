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
 * Pick the clip. RELEVANCE FIRST, resolution only to break ties.
 *
 * THE VERSION THIS REPLACES RANKED BY HEIGHT ALONE, and it produced exactly what
 * that asks for. Searching "barbershop" returned an AI-generated monkey in a
 * fedora cutting a panda's hair; "receipts" returned a blurry phone home screen;
 * "bank loan" returned gold bars falling through black. Every one of them was
 * the tallest result. The search had already ordered the hits sensibly and the
 * picker threw that ordering away, so it was not ignoring relevance — it was
 * selecting against it, because slop is disproportionately uploaded at 4K.
 *
 * SO TAGS DECIDE. A hit whose tags contain the words asked for is about the
 * thing asked for; a 2160p clip that shares no vocabulary with the query is a
 * coincidence. Height still matters — the output is 9:16, and a 1920x1080
 * source contributes only 607 usable pixels across — but it is the tiebreak,
 * never the reason.
 *
 * AND IT REFUSES RATHER THAN SETTLES. If nothing shares a word with the query,
 * that is a bad query, and returning the least-bad option is how a monkey ends
 * up in a video about booth rent.
 */
function pickBest(hits, opts = {}) {
  const need = opts.seconds ?? 3;
  const want = String(opts.query ?? "")
    .toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);

  const scored = [];
  (hits ?? []).forEach((h, position) => {
    if ((h.duration ?? 0) < need + 0.5) return;
    const sizes = Object.values(h.videos ?? {}).filter((v) => v && v.url);
    const file = sizes.sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0];
    if (!file) return;

    const tags = String(h.tags ?? "").toLowerCase();
    const matched = want.filter((w) => tags.includes(w)).length;
    if (want.length && matched === 0) return;            // shares no vocabulary: not this

    scored.push({
      hit: h, file, matched,
      // Every term present beats a partial match, whatever the resolution.
      score: (matched / Math.max(1, want.length)) * 1000
        // The API already ranked these; a later result is a weaker match.
        - position * 5
        // 1080 lines is the bar for a 9:16 crop. Above that, diminishing.
        + Math.min(file.height ?? 0, 2160) / 100,
    });
  });

  scored.sort((a, b) => b.score - a.score);
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
