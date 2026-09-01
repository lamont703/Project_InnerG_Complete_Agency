#!/usr/bin/env node
/**
 * Render the slide deck as 1920x1080 PNGs.
 *
 * SVG THEN SCREENSHOT, rather than a slide tool or a canvas library. The deck
 * has to match the Search Console chart that sits inside it, and that chart is
 * hand-built SVG — one renderer means one set of colours, one type scale, and
 * no seam where the real data meets the made slides.
 *
 * Free and repeatable, unlike everything HeyGen produces. Re-run it as often as
 * the wording changes; nothing here costs anything.
 */
const fs = require("fs");
const path = require("path");

const DIR = path.join("reference", "heygen", "gbp-vs-social", "slides");
const W = 1920, H = 1080;
const BG = "#0b1220", FG = "#f8fafc", MUTE = "#94a3b8", ACC = "#38bdf8", WARN = "#f43f5e";
const FONT = "Helvetica Neue,Helvetica,Arial,sans-serif";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const t = (x, y, s, { size = 44, fill = FG, weight = 400, anchor = "start" } = {}) =>
  `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" font-family="${FONT}">${esc(s)}</text>`;

function slide(name, inner) {
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="${BG}"/>${inner}</svg>`;
  fs.writeFileSync(path.join(DIR, `${name}.svg`), svg);
  return name;
}

fs.mkdirSync(DIR, { recursive: true });
const made = [];

// --- s2 ---------------------------------------------------------------------
made.push(slide("01-reach-intent", [
  t(160, 170, "Two different jobs", { size: 68, weight: 800 }),
  `<line x1="960" y1="260" x2="960" y2="900" stroke="#1e293b" stroke-width="3"/>`,
  t(160, 380, "SOCIAL", { size: 34, fill: ACC, weight: 800 }),
  t(160, 470, "Reach", { size: 92, weight: 800 }),
  t(160, 560, "Puts your work in front of", { size: 40, fill: MUTE }),
  t(160, 615, "people who weren't looking", { size: 40, fill: MUTE }),
  t(160, 670, "for you.", { size: 40, fill: MUTE }),
  t(1040, 380, "SEARCH", { size: 34, fill: WARN, weight: 800 }),
  t(1040, 470, "Intent", { size: 92, weight: 800 }),
  t(1040, 560, "Catches someone who has", { size: 40, fill: MUTE }),
  t(1040, 615, "already decided they need", { size: 40, fill: MUTE }),
  t(1040, 670, "a chair. Today.", { size: 40, fill: MUTE }),
].join("")));

made.push(slide("02-fills-chair", [
  t(960, 480, "Reach fills your feed.", { size: 86, weight: 800, anchor: "middle", fill: MUTE }),
  t(960, 620, "Intent fills your chair.", { size: 100, weight: 800, anchor: "middle", fill: FG }),
  `<rect x="660" y="670" width="600" height="6" fill="${ACC}"/>`,
].join("")));

made.push(slide("03-search-name", [
  t(160, 300, "They leave your page.", { size: 72, weight: 700, fill: MUTE }),
  t(160, 430, "They search your shop name.", { size: 72, weight: 700, fill: MUTE }),
  t(160, 600, "What they find", { size: 88, weight: 800 }),
  t(160, 710, "isn't yours.", { size: 88, weight: 800, fill: WARN }),
  t(160, 850, "It's whatever Google decided to show them.", { size: 42, fill: MUTE }),
].join("")));

// --- s3 ---------------------------------------------------------------------
made.push(slide("04-they-ask", [
  t(160, 220, "People don't only search anymore.", { size: 62, weight: 700, fill: MUTE }),
  t(160, 340, "They ask.", { size: 110, weight: 800 }),
  t(160, 520, "“Where should I get my hair done in Sugar Land?”", { size: 46, fill: ACC }),
  t(160, 620, "“Who does good silk presses near me?”", { size: 46, fill: ACC }),
  t(160, 720, "“Which barber in Houston is good with kids?”", { size: 46, fill: ACC }),
].join("")));

const crawlers = [
  ["OpenAI", "GPTBot  ·  OAI-SearchBot"],
  ["Anthropic", "ClaudeBot  ·  Claude-SearchBot"],
  ["Perplexity", "PerplexityBot"],
  ["Google", "Google-Extended"],
];
made.push(slide("05-crawlers", [
  t(160, 160, "These are documented. By name.", { size: 62, weight: 800 }),
  t(160, 225, "Each one published by the company that operates it.", { size: 36, fill: MUTE }),
  ...crawlers.map(([co, bots], i) => {
    const y = 400 + i * 140;
    return `<line x1="160" y1="${y + 42}" x2="1760" y2="${y + 42}" stroke="#1e293b" stroke-width="2"/>` +
      t(160, y, co, { size: 48, weight: 700 }) +
      t(1760, y, bots, { size: 44, fill: ACC, anchor: "end" });
  }),
].join("")));

made.push(slide("06-no-page", [
  t(960, 250, "They all read web pages.", { size: 66, weight: 700, fill: MUTE, anchor: "middle" }),
  t(960, 470, "No website.", { size: 104, weight: 800, anchor: "middle" }),
  t(960, 600, "No page to read.", { size: 104, weight: 800, anchor: "middle", fill: WARN }),
  t(960, 790, "You're not lower in the answer.", { size: 48, fill: MUTE, anchor: "middle" }),
  t(960, 860, "You're not in the answer at all.", { size: 48, fill: FG, anchor: "middle" }),
].join("")));

// --- s4a --------------------------------------------------------------------
made.push(slide("07-rented", [
  t(160, 210, "You are renting.", { size: 96, weight: 800 }),
  ...[["Your following", "belongs to the platform"],
      ["Your Business Profile", "belongs to Google"],
      ["Your videos", "belong to whoever hosts them"]].map(([a, b], i) => {
    const y = 430 + i * 150;
    return t(160, y, a, { size: 52, weight: 700 }) + t(1760, y, b, { size: 46, fill: MUTE, anchor: "end" });
  }),
  t(160, 940, "None of that is a conspiracy. It's the deal you signed.", { size: 42, fill: MUTE }),
].join("")));


// --- landscape panels that sit BESIDE the portrait avatar ---------------------
/*
 * The avatar look is preferred_orientation: portrait. Asking the API for 16:9
 * does not reframe it — HeyGen pillarboxes the portrait render inside a
 * landscape canvas with wide white bars. On a YouTube video that reads as a
 * mistake.
 *
 * So the talking-head segments get a designed left panel and the avatar is
 * cropped out of its padding and seated on the right. The constraint becomes a
 * two-column layout instead of an artefact.
 */
const PANEL_W = 1310;   // avatar occupies the remaining 610px on the right
made.push(slide("panel-s1", [
  t(110, 250, "The numbers", { size: 40, fill: ACC, weight: 800 }),
  t(110, 420, "59%", { size: 150, weight: 800 }),
  t(110, 490, "of barbershops have no website", { size: 44, fill: MUTE }),
  t(110, 680, "70%", { size: 150, weight: 800 }),
  t(110, 750, "of salons don't have one either", { size: 44, fill: MUTE }),
  t(110, 900, "5,213 shops and salons  ·  ShearQuery data", { size: 32, fill: "#475569" }),
].join("")));

made.push(slide("panel-s5", [
  t(110, 260, "This week", { size: 40, fill: ACC, weight: 800 }),
  t(110, 420, "Search your", { size: 92, weight: 800 }),
  t(110, 530, "shop's name.", { size: 92, weight: 800 }),
  t(110, 690, "Not your handle.", { size: 46, fill: MUTE }),
  t(110, 760, "Look at what comes back.", { size: 46, fill: MUTE }),
  `<rect x="110" y="830" width="420" height="5" fill="${ACC}"/>`,
  t(110, 930, "ShearQuery", { size: 38, fill: FG, weight: 700 }),
].join("")));

console.log(made.join("\n"));
