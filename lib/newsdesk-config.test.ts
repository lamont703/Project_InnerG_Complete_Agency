import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { NEWSDESK, WORDS_PER_MIN, estimateAvatarUsd, withinBudget } from "@/lib/newsdesk-config";

/**
 * These tests are the difference between a format that is CONFIGURED and one
 * that merely happens to be set that way today. Every assertion here is a value
 * someone agreed to; changing one should require editing a test, which is a
 * deliberate act that shows up in review — not a flag typed at a prompt.
 */
describe("the News Desk is pinned", () => {
  it("keeps the agreed budget ceiling", () => {
    expect(NEWSDESK.budgetUsd).toBe(1.5);
    // HeyGen only. Higgsfield b-roll is a subscription and deliberately outside
    // this cap — do not "fix" the number by folding credits in.
    expect(NEWSDESK.avatar.perSec).toBeCloseTo(0.0386, 4);
  });

  /*
   * THE NUMBER THIS FORMAT WAS FAILING ON. Video one held one frame for 22.8
   * seconds. Six is also below the five-second b-roll clip length for a reason:
   * a cap under the clip length would trim every clip.
   */
  it("caps how long one visual may hold", () => {
    expect(NEWSDESK.visuals.maxSecs).toBe(6);
    expect(NEWSDESK.visuals.maxSecs).toBeGreaterThan(NEWSDESK.broll.durationSecs);
  });

  /*
   * Splitting a segment into shots buys nothing if the shots show the same
   * picture — that is how video two's first cut still had an 11.4s hold. The
   * two chart crops must stay genuinely different.
   */
  it("has two genuinely different chart crops", () => {
    expect(NEWSDESK.visuals.chartWide).not.toBe(NEWSDESK.visuals.chartTight);
    const w = NEWSDESK.visuals.chartWide.split(":").map(Number);
    const t = NEWSDESK.visuals.chartTight.split(":").map(Number);
    expect(t[0]).toBeLessThan(w[0]);          // tight is narrower
    expect(t[2]).toBeGreaterThan(w[2]);       // and starts further right
  });

  /*
   * THE EASIEST WAY TO MAKE TWO FORMATS INDISTINGUISHABLE AGAIN. A News Desk
   * and a Hot Take are both avatar videos; the separate avatar id is what keeps
   * them apart on sight.
   */
  it("uses the News Desk avatar and never the Hot Take's", () => {
    expect(NEWSDESK.avatar.avatarEnv).toBe("HEYGEN_NEWS_AVATAR_ID");
    expect(NEWSDESK.avatar.avatarEnv).not.toBe("HEYGEN_AVATAR_ID");
    expect(NEWSDESK.avatar.voiceEnv).toBe("HEYGEN_VOICE_ID");
  });

  /*
   * social-assets caps at 5MB. A 90-second News Desk is 23-28MB, and squeezing
   * it under that ceiling means ~335kbps at 1080x1920, which looks bad.
   */
  it("publishes to the bucket that will actually take the file", () => {
    expect(NEWSDESK.publish.bucket).toBe("entity-photos");
    expect(NEWSDESK.publish.bucket).not.toBe("social-assets");
    expect(NEWSDESK.publish.videoType).toBe("newsdesk");
  });

  it("keeps one music bed, so the series sounds like one show", () => {
    expect(NEWSDESK.music.track).toContain("reference/YouTube Music Tracks/");
    expect(NEWSDESK.music.gain).toBeGreaterThan(0);
    expect(NEWSDESK.music.gain).toBeLessThan(1);
  });

  it("renders 9:16 at 1080x1920", () => {
    expect(NEWSDESK.video.width / NEWSDESK.video.height).toBeCloseTo(9 / 16, 4);
    expect(NEWSDESK.avatar.aspectRatio).toBe("9:16");
    expect(NEWSDESK.broll.aspectRatio).toBe("9:16");
    // b-roll is generated at the render resolution so nothing is upscaled.
    expect(NEWSDESK.broll.resolution).toBe("1080p");
  });
});

describe("the budget gate", () => {
  const seg = (mode: string, words: number) =>
    ({ mode, text: Array.from({ length: words }, () => "word").join(" ") });

  it("prices only the avatar segments", () => {
    const spec = { segments: [seg("avatar", WORDS_PER_MIN), seg("voice", WORDS_PER_MIN)] };
    // One minute of avatar and one minute of voice-over, which is free.
    expect(estimateAvatarUsd(spec).seconds).toBeCloseTo(60, 1);
    expect(estimateAvatarUsd(spec).usd).toBeCloseTo(60 * 0.0386, 2);
  });

  /*
   * THE RATE IS MEASURED, AND ERRS SLOW ON PURPOSE. At the old assumed 165 wpm
   * the gate would have refused episode one — a video that really cost $1.32.
   * A gate that blocks work it should allow gets switched off.
   */
  it("estimates at the slow end of what was actually measured", () => {
    expect(WORDS_PER_MIN).toBe(175);
    expect(WORDS_PER_MIN).toBeLessThan(187);   // below the combined measured rate
    expect(WORDS_PER_MIN).toBeGreaterThan(165); // but above the old bad guess
  });

  it("refuses a script that would cost more than agreed", () => {
    const over = { segments: [seg("avatar", 250)] };
    expect(withinBudget(over).ok).toBe(false);
    const under = { segments: [seg("avatar", 70)] };
    expect(withinBudget(under).ok).toBe(true);
  });

  /*
   * THE SPECS LIVE UNDER reference/, WHICH IS GITIGNORED, so a fresh clone does
   * not have them and these two assertions cannot be unconditional — a test
   * that fails purely because a local-only file is absent trains people to
   * ignore red. Where the specs ARE present they are checked properly, which
   * covers the machine that actually renders episodes.
   */
  const SPECS = ["astra-script.json", "phys-storytelling-script.json"]
    .map((f) => `reference/AI News Video Shorts/${f}`)
    .filter((p) => existsSync(p));

  it.skipIf(SPECS.length === 0)("passes every episode that actually shipped", () => {
    for (const p of SPECS) {
      const b = withinBudget(JSON.parse(readFileSync(p, "utf8")));
      expect(b.ok, `${p} estimated $${b.usd.toFixed(2)}`).toBe(true);
    }
  });

  /* An episode is not a complete record without the words that publish it. */
  it.skipIf(SPECS.length === 0)("requires every spec to carry its own title and caption", () => {
    for (const p of SPECS) {
      const spec = JSON.parse(readFileSync(p, "utf8"));
      expect(spec.title, p).toBeTruthy();
      expect(spec.caption, p).toBeTruthy();
      expect(spec.segments.length, p).toBeGreaterThan(0);
    }
  });
});

describe("the scripts read the config rather than their own copies", () => {
  const render = readFileSync("scripts/render_news_short.js", "utf8");
  const publish = readFileSync("scripts/publish_news_short.js", "utf8");

  /*
   * THE DRIFT THIS CATCHES. Both scripts once carried these numbers inline. A
   * literal that reappears here is a second source of truth, and the config
   * stops being the thing that decides anything.
   */
  it("carries no inline copies of pinned values", () => {
    for (const src of [render, publish]) {
      expect(src).toContain("newsdesk-config");
      expect(src).not.toMatch(/"1080p"/);
      expect(src).not.toMatch(/"9:16"/);
      expect(src).not.toMatch(/0x111827|0x0d1117/);
    }
    expect(render).not.toMatch(/HEYGEN_NEWS_AVATAR_ID"/);
  });

  it("checks the budget before buying anything", () => {
    expect(render).toContain("withinBudget");
    expect(render).toContain("over-budget");
    // The gate must sit before the render loop, not after the spend.
    expect(render.indexOf("withinBudget")).toBeLessThan(render.indexOf("/v3/videos"));
  });
});
