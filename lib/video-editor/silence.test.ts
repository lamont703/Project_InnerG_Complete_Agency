import { describe, expect, it } from "vitest";
import core from "./silence.js";
const { parseSilence, silenceCuts, span } = core;

const SAMPLE = `
frame=  120 fps=0.0 q=-1.0 size=N/A time=00:00:04.00 bitrate=N/A
[silencedetect @ 0x14f804e40] silence_start: 1.5
[silencedetect @ 0x14f804e40] silence_end: 3.2 | silence_duration: 1.7
[silencedetect @ 0x14f804e40] silence_start: 8.0
[silencedetect @ 0x14f804e40] silence_end: 8.4 | silence_duration: 0.4
`;

describe("parseSilence", () => {
  it("reads the pairs out of ffmpeg's noise", () => {
    expect(parseSilence(SAMPLE, 30)).toEqual([
      { start: 1.5, end: 3.2 },
      { start: 8.0, end: 8.4 },
    ]);
  });

  /*
   * THE CUT MOST WORTH MAKING. A clip that ends in silence never gets a closing
   * silence_end, so a pair-only parser drops the dead tail — which on an avatar
   * render is routinely a second or more of nothing after the last word.
   */
  it("closes a silence that runs to the end of the clip", () => {
    const s = parseSilence("[silencedetect] silence_start: 27.5\n", 30);
    expect(s).toEqual([{ start: 27.5, end: 30 }]);
  });

  it("ignores an unterminated silence when the duration is unknown", () => {
    expect(parseSilence("[silencedetect] silence_start: 27.5\n", NaN)).toEqual([]);
  });

  it("survives empty and malformed input", () => {
    expect(parseSilence("", 10)).toEqual([]);
    expect(parseSilence(null as unknown as string, 10)).toEqual([]);
    expect(parseSilence("silence_end: 4.0\n", 10)).toEqual([]);
  });
});

describe("silenceCuts", () => {
  it("gives padding back at both ends so words are not clipped", () => {
    const cuts = silenceCuts([{ start: 1.5, end: 3.2 }], { pad: 0.15, duration: 30 });
    expect(cuts).toEqual([{ start: 1.65, end: 3.05 }]);
  });

  it("drops a silence too short to be worth a cut", () => {
    // 0.4s of silence, 0.15s given back each end -> 0.1s, below the 0.2 floor.
    expect(silenceCuts([{ start: 8.0, end: 8.4 }], { pad: 0.15, minCut: 0.2, duration: 30 })).toEqual([]);
  });

  /*
   * No word to protect before the first sound or after the last, and padding
   * there leaves dead air exactly where it is most obvious.
   */
  it("does not pad the outside edge of the head or the tail", () => {
    const cuts = silenceCuts(
      [{ start: 0, end: 2 }, { start: 27.5, end: 30 }],
      { pad: 0.15, duration: 30 },
    );
    expect(cuts).toEqual([{ start: 0, end: 1.85 }, { start: 27.65, end: 30 }]);
  });

  it("adds up what it would remove", () => {
    expect(span([{ start: 0, end: 1.85 }, { start: 27.65, end: 30 }])).toBeCloseTo(4.2, 3);
  });
});
