import type { Card } from "./stories";

/**
 * How long a card stays on screen, in seconds.
 *
 * THE ONE NUMBER THAT DECIDES WHETHER ANYONE WATCHES. A carousel is PULLED —
 * the viewer swipes, so a slow reader sets their own pace and a static card is
 * fine. A reel is PUSHED, and the two ways to lose someone are opposite:
 *
 *   too long  -> dead air. Four words held for three seconds is an invitation
 *                to swipe, and it arrives around second three.
 *   too short -> the line is gone before it is read, and there is no way back.
 *
 * SHARED, not copied into each renderer. The text reel and the stickman reel
 * must agree about pacing or the same story reads as two different edits.
 */

/**
 * Words per second. Deliberately faster than prose: the type is enormous, bold
 * and high contrast, read in a glance per line rather than scanned. Pacing this
 * at an article's rate produces a reel that feels like it is buffering.
 */
export const READ_RATE = 4.2;
/** The pause after the last word, so a cut never lands on a half-read line. */
export const BEAT = 0.45;
export const MIN_SECS = 1.35;
export const MAX_SECS = 4.2;

export function wordCount(card: Card): number {
  return card.lines.join(" ").trim().split(/\s+/).filter(Boolean).length;
}

export function cardSeconds(card: Card, opts: { extraBeat?: number } = {}): number {
  const raw = wordCount(card) / READ_RATE + BEAT + (opts.extraBeat ?? 0);
  return Math.round(Math.max(MIN_SECS, Math.min(MAX_SECS, raw)) * 100) / 100;
}

export function deckSeconds(cards: readonly Card[], opts: { extraBeat?: number } = {}): number {
  return cards.reduce((a, c) => a + cardSeconds(c, opts), 0);
}
