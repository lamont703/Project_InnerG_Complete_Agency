/**
 * Pull social handles out of a business website's HTML.
 *
 * WHY THIS IS FUSSIER THAN IT LOOKS. A page mentioning instagram.com is not a
 * page telling you the business's handle. The same string appears in share
 * buttons, embedded posts, hashtag links, the web designer's credit in the
 * footer, a platform's own account, and the login page a plugin links to. Taking
 * the first match gives you a handle that is wrong often enough to poison the
 * whole set — and a wrong handle is worse than none, because tagging the wrong
 * account in a public post is a mistake with somebody else's name on it.
 *
 * FOUR CLASSES OF FALSE POSITIVE, all filtered here:
 *
 *   1. NOT A PROFILE — /p/, /reel/, /explore/tags/, /stories/, /accounts/login.
 *      These are posts, hashtags and platform plumbing, not accounts.
 *   2. THE PLATFORM ITSELF — instagram, facebook, meta, tiktok. Share widgets
 *      link to these constantly.
 *   3. RESERVED AND STRUCTURAL PATHS — /about, /legal, /developer, /help.
 *   4. THE AGENCY IN THE FOOTER. "Site by @somedesignstudio" is a real handle
 *      belonging to a real business — just not this one. A single page cannot
 *      tell the difference, so this is caught across rows instead: a handle that
 *      turns up on several unrelated businesses is an agency, not a client. Same
 *      shape as the shared-email rule in lib/outreach-address-quality.ts, which
 *      caught a font designer's address on three schools.
 *
 * NOTHING HERE VERIFIES THAT THE ACCOUNT EXISTS. Instagram blocks automated
 * checking, so every handle is a candidate until a human or the business itself
 * confirms it. That is why it lands in a lake with confirmed_at null rather than
 * on the entity row.
 *
 * Pure — no network, no React. Tested, because the cost of a wrong answer is
 * publicly tagging a stranger.
 */

export type Platform = "instagram" | "facebook" | "tiktok" | "youtube" | "x";

export interface FoundHandle {
  platform: Platform;
  /** Normalised: lower case, no @, no trailing slash, no query string. */
  handle: string;
  /** The href it came from, so a reviewer can see the evidence. */
  sourceUrl: string;
}

/** Paths that are platform plumbing rather than somebody's account. */
const NOT_A_PROFILE =
  /^(p|reel|reels|tv|stories|explore|accounts|direct|share|about|legal|developer|developers|help|privacy|terms|blog|business|creators|press|api|oauth|login|signup|web|graphql|hashtag|watch|events|groups|marketplace|pages|profile\.php|sharer|intent|home|feed|channel|c|user|playlist|results|embed|_u)$/i;

/** The platforms' own accounts, linked by share widgets everywhere. */
const PLATFORM_OWN =
  /^(instagram|facebook|meta|tiktok|youtube|twitter|x|instagramforbusiness|facebookapp|threads)$/i;

/**
 * The booking software's account, not the shop's.
 *
 * Almost every barbershop site embeds a "Book Now" widget, and the widget links
 * the vendor's own social account. The cross-row agency check catches these once
 * a vendor appears on three sites — but a vendor with only one or two customers
 * in our set slips through, and @thecutapp did exactly that on a real shop in
 * the first run. Tagging a booking app in a post about a barbershop is the same
 * mistake as tagging the web designer, just with better SEO.
 */
const VENDOR =
  /^(booksy|booksybiz|booksypolska|thecutapp|thecut|styleseat|vagaro|squareup|square|schedulicity|acuityscheduling|setmore|mindbody|fresha|goldiapp|shortcuts|phorest|wix|squarespace|godaddy|shopify|wordpress|yelp|linktree|linktr)$/i;

const PATTERNS: { platform: Platform; re: RegExp }[] = [
  { platform: "instagram", re: /(?:https?:)?\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]{1,30})/gi },
  { platform: "facebook", re: /(?:https?:)?\/\/(?:www\.|web\.|m\.)?facebook\.com\/([A-Za-z0-9._-]{2,60})/gi },
  { platform: "tiktok", re: /(?:https?:)?\/\/(?:www\.)?tiktok\.com\/@([A-Za-z0-9._]{1,30})/gi },
  { platform: "youtube", re: /(?:https?:)?\/\/(?:www\.)?youtube\.com\/@([A-Za-z0-9._-]{1,40})/gi },
  { platform: "x", re: /(?:https?:)?\/\/(?:www\.)?(?:twitter|x)\.com\/([A-Za-z0-9_]{1,15})/gi },
];

/** Judge one candidate handle. Exported so the tests can be specific. */
export function isPlausibleHandle(platform: Platform, raw: string): boolean {
  const h = String(raw || "").trim().replace(/^@/, "").replace(/\/+$/, "").toLowerCase();
  if (!h) return false;
  if (NOT_A_PROFILE.test(h)) return false;
  if (PLATFORM_OWN.test(h)) return false;
  if (VENDOR.test(h)) return false;
  // A handle that is only digits is almost always a Facebook numeric page id
  // scraped out of a share URL, or a truncated post id.
  if (/^\d+$/.test(h)) return false;
  // Instagram allows 1-30 of [a-z0-9._]; anything longer came from a bad match.
  if (platform === "instagram" && !/^[a-z0-9._]{1,30}$/.test(h)) return false;
  return true;
}

export function normaliseHandle(raw: string): string {
  return String(raw || "")
    .trim()
    .replace(/^@/, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

/**
 * Every plausible handle in a page, deduplicated, first occurrence winning.
 *
 * Returns all of them rather than picking one: a page can legitimately link the
 * business AND its owner's personal account, and choosing between those is a
 * judgement a reviewer should make with both in front of them.
 */
export function extractHandles(html: string, sourceUrl: string): FoundHandle[] {
  const out = new Map<string, FoundHandle>();
  for (const { platform, re } of PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(String(html || ""))) !== null) {
      const handle = normaliseHandle(m[1]);
      if (!isPlausibleHandle(platform, handle)) continue;
      const key = `${platform}:${handle}`;
      if (!out.has(key)) out.set(key, { platform, handle, sourceUrl });
    }
  }
  return [...out.values()];
}

/**
 * Drop handles that belong to whoever built the websites rather than to the
 * businesses on them.
 *
 * A handle appearing on several unrelated businesses is an agency credit, a
 * franchise's corporate account, or a directory widget. `minSharedToReject` is 3
 * rather than 2 because two genuinely related businesses — two campuses, a shop
 * and its owner's second location — legitimately share one account.
 */
export function rejectSharedHandles<T extends { handle: string; platform: string; entityId: string }>(
  rows: T[],
  minSharedToReject = 3
): { kept: T[]; rejected: T[] } {
  const count = new Map<string, Set<string>>();
  for (const r of rows) {
    const k = `${r.platform}:${r.handle}`;
    if (!count.has(k)) count.set(k, new Set());
    count.get(k)!.add(r.entityId);
  }
  const kept: T[] = [];
  const rejected: T[] = [];
  for (const r of rows) {
    const n = count.get(`${r.platform}:${r.handle}`)!.size;
    (n >= minSharedToReject ? rejected : kept).push(r);
  }
  return { kept, rejected };
}
