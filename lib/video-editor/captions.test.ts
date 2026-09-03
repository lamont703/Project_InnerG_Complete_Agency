import { describe, expect, it } from "vitest";
import core from "./captions.js";
const { assTime, chunkWords, buildAss, sanitize } = core;

const W = (word: string, start: number, end: number) => ({ word, start, end });

describe("assTime", () => {
  it("formats as H:MM:SS.cc", () => {
    expect(assTime(0)).toBe("0:00:00.00");
    expect(assTime(61.5)).toBe("0:01:01.50");
    expect(assTime(3661.234)).toBe("1:01:01.23");
  });

  it("never emits a negative time", () => {
    expect(assTime(-5)).toBe("0:00:00.00");
  });
});

describe("chunkWords", () => {
  it("groups a few words at a time rather than a line of prose", () => {
    const cues = chunkWords([
      W("So", 0, 0.2), W("you", 0.2, 0.4), W("got", 0.4, 0.6),
      W("the", 0.6, 0.8), W("record", 0.8, 1.2),
    ], { maxWords: 3 });
    expect(cues).toHaveLength(2);
    expect(cues[0].text).toBe("So you got");
    expect(cues[1].text).toBe("the record");
  });

  /*
   * Words either side of a silence are different thoughts. Bridging them leaves
   * the caption on screen through the gap and then catching up in a rush.
   */
  it("breaks a cue on a pause", () => {
    const cues = chunkWords([W("worthless", 0, 0.5), W("It's", 2.0, 2.3)], { gap: 0.45 });
    expect(cues).toHaveLength(2);
  });

  it("carries the first word's start and the last word's end", () => {
    const [cue] = chunkWords([W("a", 5, 5.2), W("pile", 5.2, 5.6)], { maxWords: 4 });
    expect(cue.start).toBe(5);
    expect(cue.end).toBe(5.6);
  });

  it("breaks on length so a cue stays glanceable", () => {
    const cues = chunkWords([W("extraordinarily", 0, 1), W("complicated", 1, 2)], { maxChars: 20 });
    expect(cues).toHaveLength(2);
  });

  it("survives empty and malformed input", () => {
    expect(chunkWords([])).toEqual([]);
    expect(chunkWords(null as never)).toEqual([]);
  });
});

describe("buildAss", () => {
  const cues = [{ start: 0.5, end: 1.2, text: "So you got" }];

  /*
   * BorderStyle 1 outlines the glyphs. BorderStyle 3 paints an opaque box
   * behind them, which is the look this is specifically avoiding.
   */
  /**
   * Read a style field BY NAME, off the Format line the file declares.
   * Hardcoding an index gets this wrong — the first attempt stripped the Name
   * field and then counted as though it had not, and read Outline while
   * believing it was reading BorderStyle. The file states its own field order;
   * using it is both correct and self-documenting.
   */
  function styleField(ass: string, name: string): string {
    const fmt = ass.split("\n").find((l) => l.startsWith("Format: Name, Fontname"))!;
    const names = fmt.replace("Format:", "").split(",").map((x) => x.trim());
    const style = ass.split("\n").find((l) => l.startsWith("Style:"))!;
    const values = style.replace("Style:", "").split(",").map((x) => x.trim());
    return values[names.indexOf(name)];
  }

  it("outlines the letters instead of drawing a box", () => {
    const ass = buildAss(cues);
    expect(styleField(ass, "BorderStyle")).toBe("1");
    expect(styleField(ass, "Shadow")).toBe("0");
    expect(styleField(ass, "Outline")).toBe("6");
  });

  it("puts the caption in the lower third, bottom-centre", () => {
    expect(styleField(buildAss(cues), "Alignment")).toBe("2");
    expect(styleField(buildAss(cues), "MarginV")).toBe("420");
  });

  it("is white with a black outline", () => {
    const ass = buildAss(cues);
    expect(ass).toContain("&H00FFFFFF");   // fill
    expect(ass).toContain("&H00000000");   // outline
  });

  /*
   * Without this the outline is measured in output pixels rather than PlayRes
   * units, so it renders hairline-thin and the captions read as unoutlined
   * white text — invisible on exactly the light shots the outline is for.
   */
  it("scales the outline with the canvas", () => {
    expect(buildAss(cues)).toContain("ScaledBorderAndShadow: yes");
  });

  it("uppercases by default and can be told not to", () => {
    expect(buildAss(cues)).toContain("SO YOU GOT");
    expect(buildAss(cues, { upper: false })).toContain("So you got");
  });

  /*
   * The guard for the leading-comma bug: declaring nine fields while writing
   * ten does not error, it just slides the text over by one and every caption
   * renders with a stray comma in front of it.
   */
  it("writes exactly as many Dialogue fields as the Format declares", () => {
    const ass = buildAss(cues);
    const fmt = ass.split("\n").find((l) => l.startsWith("Format: Layer"))!;
    const declared = fmt.replace("Format:", "").split(",").length;
    const line = ass.split("\n").find((l) => l.startsWith("Dialogue:"))!;
    const written = line.replace("Dialogue:", "").split(",").length;
    expect(written).toBe(declared);
    expect(fmt).toContain("MarginV");
  });

  /*
   * Parsed the way libass parses it: split on the first nine commas, and
   * everything after is Text. A naive "does it contain ,," check fails here for
   * the wrong reason — the doubled comma is a legitimately empty Effect field.
   */
  it("does not put a stray comma in front of the text", () => {
    const line = buildAss(cues).split("\n").find((l) => l.startsWith("Dialogue:"))!;
    const body = line.replace("Dialogue: ", "");
    const parts = body.split(",");
    const text = parts.slice(9).join(",");
    expect(text).toBe("SO YOU GOT");
    expect(text.startsWith(",")).toBe(false);
  });

  it("writes one Dialogue line per cue, timed", () => {
    const ass = buildAss([
      { start: 0, end: 1, text: "one" },
      { start: 1, end: 2, text: "two" },
    ]);
    const lines = ass.split("\n").filter((l) => l.startsWith("Dialogue:"));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("0:00:00.00,0:00:01.00");
  });
});

describe("sanitize", () => {
  /* Braces are ASS override syntax: {\an8} would move the cue, not print. */
  it("strips braces so text cannot become a command", () => {
    expect(sanitize("hello {\\an8} there")).toBe("hello \\an8 there");
  });

  it("flattens newlines", () => {
    expect(sanitize("two\nlines")).toBe("two lines");
  });
});
