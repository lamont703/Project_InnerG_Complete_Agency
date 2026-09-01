import { describe, expect, it } from "vitest";
import core from "./agent.js";
const { buildPrompt, validatePlan, RULES } = core;

/** A stand-in transcript, including a word the model misheard. */
const WORDS = [
  ["Most", 8.4], ["booth", 8.7], ["renters", 9.0], ["never", 9.4], ["separated", 9.7],
  ["clippers", 13.3], ["and", 13.7], ["gas", 13.9],
  ["a", 18.4], ["pile", 18.6], ["of", 18.9], ["receipts", 19.1],
  ["the", 21.8], ["lender", 22.1], ["doesnt", 22.5], ["see", 22.8],
  ["a", 34.1], ["business", 34.4], ["account", 34.8], ["takes", 35.2],
  ["your", 27.0], ["first", 27.4], ["share", 27.8],
].map(([word, start]) => ({ word: word as string, start: start as number, end: (start as number) + 0.3 }));

const TRACKS = ["Intellect - Yung Logos.mp3", "Coast - Anno Domini Beats.mp3"];
const CTX = { words: WORDS, duration: 41.3, tracks: TRACKS };

describe("validatePlan", () => {
  /*
   * The failure this is built for: the model quotes the written script, or
   * invents a phrase. Either way the anchor never resolves, and without this
   * check the cutaway vanishes at render time with nothing said about it.
   */
  it("refuses an anchor that is not in the audio", () => {
    const { cutaways, rejected } = validatePlan({
      cutaways: [{ anchor: "a completely invented sentence", query: "barbershop", hold: 2.6 }],
    }, CTX);
    expect(cutaways).toHaveLength(0);
    expect(rejected[0].why).toMatch(/not in the audio/);
  });

  /* The face is the hook; cutting away from it throws away the deciding moment. */
  it("refuses a cutaway inside the opening hook", () => {
    const words = [{ word: "hello", start: 1.0, end: 1.4 }, { word: "there", start: 1.4, end: 1.8 }];
    const { rejected } = validatePlan(
      { cutaways: [{ anchor: "hello there", query: "barbershop", hold: 2.6 }] },
      { ...CTX, words },
    );
    expect(rejected[0].why).toMatch(/inside the hook/);
  });

  /*
   * "receipts" and "the lender" land 3.4s apart in the real script; both at a
   * 2.8s hold collide and the planner drops one. Caught here instead.
   */
  it("keeps the earlier of two anchors that are too close together", () => {
    const { cutaways, rejected } = validatePlan({
      cutaways: [
        { anchor: "a pile of receipts", query: "receipts", hold: 2.8 },
        { anchor: "the lender doesnt see", query: "counting money", hold: 2.8 },
      ],
    }, CTX);
    expect(cutaways).toHaveLength(1);
    expect(cutaways[0].query).toBe("receipts");
    expect(rejected[0].why).toMatch(/too close/);
  });

  it("stops adding cutaways once the speaker would stop being present", () => {
    const many = [
      { anchor: "Most booth renters never", query: "a", hold: 3.2 },
      { anchor: "clippers and gas", query: "b", hold: 3.2 },
      { anchor: "a pile of receipts", query: "c", hold: 3.2 },
      { anchor: "a business account takes", query: "d", hold: 3.2 },
    ];
    const { cutaways } = validatePlan({ cutaways: many }, { ...CTX, duration: 20 });
    const covered = cutaways.reduce((t, c) => t + c.hold, 0);
    expect(covered / 20).toBeLessThanOrEqual(RULES.maxCoverage);
  });

  it("clamps a hold the model made up", () => {
    const { cutaways } = validatePlan({
      cutaways: [{ anchor: "clippers and gas", query: "clippers", hold: 90 }],
    }, CTX);
    expect(cutaways[0].hold).toBe(RULES.maxHold);
  });

  it("scores a whoosh to a whip and leaves a dissolve dry", () => {
    const { cutaways } = validatePlan({
      cutaways: [
        { anchor: "clippers and gas", query: "clippers", transition: "whip-up" },
        { anchor: "a business account takes", query: "paperwork", transition: "dissolve" },
      ],
    }, CTX);
    expect(cutaways[0].sfx).toBe("whoosh");
    expect(cutaways[1].sfx).toBeUndefined();
  });

  it("falls back to a dissolve for a transition it invented", () => {
    const { cutaways } = validatePlan({
      cutaways: [{ anchor: "clippers and gas", query: "clippers", transition: "barrel-roll" }],
    }, CTX);
    expect(cutaways[0].transition).toBe("dissolve");
  });

  /* A track that is not in the folder cannot be laid under anything. */
  it("only accepts a music track that actually exists", () => {
    expect(validatePlan({ cutaways: [], music: "Intellect - Yung Logos.mp3" }, CTX).music)
      .toBe("Intellect - Yung Logos.mp3");
    expect(validatePlan({ cutaways: [], music: "Something Invented.mp3" }, CTX).music).toBeNull();
  });

  it("orders the plan by when each anchor is spoken", () => {
    const { cutaways } = validatePlan({
      cutaways: [
        { anchor: "a business account takes", query: "c", hold: 2 },
        { anchor: "Most booth renters never", query: "a", hold: 2 },
        { anchor: "a pile of receipts", query: "b", hold: 2 },
      ],
    }, CTX);
    expect(cutaways.map((c) => c.query)).toEqual(["a", "b", "c"]);
  });

  it("survives whatever the model returns", () => {
    for (const junk of [null, undefined, {}, { cutaways: "nope" }, { cutaways: [null, 5] }]) {
      const r = validatePlan(junk as never, CTX);
      expect(r.cutaways).toEqual([]);
    }
  });
});

describe("buildPrompt", () => {
  /*
   * The instruction that matters most: the transcript is what was HEARD, and an
   * anchor copied from the written script may not exist in the audio at all.
   */
  it("shows the transcript and tells it to copy anchors from there", () => {
    const p = buildPrompt({ script: "the written words", words: WORDS, joins: [8.4], duration: 41.3, tracks: TRACKS });
    expect(p).toContain("copy anchors from HERE");
    expect(p).toContain("clippers and gas");
    expect(p).toContain("the written words");
  });

  it("warns off abstractions, which stock search cannot film", () => {
    const p = buildPrompt({ script: "x", words: WORDS, joins: [], duration: 41.3, tracks: TRACKS });
    expect(p).toMatch(/PHYSICAL, FILMABLE/);
  });

  it("offers only the tracks that exist", () => {
    const p = buildPrompt({ script: "x", words: WORDS, joins: [], duration: 41.3, tracks: TRACKS });
    expect(p).toContain("Intellect - Yung Logos.mp3");
  });
});
