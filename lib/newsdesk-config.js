/**
 * THE NEWS DESK, PINNED. Every setting that decides what a News Desk looks and
 * sounds like lives here, and nowhere else.
 *
 * WHY THIS FILE EXISTS. The format was proven twice and then existed only as
 * constants scattered through render_news_short.js plus two steps done BY HAND
 * — the music track typed at a prompt, and the publisher row inserted by a
 * throwaway script in a temp directory. A format you have to remember how to
 * run is a format that drifts: the third video gets a different music bed
 * because nobody wrote down which one, and the fourth gets different captions
 * because a default moved underneath it.
 *
 * "UNTIL WE DECIDE TO ENHANCE THE PROCESS" IS THE WHOLE POINT. Changing a value
 * here is a deliberate act that shows up in a diff and breaks a test that
 * asserts the pinned number. Changing it by passing a different flag at a
 * prompt is invisible and unrepeatable. lib/newsdesk-config.test.ts is what
 * makes the difference real.
 *
 * WHY PLAIN JAVASCRIPT IN A TYPESCRIPT REPO. Same reason as lib/video-type.js
 * and lib/broll-library.js: the callers are CommonJS Node scripts that cannot
 * import TypeScript.
 *
 * @see CLAUDE.md "Video formats" for what a News Desk is and how it differs
 *      from a Hot Take.
 */

/** HeyGen avatar video, per second of finished footage. Measured on invoices. */
const AVATAR_PER_SEC = 0.0386;

const NEWSDESK = {
  id: "newsdesk",

  /**
   * THE CEILING, AND IT IS CHECKED BEFORE ANYTHING IS BOUGHT. Lamont set $1.50
   * for a 1:00-1:30 video. Both videos so far came in at $1.00 and $1.31.
   *
   * This covers HEYGEN ONLY. Higgsfield b-roll comes out of a subscription and
   * is deliberately outside the cap — confirmed explicitly, so do not "fix"
   * this by folding credits in.
   */
  budgetUsd: 1.50,
  targetSecs: { min: 60, max: 95 },

  /** 9:16, 25fps. The encode ladder every piece and the final cut use. */
  video: {
    width: 1080, height: 1920, fps: 25,
    preset: "medium",
    crfPiece: 20,      // per-segment pieces, before concat
    crfFinal: 21,      // the assembled timeline
    audioKbps: 160,
  },

  avatar: {
    /*
     * ITS OWN AVATAR, AND NEVER THE HOT TAKE'S. HEYGEN_NEWS_AVATAR_ID is the
     * black hoodie; HEYGEN_AVATAR_ID is the grey hoodie and belongs to the Hot
     * Take. Pointing one format at the other's id is the single easiest way to
     * make two formats indistinguishable again.
     */
    avatarEnv: "HEYGEN_NEWS_AVATAR_ID",
    voiceEnv: "HEYGEN_VOICE_ID",
    perSec: AVATAR_PER_SEC,
    aspectRatio: "9:16",
    resolution: "1080p",
    pollMs: 10000,
    timeoutMin: 20,
    /*
     * HEADLINE BEHIND, HIM IN FRONT. The article is the hook and has to stay
     * legible while he talks, so he sits low at 68% width rather than filling
     * the frame. The thin dark edge separates him from a page that is mostly
     * white and would otherwise blend.
     */
    widthPct: 0.68,
    bottomOffset: 120,
    edgeColor: "0x111827",
    edgePad: 4,
  },

  visuals: {
    /*
     * THE LONGEST ANY ONE PICTURE MAY STAY ON SCREEN, and the number this
     * format was failing on. Video one held a single frame for 22.8 seconds.
     *
     * SIX, not a rounder number, because b-roll clips are five seconds and a
     * cap below the clip length would force every one of them to be trimmed.
     */
    maxSecs: 6,
    /*
     * TWO CROPS OF THE ARTICLE CHART. Splitting a segment into shots buys
     * nothing if every shot shows the SAME picture — that is how video two's
     * first cut still had an 11.4s hold that scene detection read as one frame.
     * Wide comparison first, then the AI-driven plot alone.
     *
     * THESE ARE MEASURED AGAINST A 1170px-WIDE PHONE SCREENSHOT. A different
     * source image needs them re-measured, not reused.
     */
    chartWide: "1170:578:0:1721",
    chartTight: "600:578:570:1721",
    chartBg: "0x0d1117",
    chartZoom: 0.12,
    headlineZoom: [1.0, 1.06],
    avatarBgZoom: [1.0, 1.04],
  },

  /** What a new b-roll clip is generated as. See lib/broll-library.js first. */
  broll: {
    model: "kling3_0_turbo",
    resolution: "1080p",
    aspectRatio: "9:16",
    durationSecs: 5,
    creditsPerClip: 10,
  },

  /**
   * Caption look. These are add_captions.js's own defaults, restated here so
   * the format does not silently change when that script's defaults move —
   * which is exactly the kind of drift this file exists to catch.
   */
  captions: {
    font: "Arial Black", size: 92, outline: 6, marginV: 420, upper: true,
    maxWords: 4, maxChars: 22, maxSecs: 1.4,
  },

  /**
   * ONE BED FOR THE SERIES. A News Desk should sound like the same show every
   * time, and picking a track at the prompt is how episode three sounds like a
   * different channel. Both published videos use this.
   */
  music: { track: "reference/YouTube Music Tracks/Intellect - Yung Logos.mp3", gain: 0.28 },

  publish: {
    /*
     * entity-photos, NOT social-assets. That bucket caps at 5MB and allows only
     * image/*, video/mp4 and video/quicktime; a 90-second News Desk is ~23-28MB
     * and squeezing it under 5MB means ~335kbps at 1080x1920, which looks bad.
     * entity-photos has no size or MIME limit.
     */
    bucket: "entity-photos",
    videoPrefix: "news/",
    coverPrefix: "news/cover-",
    /** Two seconds in: inside the opening avatar beat, headline already up. */
    coverAtSec: 2,
    videoType: "newsdesk",
  },
};

/**
 * HOW FAST THE VOICE ACTUALLY SPEAKS, measured rather than assumed.
 *
 * The estimate used to assume 165 wpm, which over-predicted by 13% and would
 * have REFUSED the first episode — a video that really cost $1.32 against a
 * $1.50 cap. A gate that blocks work it should allow gets switched off, which
 * is worse than no gate.
 *
 * Measured on the two episodes that shipped: 197 wpm (astra, 112 words / 34.1s)
 * and 174 wpm (phys, 76 words / 26.2s), 187 combined. 175 is deliberately the
 * SLOW end of that range, so the estimate still errs high and the gate errs
 * toward refusing — the right bias for something guarding spend.
 *
 * RE-MEASURE THIS as episodes accumulate; two samples is not a rate, it is two
 * samples.
 */
const WORDS_PER_MIN = 175;

/**
 * A SEGMENTED HOT TAKE — the News Desk's production method, an opinion piece's
 * content.
 *
 * WHAT IT BORROWS AND WHY. Buying the avatar only for the beats that need a
 * face is a PRODUCTION technique, not a format. A Hot Take written in Lamont's
 * actual voice does not fit in thirty seconds — his voice builds by accumulation
 * and does not compress into fragments, which lib/voice-dna.ts calls the single
 * most reliable way to stop sounding like him. So the choice was a 30s piece
 * that sounds like someone else for $1.16, or an 88s piece that sounds like him
 * for about the same money. This is the second one.
 *
 * FULL SCREEN, NOT COMPOSITED. A News Desk sits the avatar low over the article
 * screenshot, because the headline is the hook and has to stay readable. A Hot
 * Take has no article — the argument is the hook — so the face fills the frame.
 *
 * THE AVATAR ID IS A DELIBERATE EXPERIMENT AND BREAKS A STANDING RULE.
 * CLAUDE.md says never point one format at the other's avatar, because the
 * different talking photos are what keep a Hot Take and a News Desk apart on
 * sight. Lamont asked to try the News Desk avatar full screen here to see how it
 * reads. Keep that decision visible: if this ships as a regular format, either
 * give it its own avatar id or accept that the two formats now look alike.
 */
const HOTTAKE_SEGMENTED = {
  ...NEWSDESK,
  id: "hottake",
  budgetUsd: NEWSDESK.budgetUsd,
  targetSecs: { min: 45, max: 100 },
  avatar: {
    ...NEWSDESK.avatar,
    avatarEnv: "HEYGEN_NEWS_AVATAR_ID",   // experiment — see the note above
    fullScreen: true,
  },
  publish: { ...NEWSDESK.publish, videoType: "hottake" },
};

/**
 * A PODCAST REACTION. Same full-frame framing as a segmented Hot Take, but the
 * spec interleaves `clip` segments that play somebody else's footage with its
 * own audio — so a quarter to a third of the runtime costs nothing.
 *
 * The clip audio is loudness-matched to the narration in the renderer; podcast
 * audio recorded elsewhere otherwise jumps volume at every cut.
 */
const REACTION = {
  ...HOTTAKE_SEGMENTED,
  id: "reaction",
  targetSecs: { min: 30, max: 90 },
  publish: { ...HOTTAKE_SEGMENTED.publish, videoType: "reaction" },
};

/** Every segmented profile, by the video_type it produces. */
const PROFILES = { newsdesk: NEWSDESK, hottake: HOTTAKE_SEGMENTED, reaction: REACTION };

/** Estimated HeyGen spend for a spec, at the rate this format is priced on. */
function estimateAvatarUsd(spec, wordsPerMin = WORDS_PER_MIN) {
  const secs = (spec.segments || [])
    .filter((s) => s.mode === "avatar")
    .reduce((t, s) => t + (s.text.split(/\s+/).length / wordsPerMin) * 60, 0);
  return { seconds: secs, usd: secs * NEWSDESK.avatar.perSec };
}

/**
 * Is this spec inside the ceiling?
 *
 * ESTIMATED HIGH ON PURPOSE, via WORDS_PER_MIN being the slow end of what was
 * measured. A check that errs toward refusing is the right bias for a gate that
 * guards spending — but only just, or it refuses work it should allow.
 */
function withinBudget(spec) {
  const { usd, seconds } = estimateAvatarUsd(spec);
  return { ok: usd <= NEWSDESK.budgetUsd, usd, seconds, budget: NEWSDESK.budgetUsd };
}

module.exports = { NEWSDESK, HOTTAKE_SEGMENTED, REACTION, PROFILES, AVATAR_PER_SEC, WORDS_PER_MIN, estimateAvatarUsd, withinBudget };
