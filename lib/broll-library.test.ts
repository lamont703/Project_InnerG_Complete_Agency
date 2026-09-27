import { describe, it, expect } from "vitest";
// CommonJS on purpose — the module is .js because CJS render scripts require it.
const { rankClips, STYLIZED_TAGS } = require("./broll-library.js");

/**
 * The property under test is the one that went wrong the moment two short films
 * entered the library.
 *
 * Before them every clip was filmed footage. The films added 52 clips of
 * hand-drawn cartoon line art, each correctly tagged `barbershop`, `barber`,
 * `chair`, `cape` — so a News Desk searching "barbershop chair" scored 2 on a
 * pencil sketch and would have put it in a video about a real news story.
 * Nothing would have errored; the render would have succeeded with the wrong
 * picture in it.
 */

const real = {
  id: "real-1",
  tags: ["barbershop", "chair", "empty", "night"],
  use_count: 0,
};
const drawn = {
  id: "drawn-1",
  tags: ["cartoon", "sketch", "line-art", "animation", "barbershop", "chair", "cape", "barber"],
  use_count: 0,
};

describe("rankClips — stylized footage is excluded by default", () => {
  it("does not return a cartoon to an ordinary search", () => {
    const hits = rankClips([real, drawn], { tags: ["barbershop", "chair"] });
    expect(hits.map((h: any) => h.id)).toEqual(["real-1"]);
  });

  it("returns nothing rather than a cartoon when only cartoons match", () => {
    // An empty result is the correct answer here. The caller then generates or
    // skips the cutaway; both beat showing the wrong picture.
    const hits = rankClips([drawn], { tags: ["barbershop", "chair"] });
    expect(hits).toEqual([]);
  });

  it("returns cartoons when the search names a stylized tag", () => {
    // Naming the tag IS the opt-in, so a caller after the film material does
    // not also have to know a flag exists.
    for (const tag of STYLIZED_TAGS) {
      const hits = rankClips([real, drawn], { tags: [tag, "barbershop"] });
      expect(hits.map((h: any) => h.id)).toContain("drawn-1");
    }
  });

  it("returns cartoons when asked explicitly", () => {
    const hits = rankClips([real, drawn], { tags: ["barbershop", "chair"], includeStylized: true });
    expect(hits.map((h: any) => h.id).sort()).toEqual(["drawn-1", "real-1"]);
  });
});

describe("rankClips — the behaviour that was already there", () => {
  it("ranks by how many distinct tags a clip matches", () => {
    const a = { id: "a", tags: ["barbershop", "chair"], use_count: 0 };
    const b = { id: "b", tags: ["barbershop", "chair", "empty"], use_count: 0 };
    const hits = rankClips([a, b], { tags: ["barbershop", "chair", "empty"] });
    expect(hits[0].id).toBe("b");
  });

  it("breaks ties toward the least-used clip, so one shot is not in every video", () => {
    const fresh = { id: "fresh", tags: ["barbershop"], use_count: 0 };
    const tired = { id: "tired", tags: ["barbershop"], use_count: 9 };
    expect(rankClips([tired, fresh], { tags: ["barbershop"] })[0].id).toBe("fresh");
  });

  it("refuses a single coincidental word when minScore is 2", () => {
    // The recorded failure: "phone gps map" matched a ringing desk phone on the
    // word "phone" alone, and it went out illustrating a map pin.
    const phone = { id: "phone", tags: ["phone", "ringing", "counter", "barbershop"], use_count: 0 };
    expect(rankClips([phone], { tags: ["phone", "gps", "map"], minScore: 2 })).toEqual([]);
    expect(rankClips([phone], { tags: ["phone", "gps", "map"] })).toHaveLength(1);
  });

  it("matches on prefixes so 'empty barber shop' still reaches [barbershop, empty]", () => {
    const shop = { id: "shop", tags: ["barbershop", "chair", "empty"], use_count: 0 };
    const hits = rankClips([shop], { tags: ["empty", "barber", "shop"], minScore: 2 });
    expect(hits).toHaveLength(1);
  });

  it("honours the id exclude list", () => {
    expect(rankClips([real], { tags: ["barbershop"], exclude: ["real-1"] })).toEqual([]);
  });
});
