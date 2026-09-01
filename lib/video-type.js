/**
 * WHICH VIDEO A QUEUED CARD BECOMES, and what it costs. One decision, one file.
 *
 * WHY THIS IS PLAIN JAVASCRIPT IN A TYPESCRIPT REPO. Two callers have to agree
 * and they cannot share a language: the publisher board is a React client
 * component, and scripts/render_queued.js is a CommonJS Node script that cannot
 * import TypeScript. A `.js` module with JSDoc types is the only thing both can
 * read — Next bundles it through `allowJs`, Node requires it directly.
 *
 * THE DISAGREEMENT THIS EXISTS TO PREVENT. The board now prints the video type
 * and its price under the Render button, so the operator can see what a click
 * is about to buy. If the label and the renderer computed that answer
 * separately, they could drift, and the failure would be a card labelled "free"
 * that quietly charges $1.16 — worse than no label at all, because a wrong
 * price is trusted. So neither side decides anything: both call videoTypeFor().
 *
 * ROUTING IS THE TITLE, NOT THE DISK. It used to be the presence of
 * experiments/grids/<item_key>.jpg, which made the type invisible to the UI
 * (a hosted page cannot stat a local file) and unknowable until render time.
 * It also made a MISSING FILE mean "make the avatar instead", which is a
 * fallback wearing a routing decision's clothes.
 */

/** HeyGen avatar video, per second of finished footage. Measured on invoices. */
const AVATAR_PER_SEC = 0.0386;
/** What writeScript() targets, so the estimate matches the words it writes. */
const AVATAR_SECONDS = 30;
/** Fixed by the audio bed the template cuts to. Not a preference. */
const GRID_SECONDS = 9;

/**
 * THE ONE SEED GRID, used by every hairstyle render.
 *
 * It used to be a per-card drop folder: put <item_key>.jpg in experiments/grids/
 * or the card could not render. Nobody ever filled it — the folder is empty —
 * so every listicle sat blocked while the only format proven to work on this
 * channel was unreachable. One committed seed makes the grid path always
 * available, which is what turns "no fallback" from a refusal into a real route.
 *
 * IT IS ALSO reel_hairstyles.js's OWN DEFAULT --in, so the two cannot disagree
 * about which picture the pipeline uses.
 *
 * THE SHAPE IS NOT NEGOTIABLE: a 3:4 portrait six-up, two columns by three rows.
 * reel_hairstyles.html pans to fixed normalised points — x 0.27/0.73, y
 * 0.155/0.495/0.840 — so a grid laid out any other way lands the camera between
 * two heads. Replacing the seed means matching that layout, not just the size.
 */
const SEED_GRID = "scripts/instagram/source.jpg";

/**
 * Is this title a listicle — "N somethings", 2 through 12?
 *
 * Measured across the channel's own 2026 output: listicles hold 154.6%
 * retention against 90.6% for everything else. The upper bound is what stops
 * "569 Texas Barbershops Have a Perfect 5.0" (123 views) from counting — that
 * is a statistic, not a count of things the viewer is about to be shown.
 *
 * @param {string} title
 * @returns {boolean}
 */
function isListicleTitle(title) {
  const m = String(title ?? "").trim().match(/^(\d{1,2})\s+\S/);
  if (!m) return false;
  const n = Number(m[1]);
  return n >= 2 && n <= 12;
}

/**
 * @typedef {Object} VideoType
 * @property {"grid"|"avatar"} id
 * @property {string} label     Shown under the Render button.
 * @property {number} costUsd   0 for grid. Estimate for avatar.
 * @property {string} costLabel Rendered as-is by the UI.
 * @property {number} seconds
 * @property {string} why       One line, why this card gets this renderer.
 */

/** @type {Record<"grid"|"avatar", VideoType>} */
const VIDEO_TYPES = {
  grid: {
    id: "grid",
    label: "Hairstyle grid",
    costUsd: 0,
    costLabel: "free",
    seconds: GRID_SECONDS,
    why: "a numbered title is a list of things to look at, and the grid shows them",
  },
  avatar: {
    id: "avatar",
    label: "AI avatar",
    costUsd: Number((AVATAR_SECONDS * AVATAR_PER_SEC).toFixed(2)),
    costLabel: `~$${(AVATAR_SECONDS * AVATAR_PER_SEC).toFixed(2)}`,
    seconds: AVATAR_SECONDS,
    why: "an arbitrary topic can only be delivered by the renderer that can say anything",
  },
};

/**
 * The renderer this card gets. Total — every card resolves to exactly one, and
 * there is no third answer and no "it depends what is on disk".
 *
 * @param {{ title?: string | null }} card
 * @returns {VideoType}
 */
function videoTypeFor(card) {
  return isListicleTitle(card && card.title) ? VIDEO_TYPES.grid : VIDEO_TYPES.avatar;
}

module.exports = {
  AVATAR_PER_SEC,
  AVATAR_SECONDS,
  GRID_SECONDS,
  SEED_GRID,
  VIDEO_TYPES,
  isListicleTitle,
  videoTypeFor,
};
