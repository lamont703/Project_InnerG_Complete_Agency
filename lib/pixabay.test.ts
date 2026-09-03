import { describe, expect, it } from "vitest";
import core from "./pixabay.js";
const { pickBest } = core;

const hit = (id: number, tags: string, height = 1080, duration = 20) => ({
  id, tags, duration,
  videos: { large: { url: `u${id}`, width: (height * 9) / 16, height } },
});

describe("pickBest", () => {
  /*
   * The bug: `tags.includes("man")` is true for "human", "woman", "romantic"
   * and "germany". The query "man signing paper" returned a muddy creek.
   */
  it("matches whole tag words, not substrings", () => {
    const hits = [hit(1, "creek, water, romantic, germany, nature", 2160)];
    expect(pickBest(hits, { query: "man signing paper", seconds: 3 })).toBeNull();
  });

  it("finds the clip that genuinely shares vocabulary", () => {
    const hits = [
      hit(1, "creek, water, romantic, nature", 2160),
      hit(2, "paper, signing, contract, desk", 1080),
    ];
    expect(pickBest(hits, { query: "signing paper", seconds: 3 })!.hit.id).toBe(2);
  });

  /*
   * Generic words are on almost every clip of a human being, so a match on them
   * alone is a coincidence rather than an answer.
   */
  it("will not select on a generic word alone", () => {
    const hits = [hit(1, "man, portrait, smile, studio", 2160)];
    expect(pickBest(hits, { query: "man counting money", seconds: 3 })).toBeNull();
  });

  it("prefers relevance over resolution", () => {
    const hits = [
      hit(1, "barbershop, barber, haircut", 1080),
      hit(2, "barbershop, gold, luxury", 2160),
    ];
    // Both match "barbershop"; the 4K one wins only because nothing separates them.
    expect(pickBest(hits, { query: "barbershop haircut", seconds: 3 })!.hit.id).toBe(1);
  });

  it("skips a clip too short to cover the cutaway", () => {
    expect(pickBest([hit(1, "barbershop", 1080, 2)], { query: "barbershop", seconds: 3 })).toBeNull();
  });

  it("returns null rather than a bad answer when nothing fits", () => {
    expect(pickBest([], { query: "barbershop", seconds: 3 })).toBeNull();
  });
});

describe("a lone word match is a coincidence", () => {
  /* "man signing paper" matched a clip tagged "paper ship" — a paper boat. */
  it("refuses a clip matching only one word of a multi-word query", () => {
    const hits = [hit(1, "flow, riverbank, meadow, paper, ship", 2160)];
    expect(pickBest(hits, { query: "signing paper", seconds: 3 })).toBeNull();
  });

  it("accepts it once a majority of the words land", () => {
    const hits = [hit(1, "signing, paper, contract, pen", 1080)];
    expect(pickBest(hits, { query: "signing paper", seconds: 3 })!.hit.id).toBe(1);
  });

  it("still allows a single-word query to match on that word", () => {
    const hits = [hit(1, "barbershop, chair, mirror", 1080)];
    expect(pickBest(hits, { query: "barbershop", seconds: 3 })!.hit.id).toBe(1);
  });
});
