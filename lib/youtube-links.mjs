/**
 * THE LINKS THAT GO IN A YOUTUBE DESCRIPTION — one per audience, and the one
 * place an offer changes.
 *
 * A published video is permanent. It keeps earning views for years, and its
 * description is a billboard pointing wherever it pointed on the day it went
 * out. Put a real page URL in there and the offer is frozen at whatever it was
 * that week; every later change means editing every past description by hand.
 * So videos link HERE, and this file decides where "here" actually goes.
 *
 * THE SLUG NAMES THE CHANNEL, NOT JUST THE AUDIENCE, and that is deliberate.
 * `?src=yt` would carry the same information, but a query string is the part
 * people drop when they retype a link, paste it into a DM, or read it off the
 * screen. A path segment survives all three. `/instagram/barbers` is the same
 * pattern when that lane needs it.
 *
 * EVERY REDIRECT IS TEMPORARY (307), NEVER PERMANENT (308). This is the whole
 * reason the layer exists and it is the one mistake that would break it
 * silently. Next.js: `permanent: true` "will use the 308 status code which
 * instructs clients/search engines to cache the redirect forever, if false
 * will use the 307 status code which is temporary and is not cached."
 * https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects
 * A 308 would mean that on the day the offer changes, everyone who ever
 * followed the link keeps landing on the old one out of their own browser
 * cache, with no way to reach them and nothing anywhere reporting it.
 * lib/youtube-links.test.ts asserts this and is the reason it cannot regress.
 *
 * .mjs RATHER THAN .ts BECAUSE next.config.mjs IMPORTS IT. The config loads
 * before the TypeScript and path-alias pipeline exists — the same constraint
 * that made the city-redirect list keep its own copy of TX_CITIES. Plain ESM
 * is what lets the config and the test read one source instead of two.
 *
 * `audience` is an AudienceId from lib/audiences.ts. It is not decoration: it
 * keeps these links speaking the vocabulary the membership pages, the signup
 * route and the lifecycle emails already use, so a link and the account it
 * eventually creates agree about who the person is. The test fails if a value
 * here is not a real audience.
 */

/**
 * Slug -> where that audience currently goes.
 *
 * Changing an offer is changing `destination` on one line. Nothing else moves,
 * and no past video needs touching.
 */
export const YOUTUBE_LINKS = [
  {
    slug: "barbers",
    audience: "professional",
    destination: "/google-business-profile-audit",
    // The free audit is the strongest offer on the site and the only one with a
    // paid step already behind it. It is also, exactly, the argument the
    // long-form video makes: Google is where somebody ready to book is looking,
    // and your profile decides whether you are there. A viewer who agreed with
    // the video is one click from a score on their own listing.
    why: "The video's own thesis, as a tool. Free, no account, scores their listing.",
  },
  {
    slug: "shops",
    audience: "owner",
    destination: "/shearquery-credit-report",
    // A shop owner's problem is not their own bookings, it is the chairs. Booth
    // rent that builds a payment record is an owner-side pitch; the audit is
    // not. Same reason these are two slugs and not one.
    why: "Booth rent payment history — an owner-side problem, not a chair-side one.",
  },
  {
    slug: "students",
    audience: "student",
    destination: "/tools/texas-barber-exam-practice-deck",
    // The free practice deck, NOT /texas-barber-exam-intelligence-prep: that
    // page is a school-facing compliance pitch (NACCAS metrics, accreditation)
    // and a student landing on it finds nothing addressed to them. The deck is
    // the student equivalent of the audit — a free tool that gives a real
    // result before it asks for anything.
    why: "Free written-exam practice. The student-side mirror of the audit.",
  },
  {
    slug: "schools",
    audience: "school",
    destination: "/search",
    // Schools are the audience that BUYS rather than converts, so this is a way
    // in rather than an offer. Search is where a school sees the directory it
    // would be advertising into, including its own leaderboard standing. When
    // there is a real school offer, this line changes and every past video
    // follows.
    why: "No school offer exists yet — search shows them the directory they'd buy into.",
  },
];

/** The redirect rules, in the shape next.config.mjs wants. */
export const youtubeLinkRedirects = () =>
  YOUTUBE_LINKS.map(({ slug, destination }) => ({
    source: `/youtube/${slug}`,
    destination,
    /* Temporary, always. See the header. */
    permanent: false,
  }));
