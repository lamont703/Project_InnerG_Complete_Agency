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
/** queue_entity_cards.js has always rendered these at 9s. Matching it. */
const DATA_SECONDS = 9;
/**
 * A news short runs about a minute and a half — long-form by this channel's
 * standards, because the format is a headline plus a real argument about it.
 */
const NEWS_SECONDS = 90;
/**
 * ONLY THE AVATAR SEGMENTS ARE BOUGHT, which is the whole point of the format.
 * The rest is the same one narration over the headline and b-roll, and costs
 * nothing. Measured on astra-critical-cyber: 34s of avatar across four segments
 * inside a 87.5s finished cut — $1.31 where a continuous take would have been
 * $3.38.
 */
const NEWS_AVATAR_SECONDS = 34;

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
 * @property {"grid"|"data"|"avatar"|"news"} id
 * @property {string} label     Shown under the Render button.
 * @property {number} costUsd   0 for grid. Estimate for avatar.
 * @property {string} costLabel Rendered as-is by the UI.
 * @property {number} seconds
 * @property {string} why       One line, why this card gets this renderer.
 */

/** @type {Record<"grid"|"data"|"avatar"|"news", VideoType>} */
const VIDEO_TYPES = {
  grid: {
    id: "grid",
    label: "Hairstyle grid",
    costUsd: 0,
    costLabel: "free",
    seconds: GRID_SECONDS,
    why: "a numbered title is a list of things to look at, and the grid shows them",
  },
  data: {
    id: "data",
    label: "Data reel",
    costUsd: 0,
    costLabel: "free",
    seconds: DATA_SECONDS,
    why: "a figure from our own data, animated — the number IS the content",
  },
  news: {
    id: "news",
    label: "AI news short",
    costUsd: Number((NEWS_AVATAR_SECONDS * AVATAR_PER_SEC).toFixed(2)),
    costLabel: `~$${(NEWS_AVATAR_SECONDS * AVATAR_PER_SEC).toFixed(2)}`,
    seconds: NEWS_SECONDS,
    why: "a headline worth reacting to, where the avatar is bought only for the beats that need a face",
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
 * The renderer this card gets. Total — every card resolves to exactly one.
 *
 * STATED INTENT WINS, AND THAT IS THE POINT OF THE video_type COLUMN. Deriving
 * the format from the title made the research agent choose a renderer and a
 * price by accident: it wrote a headline, and the shape of that headline
 * silently decided between a free card and a $1.16 avatar. Worse, it decided
 * WRONG for a whole category — every data reel in the queue carries a figure
 * like "130,165" or "47,674", which is not a small leading count, so all six of
 * them derived to `avatar`. Clicking Render on one would have bought a talking
 * head instead of the animated card it was written to be.
 *
 * THE DERIVED RULES REMAIN, as a fallback for rows written before the column
 * existed, in this order:
 *
 *   `stat` present   -> data.  The data reels are the only cards that carry a
 *                       figure in its own column; queue_entity_cards.js has
 *                       always populated it, so it is a reliable marker.
 *   "N things", 2-12 -> grid.  The retention evidence behind that window is in
 *                       isListicleTitle below.
 *   otherwise        -> avatar.
 *
 * `news` IS NEVER DERIVED — only stated. There is no headline shape that means
 * "this is a news short": the format is a decision about a story that broke,
 * not a property of the words. It also does not render from a queue card at
 * all (scripts/render_news_short.js takes a hand-written script JSON), so
 * deriving it would put a Render button in front of a pipeline that cannot be
 * reached from the board.
 *
 * An unrecognised stored value is IGNORED rather than trusted, and the card
 * falls through to the derivation — a typo in a column must not route a render
 * to a pipeline that does not exist.
 *
 * @param {{ title?: string|null, video_type?: string|null, videoType?: string|null,
 *           stat?: string|number|null }} card
 * @returns {VideoType}
 */
function videoTypeFor(card) {
  const c = card || {};
  const stated = c.video_type ?? c.videoType;
  if (stated && VIDEO_TYPES[stated]) return VIDEO_TYPES[stated];

  if (c.stat !== undefined && c.stat !== null && String(c.stat).trim() !== "") return VIDEO_TYPES.data;
  return isListicleTitle(c.title) ? VIDEO_TYPES.grid : VIDEO_TYPES.avatar;
}

/** Every format that exists. The board prices from this; it is the registry. */
const VIDEO_TYPE_IDS = Object.keys(VIDEO_TYPES);

/**
 * The formats the research agent may choose between — the ones that can
 * actually be rendered FROM A QUEUE CARD.
 *
 * NOT THE SAME LIST AS THE REGISTRY, and that gap is the point. `news` is a
 * real format the board must be able to price, but it renders from a
 * hand-written script JSON (segments, which are avatar, the b-roll queries) —
 * none of which exists on a card. An agent allowed to pick it would produce a
 * queued idea that no button can render, which reads as a bug in the queue
 * rather than as a format that was never card-renderable.
 *
 * Move an id in here when its pipeline can start from a card, not before.
 */
const AGENT_VIDEO_TYPE_IDS = VIDEO_TYPE_IDS.filter((id) => id !== "news");

module.exports = {
  AVATAR_PER_SEC,
  AVATAR_SECONDS,
  GRID_SECONDS,
  DATA_SECONDS,
  NEWS_SECONDS,
  NEWS_AVATAR_SECONDS,
  VIDEO_TYPE_IDS,
  AGENT_VIDEO_TYPE_IDS,
  SEED_GRID,
  VIDEO_TYPES,
  isListicleTitle,
  videoTypeFor,
};
