/**
 * Burned-in captions from a word-level transcript.
 *
 * ASS, NOT drawtext. drawtext is the obvious reach and it is a trap here: every
 * cue is a separate filter, and the text goes inside a filter-graph string
 * where apostrophes, colons, commas and backslashes all need escaping. This
 * script says "Here's the mistake" and "It's in your name" — two apostrophes in
 * the first fifteen words. ASS puts the text in a FILE, so the graph carries a
 * filename and nothing needs escaping at all.
 *
 * BorderStyle=1 IS THE SETTING THAT MATTERS. It draws an outline around the
 * glyphs. BorderStyle=3 draws an opaque box behind them, which is the look we
 * are specifically not after — white letters, black outline, nothing else.
 *
 * ScaledBorderAndShadow: yes IS NOT OPTIONAL EITHER. Without it the outline is
 * measured in output pixels rather than PlayRes units, so a 6px outline
 * authored against a 1080x1920 canvas comes out hairline-thin on the actual
 * frame, and the captions read as unoutlined white text on a light background —
 * which is to say invisible on exactly the shots where the outline was the
 * point.
 */

/** ASS wants H:MM:SS.cc — centiseconds, and a single-digit hour. */
function assTime(seconds) {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${sec.toFixed(2).padStart(5, "0")}`;
}

/**
 * Group words into cues short enough to read at a glance.
 *
 * TWO TO FOUR WORDS, NOT A LINE OF PROSE. A Short is watched at arm's length on
 * a phone and the caption is competing with the speaker's face; a full sentence
 * asks the viewer to read instead of watch. The cue changes often enough that
 * the eye tracks it without ever settling into reading.
 *
 * A PAUSE BREAKS A CUE. Words either side of a silence belong to different
 * thoughts, and bridging them puts the caption out of step with the delivery —
 * the text sits on screen through the gap, then catches up in a rush.
 *
 * @param {{word:string,start:number,end:number}[]} words
 * @param {{maxWords?:number,maxChars?:number,maxSecs?:number,gap?:number}} [o]
 */
function chunkWords(words, o = {}) {
  const maxWords = o.maxWords ?? 4;
  const maxChars = o.maxChars ?? 22;
  const maxSecs = o.maxSecs ?? 1.4;
  const gap = o.gap ?? 0.45;

  const cues = [];
  let cur = null;
  for (const w of words ?? []) {
    if (!w || !w.word) continue;
    const text = cur ? `${cur.text} ${w.word}` : w.word;
    const tooLong = cur && (
      cur.words + 1 > maxWords ||
      text.length > maxChars ||
      w.end - cur.start > maxSecs ||
      w.start - cur.end > gap
    );
    if (!cur || tooLong) {
      if (cur) cues.push(cur);
      cur = { start: w.start, end: w.end, text: w.word, words: 1 };
    } else {
      cur.text = text; cur.end = w.end; cur.words++;
    }
  }
  if (cur) cues.push(cur);
  return cues.map(({ start, end, text }) => ({ start, end, text }));
}

/**
 * Braces are ASS's override syntax — {\an8} moves a cue to the top of the
 * frame. Text containing a literal brace would be swallowed as a command, so
 * they are stripped rather than escaped; nothing this pipeline says needs one.
 */
function sanitize(text) {
  return String(text ?? "").replace(/[{}]/g, "").replace(/\r?\n/g, " ").trim();
}

/**
 * @param {{start:number,end:number,text:string}[]} cues
 * @param {{fontName?:string,fontSize?:number,outline?:number,marginV?:number,
 *          upper?:boolean,playResX?:number,playResY?:number}} [s]
 */
function buildAss(cues, s = {}) {
  const font = s.fontName ?? "Arial Black";
  const size = s.fontSize ?? 92;
  const outline = s.outline ?? 6;
  const marginV = s.marginV ?? 420;
  const X = s.playResX ?? 1080;
  const Y = s.playResY ?? 1920;

  // &HAABBGGRR. White fill, black outline, both fully opaque.
  const WHITE = "&H00FFFFFF";
  const BLACK = "&H00000000";

  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${X}`,
    `PlayResY: ${Y}`,
    "WrapStyle: 2",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour," +
      " Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline," +
      " Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    // BorderStyle 1 = outline only. Shadow 0 = no drop shadow. Alignment 2 =
    // bottom centre, lifted off the floor by MarginV.
    `Style: Cap,${font},${size},${WHITE},${WHITE},${BLACK},${BLACK},` +
      `-1,0,0,0,100,100,0,0,1,${outline},0,2,60,60,${marginV},1`,
    "",
    "[Events]",
    /*
     * MarginV BELONGS IN THIS LIST. ASS v4+ Dialogue carries ten fields —
     * Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text —
     * and the widely-copied Format line omits MarginV because SSA v4 did.
     * Declaring nine while writing ten does not error: libass takes everything
     * from the ninth comma on as the text, so EVERY caption renders with a
     * leading comma. ",BOOTH RENT DOCUMENTED." Only visible by looking at a
     * frame.
     */
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  const lines = (cues ?? []).map((c) => {
    const t = sanitize(c.text);
    return `Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Cap,,0,0,0,,${s.upper === false ? t : t.toUpperCase()}`;
  });

  return [...header, ...lines].join("\n") + "\n";
}

module.exports = { assTime, chunkWords, buildAss, sanitize };
