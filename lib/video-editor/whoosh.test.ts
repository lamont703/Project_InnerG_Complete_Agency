import { describe, expect, it } from "vitest";
import core from "./whoosh.js";
const { source, shape, mix } = core;

describe("source", () => {
  it("makes noise for a whoosh and a tone for a thud", () => {
    expect(source({ type: "whoosh", seconds: 0.4 })).toContain("anoisesrc");
    expect(source({ type: "thud" })).toContain("sine=frequency=90");
  });
});

describe("shape", () => {
  /*
   * adelay given ONE value on a stereo stream delays only the left channel, so
   * the sound arrives twice, milliseconds apart. It reads as a broken encode.
   */
  it("delays every channel, not just the left", () => {
    const { chain } = shape(1, { at: 8.39 });
    expect(chain).toContain("adelay=8390|8390");
  });

  it("places the sting at the cutaway's moment", () => {
    expect(shape(1, { at: 0 }).chain).toContain("adelay=0|0");
    expect(shape(2, { at: 13.333 }).chain).toContain("adelay=13333|13333");
  });

  it("names a label the mixer can find", () => {
    expect(shape(3, { at: 1 }).label).toBe("sfx3");
    expect(shape(3, { at: 1 }).chain).toContain("[sfx3]");
  });

  it("shapes a riser to land on the cut rather than wash over it", () => {
    const { chain } = shape(1, { at: 5, type: "riser", seconds: 1 });
    expect(chain).toContain("afade=t=in:st=0:d=0.850");
    expect(chain).toContain("afade=t=out:st=0.850");
  });

  it("keeps the sting well under the voice by default", () => {
    expect(shape(1, { at: 1 }).chain).toContain("volume=0.550");
  });
});

describe("mix", () => {
  /*
   * amix divides by the number of inputs by default, so four stings drop the
   * speaker by up to 12dB — the exact opposite of seasoning.
   */
  it("does not duck the voice when stings are added", () => {
    expect(mix(["sfx1", "sfx2"])).toContain("normalize=0");
  });

  it("counts the base audio as an input", () => {
    expect(mix(["sfx1", "sfx2"])).toContain("amix=inputs=3");
    expect(mix(["sfx1"])).toContain("[0:a][sfx1]");
  });

  it("returns nothing to do when there are no stings", () => {
    expect(mix([])).toBeNull();
  });
});
