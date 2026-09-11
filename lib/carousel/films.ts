/**
 * Films — shot lists for the silent stick-figure shorts.
 *
 * WHY THIS IS NOT stories.ts. A story is CARDS: words on screen, staged one per
 * card, and every renderer that touches it draws text. A film has no words at
 * all. Bending a card deck into a shot list would mean a `lines: []` on every
 * entry and a `beat` that means something different from the Beat in
 * staging.ts — two types with one name, which is the confusion the video-type
 * registry had to be renamed to escape.
 *
 * A SHOT IS WHAT THE FRAME CONTAINS AND FOR HOW LONG. Camera, who is in it,
 * what their face is doing, and the state of the props. `note` is for whoever
 * reads this next; nothing renders it.
 *
 * CAMERA COORDINATES ARE NORMALISED, 0..1 of the frame. The renderer multiplies
 * by W and H, so a shot list written once is right at any output size — and the
 * numbers stay readable as "two thirds down, slightly left" rather than as
 * pixel offsets that only mean anything at 1080x1920.
 *
 * THEY WERE MEASURED, NOT GUESSED, and the first pass was written by guessing.
 * The set is not centred: drawSet puts the floor at 0.78 and the chair at 0.30,
 * the barber stands at 0.20, and their heads sit at 0.58. A shot list aimed at
 * the middle of the frame pointed at empty room, and the macro push landed on
 * nothing at all. Anything added here should be checked against the real
 * geometry rather than composed against an imagined centre.
 *
 *   floor      y 0.78          chair       x 0.30
 *   barber     x 0.20          his head    0.214, 0.586
 *   his hand   0.201, 0.573    client head 0.286, 0.584
 *   dropped guard              0.200, 0.780
 */

export interface CameraSpec {
  /** 0..1 across the frame. The world point held at frame centre. */
  x: number;
  /** 0..1 down the frame. */
  y: number;
  zoom: number;
}

export interface Shot {
  secs: number;
  /** What this shot IS, in one line. Read by people, not by the renderer. */
  note: string;
  cam: CameraSpec;
  /** When present the camera travels from `cam` to `camTo` across the shot. */
  camTo?: CameraSpec;
  barber: { pose: string; expr: string };
  /** null when he is not in frame — a macro on a prop has no room for him. */
  client: { expr: string } | null;
  /**
   * How far the guard has slipped, 0 seated and 1 hanging off; false once it is
   * gone. One number rather than a set of states, because the whole film is
   * that number moving.
   */
  guard: number | false;
  /** The guard lying on the floor, after it has fallen. */
  fallen?: boolean;
  /** The expression shown in the hand mirror, or false when no mirror is up. */
  mirror?: string | false;
}

export interface Film {
  id: string;
  title: string;
  /** Deliberately no caption or hashtags here: those belong to the queue row. */
  shots: Shot[];
}

export const FILMS: readonly Film[] = [
  {
    id: "the-guard",
    title: "The Guard",
    shots: [
      {
        secs: 2.0, note: "Cruising. He is relaxed and the client is on his phone.",
        cam: { x: 0.25, y: 0.66, zoom: 1.30 },
        barber: { pose: "cut", expr: "calm" }, client: { expr: "calm" }, guard: 0,
      },
      {
        secs: 1.2, note: "MACRO on the clippers. The guard has walked loose; he has not seen it.",
        cam: { x: 0.201, y: 0.573, zoom: 4.4 }, camTo: { x: 0.201, y: 0.573, zoom: 5.4 },
        barber: { pose: "cut", expr: "calm" }, client: { expr: "calm" }, guard: 0.55,
      },
      {
        secs: 0.8, note: "It drops. The hum goes bare.",
        cam: { x: 0.20, y: 0.60, zoom: 4.8 }, camTo: { x: 0.20, y: 0.72, zoom: 3.0 },
        barber: { pose: "cut", expr: "calm" }, client: { expr: "calm" },
        guard: false, fallen: true,
      },
      {
        secs: 1.5, note: "THE CRUEL ONE. He keeps cutting. He has not registered it.",
        cam: { x: 0.24, y: 0.63, zoom: 2.0 },
        barber: { pose: "cut", expr: "calm" }, client: { expr: "calm" },
        guard: false, fallen: true,
      },
      {
        secs: 1.0, note: "His eyes flick down. The guard is on the floor.",
        cam: { x: 0.21, y: 0.73, zoom: 2.6 },
        barber: { pose: "glance", expr: "alert" }, client: { expr: "calm" },
        guard: false, fallen: true,
      },
      {
        secs: 1.5, note: "Tilt up from the floor to the head.",
        cam: { x: 0.21, y: 0.73, zoom: 2.6 }, camTo: { x: 0.25, y: 0.58, zoom: 2.4 },
        barber: { pose: "glance", expr: "panic" }, client: { expr: "calm" },
        guard: false, fallen: true,
      },
      {
        secs: 1.5, note: "The client sets the phone down and starts to lift his head.",
        cam: { x: 0.27, y: 0.60, zoom: 2.4 },
        barber: { pose: "hold", expr: "panic" }, client: { expr: "alert" },
        guard: false, fallen: true,
      },
      {
        secs: 2.0, note: "The mirror comes up. Hold on his face. Silence.",
        cam: { x: 0.32, y: 0.59, zoom: 2.1 }, camTo: { x: 0.33, y: 0.58, zoom: 2.3 },
        barber: { pose: "raise", expr: "panic" }, client: { expr: "horror" },
        guard: false, fallen: true, mirror: "horror",
      },
    ],
  },
];

export function findFilm(id: string): Film | undefined {
  return FILMS.find((f) => f.id === id);
}

export function filmSeconds(f: Film): number {
  return f.shots.reduce((a, s) => a + s.secs, 0);
}

/**
 * Refuse a film the renderer cannot draw.
 *
 * The failure this prevents is silent in the same way a missing stage direction
 * was: an unknown pose name falls back to whatever the renderer defaults to, so
 * the barber stands still through the shot that carries the film and nothing
 * errors.
 */
const POSE_NAMES = ["stand", "count", "cut", "slump", "sit", "wait", "glance", "hold", "raise"];
const EXPR_NAMES = ["calm", "shut", "alert", "panic", "relief", "horror"];

export function validateFilm(f: Film): string[] {
  const p: string[] = [];
  if (!f.shots.length) p.push("no shots");
  f.shots.forEach((s, i) => {
    if (s.secs <= 0) p.push(`shot ${i}: secs must be positive`);
    if (!POSE_NAMES.includes(s.barber.pose)) p.push(`shot ${i}: unknown pose "${s.barber.pose}"`);
    if (!EXPR_NAMES.includes(s.barber.expr)) p.push(`shot ${i}: unknown expression "${s.barber.expr}"`);
    if (s.client && !EXPR_NAMES.includes(s.client.expr)) p.push(`shot ${i}: unknown client expression "${s.client.expr}"`);
    if (typeof s.mirror === "string" && !EXPR_NAMES.includes(s.mirror)) p.push(`shot ${i}: unknown mirror expression "${s.mirror}"`);
    for (const [k, c] of [["cam", s.cam], ["camTo", s.camTo]] as const) {
      if (!c) continue;
      if (c.zoom <= 0) p.push(`shot ${i}: ${k}.zoom must be positive`);
      if (c.x < -0.5 || c.x > 1.5 || c.y < -0.5 || c.y > 1.5) p.push(`shot ${i}: ${k} is off the frame`);
    }
  });
  return p;
}
