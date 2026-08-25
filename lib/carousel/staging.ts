/**
 * Stage directions — how a story's cards become a scene.
 *
 * WHY THIS IS SEPARATE FROM stories.ts. The words are the story and they are
 * shared by every format: the carousel renders them, the text reel renders
 * them, and this renders them too. Staging is the opposite — it only means
 * anything to the animation. Putting a `speaker` field on Card would make every
 * other renderer carry a property it has no use for, and would invite someone
 * to change the copy while editing a pose.
 *
 * THE VOCABULARY IS DELIBERATELY SMALL. Ten cards is not a film. Every extra
 * pose, prop and camera move is another thing to author per story and another
 * thing to look wrong. A named speaker, a named beat, and nothing else — a
 * scene that cannot be described in those two words is a scene that should be
 * rewritten rather than animated.
 *
 * WHAT THE FIGURES ARE FOR. They are not illustration. They exist because a
 * text reel has no motion a viewer can track, so the eye leaves. A stick figure
 * that turns, slumps or raises an arm gives attention somewhere to land, and it
 * does it without sound — which matters, because most of this is watched muted.
 */

/** Who is talking. `null` means narration: on-screen text with no bubble. */
export type Speaker = "barber" | "phone" | "client" | "bench" | null;

/**
 * A named visual event. The renderer owns what each one looks like; this file
 * only says which one fires, so restaging a story never means touching drawing
 * code.
 */
export type Beat =
  | "idle"        // barber at the chair, client seated
  | "phoneBuzz"   // the phone rises and shakes
  | "counting"    // barber looks at the bench, arm raised
  | "cutting"     // clipper arm working
  | "slump"       // shoulders down, head forward — tired
  | "alone"       // everyone else gone
  | "reveal";     // no set at all; the frame is the line

export interface Direction {
  speaker: Speaker;
  beat: Beat;
  /** How many figures are waiting on the bench for this card. */
  bench?: number;
}

/**
 * Directions per story, indexed to match Story.cards exactly.
 *
 * A length mismatch is caught by validateStaging() rather than discovered as a
 * card that silently renders with the previous card's pose still on screen.
 */
export const STAGING: Record<string, Direction[]> = {
  "dead-in-here": [
    { speaker: null, beat: "reveal" },                    // the hook
    { speaker: null, beat: "phoneBuzz", bench: 4 },       // 11:04am
    { speaker: "phone", beat: "phoneBuzz", bench: 4 },    // "yo is it busy"
    { speaker: null, beat: "counting", bench: 4 },        // thirty, sixty, ninety
    { speaker: "barber", beat: "counting", bench: 4 },    // "dead bro. stay home."
    { speaker: null, beat: "cutting", bench: 3 },         // four cuts, no split
    { speaker: null, beat: "slump", bench: 6 },           // 4pm, nine more
    { speaker: "phone", beat: "slump", bench: 6 },        // "told you it was slow"
    { speaker: null, beat: "alone" },                     // the lesson
    { speaker: null, beat: "reveal" },                    // the ask
  ],
};

export interface StagingProblem {
  storyId: string;
  problem: string;
}

/**
 * Check the directions line up with the cards.
 *
 * The failure this prevents is quiet: a missing direction leaves the previous
 * card's pose on screen, so the barber keeps cutting through the punchline and
 * nothing errors. It looks like a bad animation choice rather than a bug.
 */
export function validateStaging(storyId: string, cardCount: number): string[] {
  const d = STAGING[storyId];
  if (!d) return [`no staging for "${storyId}"`];
  const out: string[] = [];
  if (d.length !== cardCount) {
    out.push(`${d.length} directions for ${cardCount} cards — they must match one to one`);
  }
  d.forEach((step, i) => {
    if (step.speaker && step.beat === "reveal") {
      // A bubble needs somebody on screen to come out of.
      out.push(`card ${i + 1}: "${step.speaker}" speaks during a reveal, which has no set`);
    }
    if (step.speaker === "bench" && !step.bench) {
      out.push(`card ${i + 1}: the bench speaks but nobody is on it`);
    }
  });
  return out;
}

export function directionsFor(storyId: string): Direction[] | undefined {
  return STAGING[storyId];
}
