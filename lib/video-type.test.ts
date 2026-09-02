import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isWinningTitleShape } from "@/lib/research/types";
import { AGENT_VIDEO_TYPE_IDS, LEGACY_VIDEO_TYPE_IDS, SEED_GRID, VIDEO_TYPES, VIDEO_TYPE_IDS, isListicleTitle, videoTypeFor } from "@/lib/video-type";

/**
 * The publisher board prices a card from videoTypeFor(). scripts/render_queued.js
 * renders it from the same call. These tests are what make that one call
 * trustworthy enough to put a dollar figure in front of an operator.
 */
describe("videoTypeFor", () => {
  it("offers the four pipelines that exist", () => {
    expect(VIDEO_TYPE_IDS.sort()).toEqual(["figure", "hottake", "lookbook", "newsdesk"]);
  });

  /*
   * `news` IS STATED-ONLY. No headline shape means "this is a news short" —
   * the format is a decision about a story, not a property of the words. If it
   * ever became derivable, an ordinary avatar topic would start routing at a
   * pipeline the board cannot reach, and the card would sit unrenderable.
   */
  /*
   * The agent may only ask for a format the board can actually render from a
   * card. Letting it pick `news` would queue an idea no button can render.
   */
  it("keeps the News Desk out of what the research agent may choose", () => {
    expect(AGENT_VIDEO_TYPE_IDS.sort()).toEqual(["figure", "hottake", "lookbook"]);
    expect(VIDEO_TYPE_IDS).toContain("newsdesk");
    for (const id of AGENT_VIDEO_TYPE_IDS) expect(VIDEO_TYPE_IDS).toContain(id);
  });

  it("never derives a News Desk, only honours it when stated", () => {
    for (const title of [
      "OpenAI Says Its Next Model Crossed a Cyber Threshold",
      "The Truth About Rent Credit Reporting",
      "6 Fades Every Barber Should Know",
      "569 Texas Barbershops Have a Perfect 5.0",
    ]) {
      expect(videoTypeFor({ title }).id).not.toBe("newsdesk");
    }
    expect(videoTypeFor({ title: "anything at all", video_type: "newsdesk" }).id).toBe("newsdesk");
    // A stated News Desk outranks a stat, the same way every stated type does.
    expect(videoTypeFor({ title: "x", stat: "130,165", video_type: "newsdesk" }).id).toBe("newsdesk");
  });

  /*
   * THE BUG THE video_type COLUMN EXISTS FOR. Every data reel carries a figure
   * like "130,165" — not a small leading count — so the title rule sent all six
   * in the queue to `avatar`. Clicking Render would have bought a $1.16 talking
   * head instead of the free animated card the row was written to be.
   */
  it("recognises a data reel by its stat, not its headline", () => {
    const card = { title: "130,165 Texas Beauty Licences Are Nails or Skin", stat: "130,165" };
    expect(videoTypeFor(card).id).toBe("figure");
    expect(videoTypeFor(card).costUsd).toBe(0);
    // Without the stat the same headline is just a statistic: an avatar topic.
    expect(videoTypeFor({ title: card.title }).id).toBe("hottake");
  });

  it("lets a stated type override anything derived", () => {
    expect(videoTypeFor({ title: "6 Fades", video_type: "hottake" }).id).toBe("hottake");
    expect(videoTypeFor({ title: "The Truth About X", video_type: "lookbook" }).id).toBe("lookbook");
    expect(videoTypeFor({ title: "x", stat: "12", video_type: "hottake" }).id).toBe("hottake");
  });

  /*
   * A typo in a column must not route a render at a pipeline that does not
   * exist. Ignoring it and deriving is the safe failure.
   */
  it("ignores an unrecognised stated type rather than trusting it", () => {
    expect(videoTypeFor({ title: "6 Fades", video_type: "reel-v2" }).id).toBe("lookbook");
    expect(videoTypeFor({ title: "The Truth", video_type: "" }).id).toBe("hottake");
  });

  it("treats a blank stat as no stat", () => {
    expect(videoTypeFor({ title: "The Truth About X", stat: "   " }).id).toBe("hottake");
    expect(videoTypeFor({ title: "The Truth About X", stat: null }).id).toBe("hottake");
  });

  it("is total — every card gets exactly one renderer, never none", () => {
    for (const title of [
      "6 Fades Every Barber Should Know",
      "The Truth About Rent Credit Reporting",
      "",
      "12 Things",
      "!!!",
    ]) {
      const t = videoTypeFor({ title });
      expect(VIDEO_TYPE_IDS).toContain(t.id);
    }
    // A card with no title at all still resolves rather than throwing.
    expect(videoTypeFor({}).id).toBe("hottake");
    expect(videoTypeFor({ title: null }).id).toBe("hottake");
  });

  it("sends numbered listicles to the Lookbook and everything else to a Hot Take", () => {
    expect(videoTypeFor({ title: "6 Fades Every Barber Should Know" }).id).toBe("lookbook");
    expect(videoTypeFor({ title: "2 Ways to Fill Your Chair" }).id).toBe("lookbook");
    expect(videoTypeFor({ title: "The Truth About Rent Credit Reporting" }).id).toBe("hottake");
  });

  /*
   * The bound that stops a STATISTIC from being mistaken for a list. This exact
   * title ran on the channel and died at 123 views, which is the evidence the
   * 2-12 window is built on.
   */
  it("treats a large leading number as a statistic, not a list", () => {
    expect(isListicleTitle("569 Texas Barbershops Have a Perfect 5.0")).toBe(false);
    expect(videoTypeFor({ title: "569 Texas Barbershops Have a Perfect 5.0" }).id).toBe("hottake");
    expect(isListicleTitle("13 Things")).toBe(false);
    expect(isListicleTitle("1 Thing")).toBe(false);
  });

  it("agrees with the research validator, which flags off-format titles", () => {
    for (const title of [
      "6 Fades Every Barber Should Know",
      "569 Texas Barbershops Have a Perfect 5.0",
      "The Truth About Rent Credit Reporting",
      "12 Things", "13 Things", "1 Thing", "2 Ways",
    ]) {
      expect(isWinningTitleShape(title)).toBe(isListicleTitle(title));
      // The validator flags exactly what the renderer sends to the grid.
      expect(isWinningTitleShape(title)).toBe(videoTypeFor({ title }).id === "lookbook");
    }
  });

  /*
   * THE RENAME'S ONE REAL RISK. A row stored before the rename says "news",
   * and an ignored value derives — which for that row means a News Desk gets
   * priced and rendered as a Hot Take. The alias map is what stops a recorded
   * rename being treated like a typo.
   */
  it("still resolves the ids the formats used to have", () => {
    expect(videoTypeFor({ title: "x", video_type: "news" }).id).toBe("newsdesk");
    expect(videoTypeFor({ title: "x", video_type: "avatar" }).id).toBe("hottake");
    expect(videoTypeFor({ title: "x", video_type: "data" }).id).toBe("figure");
    expect(videoTypeFor({ title: "x", video_type: "grid" }).id).toBe("lookbook");
    // Every alias points at a type that actually exists.
    for (const [was, now] of Object.entries(LEGACY_VIDEO_TYPE_IDS)) {
      expect(VIDEO_TYPE_IDS).toContain(now);
      expect(VIDEO_TYPE_IDS).not.toContain(was);
    }
    // An unknown value is still ignored and derived, alias map or not.
    expect(videoTypeFor({ title: "6 Fades", video_type: "reel-v2" }).id).toBe("lookbook");
  });

  it("prices the types the way the button promises", () => {
    expect(VIDEO_TYPES.lookbook.costUsd).toBe(0);
    expect(VIDEO_TYPES.figure.costUsd).toBe(0);
    expect(VIDEO_TYPES.figure.costLabel).toBe("free");
    expect(VIDEO_TYPES.lookbook.costLabel).toBe("free");
    expect(VIDEO_TYPES.hottake.costUsd).toBeCloseTo(1.16, 2);
    expect(VIDEO_TYPES.hottake.costLabel).toBe("~$1.16");
    /*
     * A News Desk is 90 seconds but only ~34 of them are bought. Pricing it
     * at its RUNTIME would quote $3.47 for a $1.31 video and make the cheaper
     * format look like the expensive one.
     */
    expect(VIDEO_TYPES.newsdesk.costUsd).toBeCloseTo(1.31, 2);
    expect(VIDEO_TYPES.newsdesk.costLabel).toBe("~$1.31");
    expect(VIDEO_TYPES.newsdesk.seconds).toBe(90);
    // A free label must never sit on a type that spends money.
    for (const t of Object.values(VIDEO_TYPES)) {
      expect(t.costLabel === "free").toBe(t.costUsd === 0);
    }
  });
});

describe("the renderer honours the shared rule", () => {
  const src = readFileSync("scripts/render_queued.js", "utf8");

  /*
   * THE DRIFT THIS CATCHES. The rule lived in two places once — a regex here
   * and an identical one in the script. If the script ever grows its own copy
   * again, the board can label a card "free" while the renderer bills $1.16.
   */
  it("does not carry its own copy of the title rule", () => {
    expect(src).toContain('require("../lib/video-type")');
    expect(src).not.toMatch(/\/\^\(\\d\{1,2\}\)/);
    expect(src).not.toMatch(/function looksLikeListicle/);
  });

  /*
   * NO FALLBACK. The old script chose the renderer by whether a per-card image
   * happened to exist on disk, so a missing file silently meant "bill for the
   * avatar instead". Routing is the title now, and a failure has to stay a
   * failure.
   */
  it("routes on the card, not on what is sitting on disk", () => {
    expect(src).not.toMatch(/gridImageFor/);
    expect(src).not.toMatch(/existsSync\(.*GRID_INBOX/);
    expect(src).toContain("videoTypeFor");
  });

  /*
   * THE SUBSTITUTION THIS STOPS. Every branch in the renderer ends in an avatar
   * or a template, so a type it does not handle falls through and buys a
   * talking head. That is exactly what the video_type column was added to
   * prevent — one type later.
   */
  it("refuses a News Desk card rather than rendering something else", () => {
    expect(src).toContain('kind.id === "newsdesk"');
    expect(src).toContain("render_news_short.js");
  });

  it("uses the one seed grid", () => {
    expect(src).toContain("SEED_GRID");
    expect(SEED_GRID).toBe("scripts/instagram/source.jpg");
  });
});
