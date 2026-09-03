import { describe, it, expect } from "vitest";
import { keepRanges, normaliseCuts, selectFilter, totalDuration, formatTime, parseTime } from "./ranges";

describe("keepRanges", () => {
  it("keeps what is left either side of one cut", () => {
    expect(keepRanges([{ start: 10, end: 20 }], 60))
      .toEqual([{ start: 0, end: 10 }, { start: 20, end: 60 }]);
  });

  it("handles a cut at the very start", () => {
    expect(keepRanges([{ start: 0, end: 5 }], 30)).toEqual([{ start: 5, end: 30 }]);
  });

  it("handles a cut running to the end", () => {
    expect(keepRanges([{ start: 25, end: 30 }], 30)).toEqual([{ start: 0, end: 25 }]);
  });

  it("merges overlapping cuts instead of producing a negative keep range", () => {
    // Two cuts entered separately that overlap. Without merging, the second
    // produces a keep range that ends before it starts, and ffmpeg renders a
    // clip with the wrong piece missing.
    expect(keepRanges([{ start: 10, end: 25 }, { start: 20, end: 30 }], 60))
      .toEqual([{ start: 0, end: 10 }, { start: 30, end: 60 }]);
  });

  it("merges cuts that touch exactly, leaving no zero-length keep", () => {
    // A zero-length keep becomes an empty segment in the filter and a stutter
    // in the output.
    const keep = keepRanges([{ start: 10, end: 20 }, { start: 20, end: 30 }], 60);
    expect(keep).toEqual([{ start: 0, end: 10 }, { start: 30, end: 60 }]);
    expect(keep.every((r) => r.end > r.start)).toBe(true);
  });

  it("accepts cuts entered out of order", () => {
    expect(keepRanges([{ start: 40, end: 50 }, { start: 10, end: 20 }], 60))
      .toEqual([{ start: 0, end: 10 }, { start: 20, end: 40 }, { start: 50, end: 60 }]);
  });

  it("clamps a cut that runs past the end of the clip", () => {
    expect(keepRanges([{ start: 50, end: 999 }], 60)).toEqual([{ start: 0, end: 50 }]);
  });

  it("accepts a range typed backwards", () => {
    // Somebody types the end time into the start box. Swapping is friendlier
    // than refusing, and unambiguous.
    expect(keepRanges([{ start: 20, end: 10 }], 60))
      .toEqual([{ start: 0, end: 10 }, { start: 20, end: 60 }]);
  });

  it("returns nothing when the cuts cover the whole clip", () => {
    // The caller has to catch this: rendering it would produce an empty file.
    expect(keepRanges([{ start: 0, end: 60 }], 60)).toEqual([]);
  });

  it("returns the whole clip when there are no cuts", () => {
    expect(keepRanges([], 60)).toEqual([{ start: 0, end: 60 }]);
  });

  it("ignores a zero-length cut", () => {
    expect(keepRanges([{ start: 10, end: 10 }], 60)).toEqual([{ start: 0, end: 60 }]);
  });
});

describe("normaliseCuts", () => {
  it("clamps a negative start rather than emitting one", () => {
    // A negative timestamp in the filter expression makes ffmpeg keep nothing.
    expect(normaliseCuts([{ start: -5, end: 10 }], 60)).toEqual([{ start: 0, end: 10 }]);
  });
});

describe("selectFilter", () => {
  it("builds one expression for every surviving range", () => {
    const f = selectFilter([{ start: 0, end: 10 }, { start: 20, end: 60 }])!;
    expect(f.video).toBe("select='between(t,0.000,10.000)+between(t,20.000,60.000)',setpts=N/FRAME_RATE/TB");
    expect(f.audio).toContain("aselect=");
    // Without restamping, the removed gaps leave frozen frames and silence.
    // N/SR/TB, not N/SR/STB. "STB" is not an ffmpeg constant and the render
    // dies on it — a typo that reads perfectly and fails every time.
    expect(f.audio).toContain("asetpts=N/SR/TB");
    expect(f.audio).not.toContain("STB");
  });

  it("returns null when nothing survives, rather than an empty filter", () => {
    expect(selectFilter([])).toBeNull();
  });
});

describe("totalDuration", () => {
  it("adds up what is left", () => {
    expect(totalDuration(keepRanges([{ start: 10, end: 20 }], 60))).toBe(50);
  });
});

describe("time parsing", () => {
  it("reads the shapes a person types", () => {
    expect(parseTime("83.5")).toBe(83.5);
    expect(parseTime("1:23.5")).toBe(83.5);
    expect(parseTime("00:01:23.5")).toBe(83.5);
  });
  it("refuses nonsense instead of guessing a number", () => {
    for (const v of ["", "abc", "1:2:3:4", "1::2", "-5"]) expect(parseTime(v)).toBeNull();
  });
  it("round-trips through formatTime", () => {
    expect(parseTime(formatTime(83.5))).toBeCloseTo(83.5, 1);
  });
});
