import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isWinningTitleShape } from "@/lib/research/types";
import { SEED_GRID, VIDEO_TYPES, isListicleTitle, videoTypeFor } from "@/lib/video-type";

/**
 * The publisher board prices a card from videoTypeFor(). scripts/render_queued.js
 * renders it from the same call. These tests are what make that one call
 * trustworthy enough to put a dollar figure in front of an operator.
 */
describe("videoTypeFor", () => {
  it("is total — every card gets exactly one renderer, never none", () => {
    for (const title of [
      "6 Fades Every Barber Should Know",
      "The Truth About Rent Credit Reporting",
      "",
      "12 Things",
      "!!!",
    ]) {
      const t = videoTypeFor({ title });
      expect(["grid", "avatar"]).toContain(t.id);
    }
    // A card with no title at all still resolves rather than throwing.
    expect(videoTypeFor({}).id).toBe("avatar");
    expect(videoTypeFor({ title: null }).id).toBe("avatar");
  });

  it("sends numbered listicles to the grid and everything else to the avatar", () => {
    expect(videoTypeFor({ title: "6 Fades Every Barber Should Know" }).id).toBe("grid");
    expect(videoTypeFor({ title: "2 Ways to Fill Your Chair" }).id).toBe("grid");
    expect(videoTypeFor({ title: "The Truth About Rent Credit Reporting" }).id).toBe("avatar");
  });

  /*
   * The bound that stops a STATISTIC from being mistaken for a list. This exact
   * title ran on the channel and died at 123 views, which is the evidence the
   * 2-12 window is built on.
   */
  it("treats a large leading number as a statistic, not a list", () => {
    expect(isListicleTitle("569 Texas Barbershops Have a Perfect 5.0")).toBe(false);
    expect(videoTypeFor({ title: "569 Texas Barbershops Have a Perfect 5.0" }).id).toBe("avatar");
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
      expect(isWinningTitleShape(title)).toBe(videoTypeFor({ title }).id === "grid");
    }
  });

  it("prices the two types the way the button promises", () => {
    expect(VIDEO_TYPES.grid.costUsd).toBe(0);
    expect(VIDEO_TYPES.grid.costLabel).toBe("free");
    expect(VIDEO_TYPES.avatar.costUsd).toBeCloseTo(1.16, 2);
    expect(VIDEO_TYPES.avatar.costLabel).toBe("~$1.16");
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

  it("uses the one seed grid", () => {
    expect(src).toContain("SEED_GRID");
    expect(SEED_GRID).toBe("scripts/instagram/source.jpg");
  });
});
