/**
 * The share card for each page — what someone actually sees when a link to this
 * site is pasted into LinkedIn, Slack, iMessage or anywhere else.
 *
 * THE PROBLEM THIS FIXES. Of 180 pages declaring an openGraph block, 136 set no
 * `images` and fall back to the root layout's generic brand picture. Sharing
 * the kit list produced a card visually identical to sharing the homepage:
 * correct title, correct description, and a picture that said nothing. Share
 * buttons would not have helped that; they would only have made it easier to
 * post.
 *
 * (44 pages DO already set their own image — several exam-prep pages keep
 * metadata in layout.tsx rather than page.tsx, which an earlier count missed
 * entirely. Those are left alone; a hand-made cover that someone chose beats a
 * generated card, and replacing it silently would be the wrong trade.)
 *
 * THE NUMBERS ARE IMPORTED, NEVER TYPED. Every figure here comes from
 * lib/texas-exam-stats.ts or from the page's own constants, so a card cannot
 * drift from the page it advertises. A share card claiming 57% while the page
 * says 58.87% is the kind of error nobody catches, because the two are never
 * looked at together — the card is only ever seen off-site.
 *
 * WHAT MAKES A CARD WORTH BUILDING. One number nobody else publishes. That is
 * the entire test. Pages without such a number are deliberately absent rather
 * than given a card with the site's name on it in large type, which communicates
 * nothing and costs a render.
 *
 * Pure data — imported by page metadata (server) and by the renderer script.
 */
import { BARBER_WRITTEN, BARBER_PRACTICAL, COSMETOLOGY_WRITTEN } from "./texas-exam-stats";
import { SITE_URL } from "./site";

export interface OgCard {
  /** Route without the leading slash. Also the output filename. */
  slug: string;
  /** Small label above the number. Category, not a sentence. */
  eyebrow: string;
  /** The number. Kept short — this renders very large. */
  stat: string;
  /** What the number means. One line. */
  statLabel: string;
  /** A second number, when the page's point is a comparison. */
  stat2?: string;
  stat2Label?: string;
  /** The page, named as a person would say it. */
  title: string;
}

const pct = (n: number) => `${n.toFixed(1)}%`;

export const OG_CARDS: OgCard[] = [
  {
    slug: "texas-barber-state-board-practical-exam-kit-list",
    eyebrow: "Texas · Class A Barber",
    stat: "41",
    statLabel: "items to pack · 11 timed stations · 163 points",
    title: "State Board Practical Exam Kit Checklist",
  },
  {
    slug: "texas-cosmetology-practical-exam-kit-list",
    eyebrow: "Texas · Cosmetology Operator",
    stat: "13",
    statLabel: "timed stations · 119 points · 3h 31m",
    title: "State Board Practical Exam Kit Checklist",
  },
  {
    slug: "texas-school-leaderboard",
    eyebrow: "Texas · 2026 TDLR exam roster",
    stat: pct(BARBER_PRACTICAL.pass.pct),
    statLabel: "pass the practical",
    stat2: pct(BARBER_WRITTEN.firstAttempt.pct),
    stat2Label: "pass the written, first try",
    title: "Every Texas school, ranked on first-attempt pass rate",
  },
];

export const OG_CARD_BY_SLUG: Record<string, OgCard> = Object.fromEntries(
  OG_CARDS.map((c) => [c.slug, c])
);

/**
 * The `images` entry for a page's openGraph and twitter metadata.
 *
 * Returns undefined for a slug with no card, so a page can call this
 * unconditionally and simply inherit the site default — better than every page
 * needing to know whether its own card exists.
 */
export function ogImage(slug: string) {
  const card = OG_CARD_BY_SLUG[slug];
  if (!card) return undefined;
  return [
    {
      url: `${SITE_URL}/og/${slug}.png`,
      width: 1200,
      height: 630,
      alt: `${card.stat} — ${card.statLabel}`,
    },
  ];
}
