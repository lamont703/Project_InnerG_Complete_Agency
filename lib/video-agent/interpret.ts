import { WORDS_PER_MIN, NEWSDESK, maxAvatarSecs, PROFILES, withinBudget } from "@/lib/newsdesk-config";

/**
 * TURN AN EMAIL INTO A VIDEO SPEC.
 *
 * WHY THIS SITS BEHIND A ONE-FUNCTION SEAM. The spec produced here is what a
 * paid render gets built from, so if its quality ever disappoints, the model
 * behind it has to be swappable without unpicking calls from the route. The
 * seam is `interpret()`; everything provider-specific lives below it.
 *
 * WHICH FORMATS ARE ON OFFER, AND WHY IT IS NOT AGENT_VIDEO_TYPE_IDS. That list
 * is the RESEARCH agent's, and it excludes `newsdesk` and `reaction` precisely
 * because those cannot be rendered from a queue card. This agent writes a SPEC,
 * which is the only way those two ever render — so its valid set is the exact
 * inverse: the profiles in lib/newsdesk-config.js. A `lookbook` or `figure`
 * cannot be produced from an email at all; they come from a grid image and a
 * figure card respectively.
 */
export const SPEC_PROFILES = Object.keys(PROFILES) as Array<keyof typeof PROFILES>;

export interface SpecSegment {
  mode: "avatar" | "voice" | "clip";
  text?: string;
  visual?: "headline" | "chart" | "broll";
  tags?: string[];
  from?: number;
  to?: number;
}

export interface VideoSpec {
  slug: string;
  title: string;
  caption: string;
  profile: keyof typeof PROFILES;
  headline?: string;
  clipSource?: string;
  source?: string;
  segments: SpecSegment[];
}

export interface InterpretInput {
  subject: string;
  body: string;
  /** Public URLs of images already saved by the intake stage. */
  imageUrls: string[];
  /** Filenames of video the renderer will fetch — the model may reference them. */
  videoFilenames: string[];
  /** Tags already in broll_assets, so the model prefers reuse over generation. */
  availableTags: string[];
}

/**
 * A Data Reel is a CARD, not a spec — one figure, its label, and where it came
 * from. render_queued.js animates it from those fields; there are no segments.
 */
export interface DataReelCard {
  slug: string; title: string; caption: string;
  stat: string; label: string; punch?: string; question?: string;
  chip?: string; source: string;
}

/**
 * A Lookbook is a GRID — six named styles panned across one 2x3 image. The
 * image is the video; there is no narration and no avatar.
 */
export interface LookbookGrid {
  slug: string; title: string; caption: string;
  headline: string;          // the one-line card shown over the grid
  names: string[];           // exactly six
}

export type VideoRequest =
  | { kind: "spec"; spec: VideoSpec }
  | { kind: "card"; card: DataReelCard }
  | { kind: "grid"; grid: LookbookGrid };

export interface InterpretResult {
  request: VideoRequest;
  reasoning: string;
  estimate: { seconds: number; usd: number; ok: boolean; budget: number };
}

/** The provider seam. Swapping models means adding one of these, nothing more. */
export interface Interpreter {
  name: string;
  run(prompt: string, imageUrls: string[]): Promise<string>;
}

/* ------------------------------------------------------------------ */

function promptFor(input: InterpretInput, voice: string): string {
  /* Stated in seconds AND words, because the model writes words, not seconds. */
  const maxSecs = maxAvatarSecs(NEWSDESK);
  const maxWords = Math.floor((maxSecs / 60) * WORDS_PER_MIN);
  const profiles = SPEC_PROFILES.map((p) => {
    const c = PROFILES[p];
    return `  "${p}" — ${c.targetSecs.min}-${c.targetSecs.max}s, avatar billed at $${c.avatar.perSec}/s, cap $${c.budgetUsd}`;
  }).join("\n");

  return `You turn an email into a JSON spec for a short vertical video, OR you refuse.

REFUSE WHEN THERE IS NO BRIEF. If the email does not actually ask for a video —
it is a greeting, a note saying files are attached, a forward with no
instruction — reply with exactly {"refuse":"<one short sentence saying what is
missing>"} and nothing else. Do not invent a video from an email that did not
request one.

THE EMAIL
Subject: ${input.subject}
Body:
${input.body.slice(0, 4000)}

${input.imageUrls.length ? `${input.imageUrls.length} image(s) are attached to this message and shown to you. If one is a screenshot of a news article, it is the headline image for the video.` : "No images were attached."}
${input.videoFilenames.length ? `Video file(s) supplied: ${input.videoFilenames.join(", ")}. A supplied video means this is a "reaction": cut between clip segments of THEIR video and avatar segments of OUR commentary.` : ""}

"format" MUST BE EXACTLY ONE OF THESE FIVE WORDS. It is the rendering pipeline,
not a person and not a title:

  newsdesk  reacting to a news article. Needs a headline SCREENSHOT attached.
  hottake   an opinion piece, no article. Avatar full frame.
  reaction  cutting between a supplied VIDEO and our commentary. Needs a video.
  figure    a Data Reel: ONE number from our data, animated. No avatar, free.
  lookbook  six hairstyles panned across a supplied 2x3 GRID IMAGE. Free.

${profiles}

  newsdesk  — reacting to a news article. Needs a headline screenshot. Avatar is
              composited over the article; voice segments use visual "headline"
              or "broll".
  hottake   — an opinion piece with no article. Avatar full frame.
  reaction  — cutting between somebody else's supplied clip and our commentary.
              Use segments of mode "clip" with numeric "from" and "to" seconds.

HOW HE SOUNDS — follow this exactly.
${voice}

RULES
- Segments alternate. "avatar" is on camera and COSTS MONEY; "voice" is his
  narration over b-roll and is free; "clip" plays a supplied video and is free.

- ONE NARRATION, SLICED. Every segment is the same continuous voice track. The
  avatar does not "start talking" at a segment — it lip-syncs the slice of
  narration that belongs to it. So moving a sentence from an avatar segment to a
  voice segment changes NOTHING about how the video sounds. It only stops us
  paying for a face during that sentence. This is the default way these are
  built, not an optimisation to apply at the end.

- HARD BUDGET: AT MOST ${maxSecs} SECONDS ON CAMERA across ALL avatar segments
  combined, which at 175 wpm is about ${maxWords} WORDS TOTAL of avatar text.
  Count them. Everything beyond that is a voice segment over b-roll. A spec over
  this is refused before anything is bought, and the sender gets nothing.

- DEFAULT TO FOUR AVATAR BEATS, and only the four that need a face:
    the open (name the audience), the pivot (the turn), the thesis (the claim),
    the close (the question + "Tell me in the comments").
  Everything in between — the setup, the evidence, the detail, the example — is
  "voice" over b-roll. When a beat runs long, MOVE A SENTENCE OUT of it into a
  b-roll segment rather than trimming the argument. The argument is the video;
  the face is not.
- Every "voice" segment with visual "broll" needs "tags": lowercase single words
  describing what is IN the shot. Prefer these, which we already own:
  ${input.availableTags.slice(0, 60).join(", ")}
- Open by naming the audience. Close on a question and "Tell me in the comments".

- YOU CANNOT OPEN LINKS, AND YOU MUST NOT WRITE AS IF YOU DID. Every factual
  claim — a number, a rate, a date, a quote, what somebody said — has to come
  from the EMAIL TEXT or from an image you can actually SEE. A URL in the email
  is a string; you have not read what is behind it.

  If the email asks you to read a linked article, or if the video would depend
  on contents you cannot see, REFUSE with exactly:
  {"refuse":"I cannot open links. Paste the article text into the email, or attach a screenshot that shows the part that matters — a headline card alone is not the article"}

  This has already gone wrong: a request said "read the article at this URL" with
  a headline screenshot attached, and a full script of invented figures came back
  priced and ready to approve. A signature link is not this — refuse only when
  the CONTENT of the video would rest on a page you cannot read.
SHAPE DEPENDS ON THE FORMAT.

For figure, output NO segments. Output instead:
  {"slug","title","caption","format":"figure","reasoning",
   "stat":"12,136","label":"Texans hold two licences at once.",
   "punch":"one sharper line","question":"a question for the viewer",
   "chip":"TEXAS · LICENSING","source":"where the number came from + read date"}
  ONLY use a figure the email actually STATES. Never invent, estimate, or infer
  one, and never promise to go and find one.

  If the email asks for a Data Reel but names no figure — "do some data reels",
  "use data we have not shared yet" — REFUSE with exactly:
  {"refuse":"a Data Reel needs the actual figure stated in the email"}
  Choosing which numbers are worth publishing means querying what has already
  run, checking that a column means what its name suggests, and discarding the
  ones that mislead. That is analysis, and it is deliberately not done here.

For lookbook, output NO segments. Output instead:
  {"slug","title","caption","format":"lookbook","reasoning",
   "headline":"Six fades, explained.","names":["...","...","...","...","...","..."]}
  names must be exactly six, in the reading order of the grid: top-left,
  top-right, middle-left, middle-right, bottom-left, bottom-right.

For newsdesk, hottake and reaction, output segments in exactly this shape:
  {"slug":"lowercase-hyphenated","title":"...","caption":"...",
   "format":"${SPEC_PROFILES[0]}","reasoning":"...",
   "segments":[{"mode":"avatar","text":"..."},
               {"mode":"voice","visual":"broll","tags":["barbershop"],"text":"..."}]}`;
}

/** Pull the JSON object out of a model reply that may carry prose or a fence. */
export class NoBriefError extends Error {}

function parseReply(reply: string): { request: VideoRequest; reasoning: string } {
  const cleaned = reply.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error(`no JSON object in the model reply: ${reply.slice(0, 200)}`);
  const parsed = JSON.parse(cleaned.slice(start, end + 1));

  /*
   * A REFUSAL IS A VALID ANSWER. Most mail into this box will not be a video
   * request, and a model that always returns a spec will happily invent one
   * from "forgot to attach the files" — which then costs a human the attention
   * of reading a proposal for a video nobody asked for.
   */
  if (typeof parsed.refuse === "string" && parsed.refuse.trim()) throw new NoBriefError(parsed.refuse.trim());

  if (!parsed.slug) throw new Error("reply has no slug");
  const format = parsed.format ?? parsed.profile;
  const reasoning0 = typeof parsed.reasoning === "string" ? parsed.reasoning : "";

  if (format === "figure") {
    if (!parsed.stat || !parsed.label) throw new Error("a Data Reel needs both stat and label");
    if (!parsed.source) throw new Error("a Data Reel with no source line cannot be checked, so it is not publishable");
    delete parsed.reasoning; delete parsed.format;
    return { request: { kind: "card", card: parsed as DataReelCard }, reasoning: reasoning0 };
  }

  if (format === "lookbook") {
    if (!Array.isArray(parsed.names) || parsed.names.length !== 6) {
      throw new Error(`a Lookbook needs exactly six names, got ${parsed.names?.length ?? 0}`);
    }
    if (!parsed.headline) throw new Error("a Lookbook needs a headline line");
    delete parsed.reasoning; delete parsed.format;
    return { request: { kind: "grid", grid: parsed as LookbookGrid }, reasoning: reasoning0 };
  }

  if (!parsed.segments?.length) throw new Error("spec is missing segments");

  /*
   * `format` is asked for; `profile` is accepted because that is what the field
   * is called on the spec the renderer reads, and an earlier prompt used that
   * name — a model that answers with the older key is right about the value.
   */
  parsed.profile = parsed.format ?? parsed.profile;
  delete parsed.format;
  if (!SPEC_PROFILES.includes(parsed.profile)) {
    throw new Error(`spec asked for format "${parsed.profile}", which is not one of ${SPEC_PROFILES.join(", ")}`);
  }
  for (const [i, s] of parsed.segments.entries()) {
    if (!["avatar", "voice", "clip"].includes(s.mode)) throw new Error(`segment ${i} has mode "${s.mode}"`);
    if (s.mode === "clip") {
      if (typeof s.from !== "number" || typeof s.to !== "number" || s.to <= s.from) {
        throw new Error(`clip segment ${i} needs numeric from/to with to > from`);
      }
    } else if (!s.text?.trim()) {
      throw new Error(`segment ${i} (${s.mode}) has no text`);
    }
  }
  delete parsed.reasoning;
  return { request: { kind: "spec", spec: parsed as VideoSpec }, reasoning: reasoning0 };
}

export async function interpret(input: InterpretInput, voice: string, model: Interpreter): Promise<InterpretResult> {
  const reply = await model.run(promptFor(input, voice), input.imageUrls);
  const { request, reasoning } = parseReply(reply);

  /*
   * THE ESTIMATE IS COMPUTED HERE, NOT ASKED FOR. A model that both proposes the
   * spend and reports it has an obvious incentive problem, and more prosaically
   * it gets arithmetic wrong. withinBudget() is the same function the renderer's
   * own gate uses, so the number in the proposal email is the number that will
   * be enforced.
   */
  /*
   * A card and a grid cost NOTHING — no avatar seconds are bought, which is why
   * they are worth offering by email at all. Only a spec has a bill.
   */
  if (request.kind !== "spec") {
    return { request, reasoning, estimate: { seconds: 0, usd: 0, ok: true, budget: 0 } };
  }
  const estimate = withinBudget({ segments: request.spec.segments.filter((s) => s.mode !== "clip") });
  return { request, reasoning, estimate: { seconds: estimate.seconds, usd: estimate.usd, ok: estimate.ok, budget: estimate.budget } };
}
