/**
 * Finding WHEN a phrase is actually said, so an edit can be aimed at a word
 * instead of at a guess.
 *
 * THE FAILURE THIS FIXES, measured rather than imagined. The first booth-rent
 * edit placed its cutaways from timings estimated off the script — words per
 * second, times position in the page. Every one landed 1 to 6 seconds early, so
 * the "receipts" clip played over "the lender doesn't see a business" and the
 * "bank loan" clip played over "since your first chair". The viewer's verdict
 * was that the b-roll "felt random", which is precisely what illustrating the
 * NEXT sentence looks like.
 *
 * WHY MATCHING MUST BE FUZZY. The transcript is what the model HEARD, not what
 * was written. On this clip alone Whisper produced "your businesses" for "your
 * business's", "your first share" for "your first chair", and "and ein is free"
 * for "An EIN is free". An exact search finds none of those, and a tool that
 * silently finds nothing is worse than one that guesses — it drops the cutaway
 * and the edit quietly loses a beat.
 */

/** Lowercase, strip punctuation, split. Numbers and words only. */
function tokenize(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/'/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * How much of `phrase` appears, IN ORDER, inside `window`.
 *
 * In-order matters: "business account" and "account business" are different
 * claims about what is being said, and a bag-of-words score treats them as the
 * same. Skips are allowed on both sides so a dropped or misheard word costs one
 * token rather than the whole match.
 */
function orderedOverlap(phraseTokens, windowTokens) {
  let i = 0;
  let matched = 0;
  for (const w of windowTokens) {
    if (i < phraseTokens.length && w === phraseTokens[i]) { matched++; i++; }
  }
  // Second pass allowing one skip in the phrase, which is what a misheard word
  // looks like: "first share" against "first chair" should still score 0.5.
  if (matched < phraseTokens.length) {
    let j = 0, m2 = 0, skips = 0;
    for (const w of windowTokens) {
      if (j >= phraseTokens.length) break;
      if (w === phraseTokens[j]) { m2++; j++; }
      else if (skips < Math.ceil(phraseTokens.length / 3)) {
        // tolerate a mismatch by advancing the phrase pointer once
        if (j + 1 < phraseTokens.length && w === phraseTokens[j + 1]) { j += 2; m2++; skips++; }
      }
    }
    matched = Math.max(matched, m2);
  }
  return matched;
}

/**
 * Where in the audio a phrase is spoken.
 *
 * @param {{word:string,start:number,end:number}[]} words Word-level transcript.
 * @param {string} phrase What to look for.
 * @param {{minScore?:number}} [opts]
 * @returns {{start:number,end:number,score:number,heard:string}|null}
 */
function findPhrase(words, phrase, opts = {}) {
  const minScore = opts.minScore ?? 0.6;
  const want = tokenize(phrase);
  if (!want.length || !Array.isArray(words) || !words.length) return null;

  const norm = words.map((w) => ({ ...w, t: tokenize(w.word)[0] ?? "" }));

  let best = null;
  // A window may run longer than the phrase, because the transcript can carry
  // filler the script does not. Half again, plus two, covers what was observed.
  const maxLen = Math.ceil(want.length * 1.5) + 2;

  for (let i = 0; i < norm.length; i++) {
    for (let len = Math.max(1, want.length - 1); len <= maxLen && i + len <= norm.length; len++) {
      const win = norm.slice(i, i + len);
      const score = orderedOverlap(want, win.map((w) => w.t)) / want.length;
      if (score < minScore) continue;
      /*
       * Tie-break on the TIGHTEST window, not the first. A loose window that
       * happens to contain the words scores the same while starting well before
       * the phrase is spoken — which reintroduces the drift this exists to kill.
       */
      if (!best || score > best.score || (score === best.score && len < best.len)) {
        best = { start: win[0].start, end: win[win.length - 1].end, score, len,
                 heard: win.map((w) => w.word).join(" ") };
      }
    }
  }
  if (!best) return null;
  return { start: best.start, end: best.end, score: Number(best.score.toFixed(3)), heard: best.heard };
}

module.exports = { tokenize, findPhrase, orderedOverlap };
