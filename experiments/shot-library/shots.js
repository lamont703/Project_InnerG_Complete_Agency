/**
 * A shot library, in the parameters this renderer actually takes.
 *
 * THE PROBLEM THIS SOLVES IS NOT VOCABULARY. Every cinematography guide will
 * tell you what an arc shot is. None of them tells you that, here, an arc is
 * cam:[sin(a), cos(a)*0.4] over 2.4 seconds with the zoom easing 1.16 -> 1.10.
 * The gap between knowing the word and typing the numbers is where ideation
 * actually stalls, so each entry below carries both.
 *
 * EVERY SHOT SAYS WHAT IT COMMUNICATES. A move that does not mean anything is
 * decoration, and decoration is what makes edits feel automated. "Push in"
 * means "look closer, this matters"; a slow pull back means "there is more here
 * than you thought". Choosing by intent rather than by novelty is the whole
 * difference between a shot list and a shuffle.
 *
 * WRITTEN FOR STILLS WITH A DEPTH MAP, so the moves that need real parallax
 * (arc, truck, pedestal) work, and the ones that need a real lens (dolly zoom,
 * handheld roll) are approximated or absent rather than faked badly.
 */

/** Camera paths. u is 0..1 within the shot. Return [x, y] in camera units. */
const PATHS = {
  still:    () => [0, 0],
  pushIn:   () => [0, 0],                                    // motion is in zoom
  pullBack: () => [0, 0],
  truckL:   (u) => [-(u - 0.5) * 1.7, 0],
  truckR:   (u) => [ (u - 0.5) * 1.7, 0],
  pedUp:    (u) => [0,  (u - 0.5) * 1.4],
  pedDown:  (u) => [0, -(u - 0.5) * 1.4],
  arc:      (u) => { const a = Math.PI * 2 * u * 0.55 + Math.PI * 0.25; return [Math.sin(a), Math.cos(a) * 0.40]; },
  arcWide:  (u) => { const a = Math.PI * 2 * u * 0.85; return [Math.sin(a) * 1.25, Math.cos(a) * 0.30]; },
  orbitLoop:(u) => { const a = Math.PI * 2 * u; return [Math.sin(a), Math.cos(a) * 0.45]; },
  drift:    (u) => [(u - 0.5) * 0.9, 0.12 - u * 0.24],
  sway:     (u) => [Math.sin(Math.PI * 2 * u) * 0.55, Math.sin(Math.PI * 4 * u) * 0.12],
  fall:     (u) => [0, (1 - u) * 0.9 - 0.45],
};

/**
 * The shots. `focus` is a depth plane: Depth Anything returns INVERSE depth, so
 * ~0.85 is the subject and ~0.15 is the room behind him.
 */
const SHOTS = {
  // ---- REVEALS: the viewer learns something -------------------------------
  rackToSubject: {
    says: "Here is what you are actually looking at.",
    use: "Openers. Poses a question in frame one, answers it in frame sixty.",
    seconds: 2.4, path: "arc", zoom: [1.18, 1.10],
    focus: [0.14, 0.88], blur: [1.0, 0.10], warmth: [-0.25, 0.10], vig: [0.30, 0.22],
  },
  rackToRoom: {
    says: "The place matters as much as the person.",
    use: "Establishing a shop. Rare and worth saving.",
    seconds: 2.2, path: "truckR", zoom: [1.12, 1.16],
    focus: [0.88, 0.16], blur: [0.10, 0.85], warmth: [0.10, -0.10], vig: [0.22, 0.28],
  },
  pullBackReveal: {
    says: "There is more here than you thought.",
    use: "Closers. The opposite of a push, and underused.",
    seconds: 2.6, path: "pullBack", zoom: [1.42, 1.00],
    focus: [0.85, 0.85], blur: [0.0, 0.0], warmth: [0.0, 0.20], vig: [0.34, 0.16],
  },
  tiltUpReveal: {
    says: "Start at the detail, end at the person.",
    use: "Haircut content specifically - open on the line work.",
    seconds: 2.4, path: "pedUp", zoom: [1.34, 1.12],
    focus: [0.9, 0.85], blur: [0.0, 0.0], warmth: [-0.05, 0.18], vig: [0.30, 0.20],
  },

  // ---- EMPHASIS: the viewer looks harder ----------------------------------
  slowPush: {
    says: "This matters. Keep watching.",
    use: "The safest shot here. Works on anything.",
    seconds: 2.6, path: "pushIn", zoom: [1.04, 1.24],
    focus: [0.85, 0.88], blur: [0.05, 0.0], warmth: [0.0, 0.15], vig: [0.18, 0.26],
  },
  punchIn: {
    says: "Look. Now.",
    use: "On a beat, or landing a number. Never twice in a row.",
    seconds: 0.9, path: "pushIn", zoom: [1.08, 1.38],
    focus: [0.88, 0.88], blur: [0.0, 0.0], warmth: [0.05, 0.05], vig: [0.20, 0.30],
  },
  creepIn: {
    says: "Something is building.",
    use: "Under a voiceover or a long caption read.",
    seconds: 4.0, path: "pushIn", zoom: [1.10, 1.20],
    focus: [0.85, 0.85], blur: [0.0, 0.0], warmth: [-0.1, 0.1], vig: [0.20, 0.24],
  },

  // ---- MOVEMENT: the world has volume -------------------------------------
  arcAround: {
    says: "This is a real place, not a picture.",
    use: "The clearest demonstration that depth is real.",
    seconds: 2.8, path: "arcWide", zoom: [1.14, 1.14],
    focus: [0.86, 0.86], blur: [0.0, 0.0], warmth: [0.0, 0.12], vig: [0.22, 0.22],
  },
  truckPast: {
    says: "We are moving through, not staring.",
    use: "Between two emphasis shots, to stop them stacking.",
    seconds: 2.0, path: "truckL", zoom: [1.16, 1.12],
    focus: [0.85, 0.85], blur: [0.0, 0.0], warmth: [0.05, 0.05], vig: [0.22, 0.20],
  },
  pedestalDown: {
    says: "Settling. Arriving.",
    use: "Final shot before a card or an end frame.",
    seconds: 2.2, path: "pedDown", zoom: [1.20, 1.06],
    focus: [0.85, 0.85], blur: [0.0, 0.0], warmth: [0.10, 0.25], vig: [0.26, 0.18],
  },

  // ---- ATMOSPHERE: the shot breathes --------------------------------------
  float: {
    says: "Nothing urgent. Stay a while.",
    use: "Under text. Motion that never competes with reading.",
    seconds: 3.2, path: "sway", zoom: [1.10, 1.06],
    focus: [0.85, 0.85], blur: [0.0, 0.0], warmth: [0.05, 0.15], vig: [0.20, 0.20],
  },
  driftOut: {
    says: "Letting go.",
    use: "Loop points. Ends near where a push would start.",
    seconds: 2.6, path: "drift", zoom: [1.18, 1.04],
    focus: [0.85, 0.85], blur: [0.0, 0.05], warmth: [0.15, 0.30], vig: [0.24, 0.18],
  },
  descend: {
    says: "Falling into the scene.",
    use: "Openers, as an alternative to a rack.",
    seconds: 2.4, path: "fall", zoom: [1.26, 1.12],
    focus: [0.80, 0.88], blur: [0.25, 0.0], warmth: [-0.15, 0.10], vig: [0.32, 0.22],
  },
};

/**
 * GRAMMARS - proven orders, which is the part a shot list alone does not give
 * you. A sequence is not three good shots; it is a shape. Each of these has an
 * argument for why it holds attention.
 */
const GRAMMARS = {
  reveal: {
    says: "Question, answer, context. The default for a single strong photo.",
    shots: ["rackToSubject", "slowPush", "pullBackReveal"],
  },
  detailFirst: {
    says: "Open on the craft, end on the person. Best for haircut work.",
    shots: ["tiltUpReveal", "arcAround", "pedestalDown"],
  },
  calm: {
    says: "For posts carrying a lot of text. Motion that never fights the words.",
    shots: ["float", "creepIn", "driftOut"],
  },
  showTheRoom: {
    says: "Sells a shop rather than a haircut. Use for owner-facing posts.",
    shots: ["descend", "rackToRoom", "truckPast", "pullBackReveal"],
  },
  punchy: {
    says: "Four beats, one hard accent. Energy without becoming a zoom loop.",
    shots: ["punchIn", "truckPast", "arcAround", "pedestalDown"],
  },
};

module.exports = { PATHS, SHOTS, GRAMMARS };
