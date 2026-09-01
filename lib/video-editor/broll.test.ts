import { describe, expect, it } from "vitest";
import core from "./broll.js";
const { planCutaways, coverage, LEAD_IN } = core;

describe("planCutaways", () => {
  it("pulls a cutaway earlier so the join happens behind it", () => {
    const { cutaways } = planCutaways([{ at: 10, seconds: 2, query: "clippers" }], { duration: 40 });
    expect(cutaways[0].at).toBe(10 - LEAD_IN);
  });

  /*
   * The caller names a moment in the script; the joins are where the edit
   * actually needs covering. A few frames off the word is invisible. A few
   * frames off the cut is the artefact.
   */
  it("snaps to a nearby join rather than the requested moment", () => {
    const { cutaways } = planCutaways(
      [{ at: 15.4, seconds: 2, query: "clippers" }],
      { duration: 40, joins: [15.06], snap: 1.0 },
    );
    expect(cutaways[0].at).toBe(15.06 - LEAD_IN);
  });

  it("leaves a distant request where it was asked for", () => {
    const { cutaways } = planCutaways(
      [{ at: 30, seconds: 2, query: "bank" }],
      { duration: 40, joins: [15.06], snap: 1.0 },
    );
    expect(cutaways[0].at).toBe(30 - LEAD_IN);
  });

  it("drops an overlapping cutaway instead of quietly trimming it", () => {
    const { cutaways, dropped } = planCutaways(
      [
        { at: 10, seconds: 3, query: "a" },
        { at: 11, seconds: 3, query: "b" },
      ],
      { duration: 40 },
    );
    expect(cutaways).toHaveLength(1);
    expect(cutaways[0].query).toBe("a");
    expect(dropped[0].why).toMatch(/overlaps/);
  });

  it("clamps to the clip and drops what is left too short to see", () => {
    const { cutaways, dropped } = planCutaways(
      [{ at: 39.9, seconds: 4, query: "late" }],
      { duration: 40 },
    );
    expect(cutaways).toHaveLength(0);
    expect(dropped[0].why).toMatch(/past the end/);
  });

  it("refuses a cutaway with nothing to search for", () => {
    const { dropped } = planCutaways([{ at: 5, seconds: 2, query: "" }], { duration: 40 });
    expect(dropped[0].why).toBe("no search query");
  });

  it("orders the plan by time regardless of how it was written", () => {
    const { cutaways } = planCutaways(
      [
        { at: 30, seconds: 2, query: "c" },
        { at: 10, seconds: 2, query: "a" },
        { at: 20, seconds: 2, query: "b" },
      ],
      { duration: 40 },
    );
    expect(cutaways.map((c) => c.query)).toEqual(["a", "b", "c"]);
  });
});

describe("coverage", () => {
  it("reports the share of the edit covered by other footage", () => {
    expect(coverage([{ at: 0, seconds: 4, query: "x" }], 40)).toBeCloseTo(0.1, 5);
    expect(coverage([], 40)).toBe(0);
  });
});

describe("resolveAnchors", () => {
  const WORDS = [
    { word: "just", start: 17.0, end: 17.2 },
    { word: "you", start: 17.2, end: 17.4 },
    { word: "and", start: 17.4, end: 17.6 },
    { word: "a", start: 17.6, end: 17.7 },
    { word: "pile", start: 17.7, end: 18.0 },
    { word: "of", start: 18.0, end: 18.1 },
    { word: "receipts", start: 18.1, end: 18.7 },
  ];

  it("turns a phrase into the moment it is spoken", () => {
    const { cutaways } = core.resolveAnchors(
      [{ anchor: "a pile of receipts", seconds: 2.5, query: "receipts" }], WORDS);
    expect(cutaways[0].at).toBeCloseTo(17.6, 1);
  });

  /*
   * Falling back to a requested `at` would reintroduce the guess this removes,
   * invisibly, on the one cutaway whose wording was wrong.
   */
  it("drops a cutaway whose anchor is not in the audio", () => {
    const { cutaways, dropped } = core.resolveAnchors(
      [{ anchor: "license renewal fee", at: 5, seconds: 2, query: "x" }], WORDS);
    expect(cutaways).toHaveLength(0);
    expect(dropped[0].why).toMatch(/anchor not found/);
  });

  it("leaves an explicit time alone when no anchor is given", () => {
    const { cutaways } = core.resolveAnchors([{ at: 5, seconds: 2, query: "x" }], WORDS);
    expect(cutaways[0].at).toBe(5);
  });
});
