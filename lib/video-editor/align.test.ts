import { describe, expect, it } from "vitest";
import core from "./align.js";
const { findPhrase, tokenize } = core;

/** A slice of the real transcript, including the words Whisper got wrong. */
const WORDS = [
  { word: "just", start: 17.0, end: 17.2 },
  { word: "you", start: 17.2, end: 17.4 },
  { word: "and", start: 17.4, end: 17.6 },
  { word: "a", start: 17.6, end: 17.7 },
  { word: "pile", start: 17.7, end: 18.0 },
  { word: "of", start: 18.0, end: 18.1 },
  { word: "receipts", start: 18.1, end: 18.7 },
  { word: "So", start: 19.9, end: 20.1 },
  { word: "when", start: 20.1, end: 20.3 },
  { word: "you", start: 20.3, end: 20.4 },
  { word: "go", start: 20.4, end: 20.6 },
  { word: "to", start: 20.6, end: 20.7 },
  { word: "open", start: 20.7, end: 21.0 },
  { word: "your", start: 21.0, end: 21.2 },
  { word: "own", start: 21.2, end: 21.4 },
  { word: "shop,", start: 21.4, end: 21.9 },
  { word: "since", start: 27.0, end: 27.3 },
  { word: "your", start: 27.3, end: 27.5 },
  { word: "first", start: 27.5, end: 27.8 },
  { word: "share", start: 27.8, end: 28.2 },
];

describe("findPhrase", () => {
  it("locates a phrase and returns when it is actually spoken", () => {
    const hit = findPhrase(WORDS, "a pile of receipts");
    expect(hit).not.toBeNull();
    expect(hit!.start).toBeCloseTo(17.6, 1);
    expect(hit!.score).toBe(1);
  });

  it("ignores punctuation and case", () => {
    expect(findPhrase(WORDS, "open your own SHOP!")!.start).toBeCloseTo(20.7, 1);
  });

  /*
   * The transcript is what the model HEARD. It rendered "chair" as "share";
   * an exact search finds nothing and the cutaway is silently dropped.
   */
  it("still finds a phrase the model misheard", () => {
    const hit = findPhrase(WORDS, "since your first chair");
    expect(hit).not.toBeNull();
    expect(hit!.start).toBeCloseTo(27.0, 1);
    expect(hit!.score).toBeGreaterThanOrEqual(0.6);
    expect(hit!.score).toBeLessThan(1);
    /*
     * It matches the three words it CAN and stops there, because the tie-break
     * prefers the tighter window and including the misheard word raises no
     * score. That is the wanted behaviour: the START is right, which is all a
     * cutaway needs, and the partial score is an honest signal that one word
     * did not line up.
     */
    expect(hit!.heard).toBe("since your first");
  });

  it("returns null rather than a bad guess when the phrase is not there", () => {
    expect(findPhrase(WORDS, "cosmetology license renewal fee")).toBeNull();
  });

  /*
   * A loose window containing the words scores the same as a tight one while
   * starting well before the phrase is spoken — which is the drift the whole
   * module exists to remove.
   */
  it("prefers the tightest window when scores tie", () => {
    const hit = findPhrase(WORDS, "pile of receipts")!;
    expect(hit.start).toBeCloseTo(17.7, 1);
    expect(hit.end).toBeCloseTo(18.7, 1);
  });

  it("handles empty input without throwing", () => {
    expect(findPhrase([], "anything")).toBeNull();
    expect(findPhrase(WORDS, "")).toBeNull();
  });
});

describe("tokenize", () => {
  it("strips punctuation and apostrophes so script and transcript agree", () => {
    expect(tokenize("your business's, name!")).toEqual(["your", "businesss", "name"]);
  });
});
