/**
 * The five shots, and what makes each one usable.
 *
 * WHY MULTI-ANGLE AT ALL. lib/fade-geometry.ts derives a skull from a face
 * mesh and says plainly what that costs: "The estimates below
 * (VERTEX_ABOVE_FOREHEAD and friends) are approximations of a skull from a face
 * mesh, which is by definition inference — the mesh stops at the hairline and
 * the rest is proportion." The back and crown of a head are exactly where a
 * fade line lives and exactly where a front-facing mesh has nothing to say.
 * Five angles replace that inference with something measured.
 *
 * WHY COACHING IS PART OF THE PRODUCT, NOT POLISH. Five phone photos taken in
 * a bathroom are entirely achievable. Five USABLE ones without guidance are
 * not — people shoot from above, cover an ear with a hand, or stand with a
 * window behind them. A capture step that silently accepts a bad shot produces
 * a bad model and blames the technology.
 *
 * Pure data and pure checks: no camera, no DOM, so the rules can be tested.
 */

export type ShotId = "front" | "left" | "right" | "back" | "top";

export interface ShotSpec {
  id: ShotId;
  label: string;
  /** What the person should physically do. */
  instruction: string;
  /** What this angle is FOR — shown so the step feels like it has a reason. */
  why: string;
}

/**
 * Ordered deliberately: front first because it is the easiest and establishes
 * the frame, back last because it is the most awkward and a person who has
 * already taken four is more likely to finish.
 */
export const SHOTS: readonly ShotSpec[] = [
  {
    id: "front",
    label: "Front",
    instruction: "Face the camera straight on, phone at eye level.",
    why: "Sets the scale for everything else and shows your hairline.",
  },
  {
    id: "left",
    label: "Left side",
    instruction: "Turn your head fully left so the camera sees your right ear.",
    why: "The ear is the landmark a fade line is measured from.",
  },
  {
    id: "right",
    label: "Right side",
    instruction: "Turn fully right so the camera sees your left ear.",
    why: "Heads are not symmetrical — both sides get measured.",
  },
  {
    id: "back",
    label: "Back",
    instruction: "Back of your head to the camera. Get someone to help, or use a mirror.",
    why: "Where the fade actually lives. A front-facing photo can only guess at this.",
  },
  {
    id: "top",
    label: "Top",
    instruction: "Camera above you, looking down at the crown.",
    why: "Shows the crown and how your hair grows out of it.",
  },
];

export type ShotProblem =
  | "too_dark"
  | "too_bright"
  | "too_small"
  | "blurry"
  | "no_face_front"
  | "wrong_angle";

export const PROBLEM_ADVICE: Record<ShotProblem, string> = {
  too_dark: "Too dark to read the hairline — face a window or turn a light on.",
  too_bright: "Blown out. Move the light behind the camera, not behind you.",
  too_small: "Move closer, or hold the phone steadier — your head should fill most of the frame.",
  blurry: "That one's soft. Hold still for a beat before it takes.",
  no_face_front: "Can't see your face — this shot needs you looking straight at the camera.",
  wrong_angle: "Looks like the wrong angle for this step. Check the instruction above.",
};

export interface ShotAssessment {
  ok: boolean;
  problems: ShotProblem[];
  /** The single most useful thing to say. Empty when the shot is fine. */
  advice: string;
}

/**
 * Judge one shot from cheap image statistics.
 *
 * DELIBERATELY NOT A MODEL. Brightness, contrast and size catch the great
 * majority of unusable phone photos, run instantly on-device, and cost nothing.
 * A model that decides "is this the back of a head" is a later problem and a
 * worse first one — it would fail slowly and be hard to explain to the person
 * holding the phone.
 *
 * One problem is reported at a time, most fixable first. A list of four
 * complaints reads as a broken tool; "turn a light on" reads as a person
 * helping.
 */
export function assessShot(stats: {
  meanLuminance: number;
  contrast: number;
  width: number;
  height: number;
  faceDetected?: boolean;
  shot: ShotId;
}): ShotAssessment {
  const problems: ShotProblem[] = [];

  if (stats.meanLuminance < 45) problems.push("too_dark");
  else if (stats.meanLuminance > 225) problems.push("too_bright");

  if (Math.min(stats.width, stats.height) < 480) problems.push("too_small");
  if (stats.contrast < 12) problems.push("blurry");

  // Only the front shot can be checked for a face. Asking "is a face visible"
  // of the BACK shot would fail every correct capture.
  if (stats.shot === "front" && stats.faceDetected === false) problems.push("no_face_front");

  // Order matters: lighting first, because a dark photo also reads as low
  // contrast and telling someone their photo is blurry when the room is dark
  // sends them to fix the wrong thing.
  const priority: ShotProblem[] = [
    "too_dark",
    "too_bright",
    "no_face_front",
    "too_small",
    "blurry",
    "wrong_angle",
  ];
  const first = priority.find((p) => problems.includes(p));

  return {
    ok: problems.length === 0,
    problems,
    advice: first ? PROBLEM_ADVICE[first] : "",
  };
}

/** Which shots are still outstanding, in the order they should be taken. */
export function remainingShots(captured: ShotId[]): ShotSpec[] {
  const done = new Set(captured);
  return SHOTS.filter((s) => !done.has(s.id));
}

export function captureComplete(captured: ShotId[]): boolean {
  return remainingShots(captured).length === 0;
}
