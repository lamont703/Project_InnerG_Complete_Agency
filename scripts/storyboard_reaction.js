#!/usr/bin/env node
/**
 * STORYBOARD — see the cut without rendering it.
 *
 *   node scripts/storyboard_reaction.js
 *   open reference/reaction-one-person-ai/cut/storyboard.html
 *
 * ONE FRAME PER CLIP, WITH THE WORDS THAT PLAY UNDER IT. That pairing is the
 * whole point. Every mistake this project has actually shipped was a mismatch
 * between the two and none of them were visible in either half alone:
 *
 *   - the four-quadrant diagram arriving eight seconds after he starts naming
 *     the four kinds of work
 *   - a b-roll clip 0.6s shorter than the spec claimed, which slid every beat
 *     after it against the narration
 *   - fifty-three seconds of beat five carried by two clips
 *
 * A rendered proof shows all three too, and takes twenty seconds plus the time
 * to watch eight and a half minutes. This takes about fifteen and you read it.
 *
 * IT DRAWS THE CAPTION SAFE ZONE ON EVERY FRAME. The burned-in subtitles own
 * the bottom 180px. Four compositions had attribution lines in exactly that
 * band and the captions printed straight through them — unreadable, and
 * invisible to `hyperframes check`, to the renderer's asserts, and to every
 * frame sample that happened not to land on one. A shaded band makes it a
 * thing you notice rather than a thing you discover.
 *
 * NOTHING HERE ENCODES VIDEO. It seeks each source once for a JPEG.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, execFileSync } = require("child_process");
const FF = require("ffmpeg-static");

const ROOT = path.join("reference", "reaction-one-person-ai");
const SPEC = path.join(ROOT, "reaction.spec.json");
const NARR = path.join(ROOT, "script", "narration");
const OUT = path.join(ROOT, "cut");
const spec = JSON.parse(fs.readFileSync(SPEC, "utf8"));
const E = spec.edit;

const LONG = 12;          // a non-avatar hold this long is worth a second look
const SAFE_PX = 180;      // caption zone, bottom of a 1080-tall frame

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function words(beat) {
  const f = path.join(NARR, `${beat}.words.json`);
  if (!fs.existsSync(f)) return [];
  return (JSON.parse(fs.readFileSync(f, "utf8")).word_timestamps || [])
    .filter((w) => { const t = String(w.word ?? "").trim(); return t && t !== "<start>" && t !== "<end>"; });
}

/* ---------- walk the timeline exactly as the renderer does ---------- */
const items = [];
{
  let t = 0, prev = null;
  for (const [bi, b] of E.beats.entries()) {
    const wt = words(b.beat);
    let rel = 0;
    /* A clip carrying `moves` is several shots of one source; the storyboard
       shows each, because the point of the moves is that they are different
       pictures and a single card would hide exactly that. */
    const pieces = [];
    for (const c of b.clips) {
      if (c.moves?.length) {
        let from = c.in;
        for (const mv of c.moves) { pieces.push({ ...c, in: from, out: mv.to, shot: mv.shot, pan: mv.pan }); from = mv.to; }
      } else pieces.push(c);
    }
    for (const c of pieces) {
      const d = c.holdLast ?? (c.out - c.in);
      const said = wt.filter((w) => w.start >= rel - 0.05 && w.start < rel + d)
        .map((w) => String(w.word).trim()).join(" ");
      items.push({
        beat: b.beat, clip: c, hold: !!c.holdLast, abs: t, rel, dur: d, said,
        shot: c.shot, pan: c.pan,
        src: c.holdLast ? prev.src : c.src,
        seek: c.holdLast ? Math.max(0, prev.out - 0.1) : (c.still ? 0 : c.in + d / 2),
        still: c.holdLast ? prev.still : !!c.still,
      });
      if (!c.holdLast) prev = { src: c.src, out: c.out, still: !!c.still };
      t += d; rel += d;
    }
    if (bi < E.beats.length - 1) t += E.beatGapSec;
  }
}

/* ---------- one JPEG per clip, four at a time ---------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "storyboard-"));
const shot = (it, i) => new Promise((res) => {
  const f = path.join(tmp, `s${i}.jpg`);
  const a = it.still
    ? ["-i", path.join(ROOT, it.src)]
    : ["-ss", String(it.seek), "-i", path.join(ROOT, it.src)];
  const p = spawn(FF, ["-nostdin", "-y", "-hide_banner", "-loglevel", "error",
    ...a, "-frames:v", "1", "-vf", "scale=420:-2", "-q:v", "5", f]);
  p.on("close", () => res(fs.existsSync(f) ? f : null));
});

(async () => {
  const files = new Array(items.length);
  let n = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (n < items.length) { const i = n++; files[i] = await shot(items[i], i); process.stdout.write("."); }
  }));
  console.log("");

  const total = items.reduce((a, it) => a + it.dur, 0) + E.beatGapSec * (E.beats.length - 1);
  const longest = Math.max(...items.filter((it) => !it.src.startsWith("avatar/")).map((it) => it.dur));
  const nAvatar = items.filter((it) => it.src.startsWith("avatar/")).length;

  const kind = (it) => it.hold ? "hold"
    : it.src.startsWith("avatar/") ? "avatar"
    : it.src.startsWith("composition/") ? "graphic"
    : it.still ? "card" : "broll";

  let html = `<!doctype html><meta charset="utf-8"><title>Storyboard — ${esc(spec.title)}</title>
<style>
  :root{--bg:#12171A;--card:#1A2126;--rule:#2E393F;--ink:#E4EBEF;--soft:#AEBAC1;--faint:#7C8890;
        --amber:#E2701F;--cyan:#57B6CE;--green:#6FBF73}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 ui-sans-serif,-apple-system,Segoe UI,Roboto,sans-serif}
  header{padding:26px 30px;border-bottom:2px solid var(--ink);position:sticky;top:0;background:var(--bg);z-index:5}
  h1{margin:0 0 4px;font-size:22px;letter-spacing:-.01em}
  .sub{color:var(--faint);font-size:13px}
  .stats{display:flex;gap:26px;margin-top:14px;flex-wrap:wrap}
  .stat b{display:block;font-size:20px;font-variant-numeric:tabular-nums}
  .stat span{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint)}
  h2{margin:34px 30px 12px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--soft);
     border-bottom:1px solid var(--rule);padding-bottom:8px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;padding:0 30px}
  .c{background:var(--card);border:1px solid var(--rule);display:flex;flex-direction:column}
  .c.avatar{border-left:3px solid var(--cyan)}
  .c.graphic{border-left:3px solid var(--amber)}
  .c.broll{border-left:3px solid var(--rule)}
  .c.card,.c.hold{border-left:3px solid var(--green)}
  .shot{position:relative;background:#000;line-height:0}
  .shot img{width:100%;height:auto;display:block}
  /* the thumbnail is the source frame; this shows roughly what the shot crops to */
  .shot.punch img{transform:scale(1.18);transform-origin:50% 32%}
  .shot.close img{transform:scale(1.34);transform-origin:50% 32%}
  .shot.punch,.shot.close{overflow:hidden}
  /* the bottom 180 of 1080 belongs to the burned-in captions */
  .zone{position:absolute;left:0;right:0;bottom:0;height:16.7%;
        background:repeating-linear-gradient(45deg,rgba(226,112,31,.16) 0 7px,rgba(226,112,31,.05) 7px 14px);
        border-top:1px dashed rgba(226,112,31,.55)}
  .zone i{position:absolute;right:5px;bottom:3px;font:9px/1 ui-monospace,monospace;letter-spacing:.09em;
          color:rgba(255,255,255,.62);font-style:normal}
  .tc{position:absolute;left:0;top:0;background:rgba(0,0,0,.72);color:#fff;
      font:11px/1 ui-monospace,monospace;padding:5px 7px;letter-spacing:.04em}
  .meta{padding:10px 12px;display:flex;justify-content:space-between;gap:10px;align-items:baseline;
        border-bottom:1px solid var(--rule)}
  .name{font:11px/1.3 ui-monospace,monospace;color:var(--soft);word-break:break-all}
  .dur{font:12px/1 ui-monospace,monospace;flex:none;font-variant-numeric:tabular-nums}
  .dur.long{color:var(--amber);font-weight:700}
  .said{padding:10px 12px;font-size:12.5px;color:var(--soft);min-height:62px}
  .said.empty{color:var(--faint);font-style:italic}
  .live{font:11px/1 ui-monospace,monospace;letter-spacing:.08em;color:var(--faint);
        text-transform:uppercase;vertical-align:middle;margin-left:12px;cursor:pointer}
  .tag{font:9px/1 ui-monospace,monospace;letter-spacing:.11em;text-transform:uppercase;padding:3px 6px;
       border:1px solid var(--rule);color:var(--faint);flex:none}
</style>
<script>
  /* Regenerate the file and the page picks it up; the scroll position is kept
     in sessionStorage so a reload does not throw you back to the top, which is
     the thing that makes an auto-refreshing page unusable. */
  addEventListener("scroll", () => sessionStorage.setItem("sbY", scrollY));
  addEventListener("DOMContentLoaded", () => {
    const y = sessionStorage.getItem("sbY"); if (y) scrollTo(0, +y);
    const L = document.getElementById("live");
    if (localStorage.getItem("sbLive") === "0") L.checked = false;
    L.onchange = () => localStorage.setItem("sbLive", L.checked ? "1" : "0");
    setInterval(() => { if (L.checked) location.reload(); }, 4000);
  });
</script>
<header>
  <h1>${esc(spec.title)} <label class="live"><input type="checkbox" id="live" checked> live</label></h1>
  <div class="sub">Storyboard from <code>reaction.spec.json</code> — no render. Shaded band is the caption safe zone (bottom ${SAFE_PX}px).</div>
  <div class="stats">
    <div class="stat"><b>${mmss(total)}</b><span>runtime</span></div>
    <div class="stat"><b>${items.length}</b><span>clips</span></div>
    <div class="stat"><b>${nAvatar}</b><span>on camera</span></div>
    <div class="stat"><b>${longest.toFixed(1)}s</b><span>longest hold</span></div>
    <div class="stat"><b>${E.beats.length}</b><span>beats</span></div>
  </div>
</header>`;

  for (const b of E.beats) {
    const mine = items.filter((it) => it.beat === b.beat);
    const sum = mine.reduce((a, it) => a + it.dur, 0);
    html += `\n<h2>${b.beat} &middot; ${mine.length} clips &middot; ${sum.toFixed(1)}s${
      Math.abs(sum - b.dur) > 0.05 ? ` &middot; MISMATCH vs ${b.dur}s` : ""}</h2>\n<div class="grid">`;
    for (const it of mine) {
      const i = items.indexOf(it);
      const img = files[i] ? `data:image/jpeg;base64,${fs.readFileSync(files[i]).toString("base64")}` : "";
      const nm = it.hold ? "hold last frame" : path.basename(it.src).replace(/-\d{4,}-\d+x\d+/, "");
      html += `
  <div class="c ${kind(it)}">
    <div class="shot ${it.shot && it.shot !== "wide" ? it.shot : ""}">${img ? `<img src="${img}" alt="">` : ""}
      <div class="tc">${mmss(it.abs)}</div>
      <div class="zone"><i>CAPTIONS</i></div>
    </div>
    <div class="meta"><span class="name">${esc(nm)}</span>
      <span class="tag">${kind(it)}${it.shot && it.shot !== "wide" ? " &middot; " + esc(it.shot) + (it.pan ? "/" + esc(it.pan) : "") : ""}</span>
      <span class="dur${it.dur >= LONG && !it.src.startsWith("avatar/") ? " long" : ""}">${it.dur.toFixed(1)}s</span></div>
    <div class="said${it.said ? "" : " empty"}">${esc(it.said || "— no narration under this clip —")}</div>
  </div>`;
    }
    html += `\n</div>`;
  }

  const dest = path.join(OUT, "storyboard.html");
  fs.writeFileSync(dest, html);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`  ${dest}  ${(fs.statSync(dest).size / 1e6).toFixed(1)} MB  ${items.length} clips\n`);
})();
