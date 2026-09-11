/**
 * THE B-ROLL LIBRARY — what we already paid for, so we do not pay again.
 *
 * WHY PLAIN JAVASCRIPT IN A TYPESCRIPT REPO. Same reason as lib/video-type.js:
 * the callers are CommonJS Node scripts (`scripts/render_news_short.js`) that
 * cannot import TypeScript, and a `.js` module with JSDoc types is the only
 * thing both they and the Next bundle can read.
 *
 * SEARCH BEFORE GENERATE. `findClips()` exists to be called BEFORE any paid
 * generation. A library that is only ever written to is an expense report; the
 * saving is entirely in the read path, and a caller that skips it has quietly
 * turned this back into `.cache/broll/`.
 *
 * TAGS, NOT PROMPTS. A generation prompt is a paragraph written for a video
 * model and no two are alike, so matching on it finds nothing and the library
 * looks empty while holding exactly what was wanted. Tags describe what is
 * VISIBLY IN the clip — 'barbershop', 'phone', 'hands', 'night' — and are the
 * only search key.
 */

/**
 * Clips matching ANY of `tags`, best overlap first.
 *
 * ANY RATHER THAN ALL, deliberately. Requiring every tag makes a four-tag
 * request miss a clip that matches three, which is usually still the right
 * footage; ranking by overlap puts the closest match on top and lets the caller
 * decide. `&&` is the Postgres array-overlap operator and is what the GIN index
 * on `tags` is there to serve.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {{tags: string[], minSeconds?: number, limit?: number, exclude?: string[]}} o
 * @returns {Promise<Array<Object>>} ranked, closest match first
 */
async function findClips(db, o) {
  const tags = (o.tags || []).map((t) => String(t).toLowerCase().trim()).filter(Boolean);
  if (!tags.length) return [];

  let q = db.from("broll_assets").select("*").overlaps("tags", tags).is("retired_at", null);
  if (o.minSeconds) q = q.gte("duration_secs", o.minSeconds);
  const { data, error } = await q.limit(200);
  if (error || !data) return [];

  /*
   * RANKED IN JS, NOT IN SQL. Scoring by overlap size needs an expression
   * Postgres will not index anyway, and this table is hundreds of rows on an
   * internal tool — the query stays a single indexed filter and the ordering
   * costs nothing. Ties break toward the LEAST used clip so the library does not
   * keep serving the same three shots into every video.
   */
  /*
   * minScore IS WHAT STOPS A SINGLE GENERIC WORD CARRYING A MATCH.
   *
   * .overlaps() is ANY-tag, so "phone gps map" matched a clip tagged
   * [phone, ringing, counter, barbershop] on the word "phone" alone and a
   * ringing desk phone was shown to illustrate a map pin. add_broll already
   * says showing the wrong picture is worse than showing the speaker — but it
   * only acted on ZERO hits, and a score of 1 is not a hit, it is a coincidence.
   *
   * Callers that want the old permissive behaviour get it by default; the
   * cutaway path asks for 2.
   */
  /*
   * SCORE COUNTS DISTINCT TAGS MATCHED, AND MATCHING IS PREFIX-AWARE.
   *
   * Two failures pushed this here, in opposite directions. Exact ANY-tag
   * matching let "phone gps map" hit a clip tagged [phone, ringing, counter,
   * barbershop] on one coincidental word, and a ringing desk phone went out
   * illustrating "that map pin". Raising the bar to two EXACT words then threw
   * away a real match: "empty barber shop" describes [barbershop, chair, empty]
   * exactly, but neither "barber" nor "shop" equals "barbershop", so it scored
   * one and was dropped.
   *
   * Counting distinct TAGS fixes both. "barber" and "shop" both reach
   * "barbershop", which is one tag, not two — so a compound word cannot inflate
   * a score on its own — and "empty" makes it two. The map query still reaches
   * exactly one tag and is still refused. Prefixes are limited to 4+ characters
   * so short words like "cut" or "pin" cannot latch onto unrelated tags.
   */
  const reaches = (tag, word) =>
    tag === word ||
    (word.length >= 4 && tag.startsWith(word)) ||
    (tag.length >= 4 && word.startsWith(tag));

  const exclude = new Set(o.exclude || []);
  const minScore = o.minScore ?? 1;
  return data
    .filter((r) => !exclude.has(r.id))
    .map((r) => ({ ...r, _score: r.tags.filter((t) => tags.some((w) => reaches(t, w))).length }))
    .filter((r) => r._score >= minScore)
    .sort((a, b) => b._score - a._score || a.use_count - b.use_count)
    .slice(0, o.limit ?? 10);
}

/**
 * Record a clip that now lives in storage.
 *
 * Upserts on (source, source_ref) so re-importing the same generation is
 * harmless and cannot split one clip's usage history across two rows.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {{source: string, sourceRef?: string, prompt?: string, tags: string[],
 *          model?: string, durationSecs?: number, width?: number, height?: number,
 *          credits?: number, url: string, storagePath?: string}} c
 */
async function recordClip(db, c) {
  const row = {
    source: c.source,
    source_ref: c.sourceRef ?? null,
    prompt: c.prompt ?? null,
    tags: (c.tags || []).map((t) => String(t).toLowerCase().trim()).filter(Boolean),
    model: c.model ?? null,
    duration_secs: c.durationSecs ?? null,
    width: c.width ?? null,
    height: c.height ?? null,
    credits: c.credits ?? 0,
    url: c.url,
    storage_path: c.storagePath ?? null,
  };
  const { data, error } = await db
    .from("broll_assets")
    .upsert(row, { onConflict: "source,source_ref" })
    .select("id, url")
    .single();
  if (error) throw new Error(`broll record failed: ${error.message}`);
  return data;
}

/**
 * Note that a clip was actually used in a render.
 *
 * WHY THIS IS NOT COSMETIC. `use_count` is the only evidence the library is
 * doing its job. Without it there is no way to tell a library that saves money
 * from one that just stores files, and the tie-break in findClips() has nothing
 * to spread usage with.
 */
async function markUsed(db, id) {
  const { data } = await db.from("broll_assets").select("use_count").eq("id", id).single();
  await db.from("broll_assets")
    .update({ use_count: (data?.use_count ?? 0) + 1, last_used_at: new Date().toISOString() })
    .eq("id", id);
}

module.exports = { findClips, recordClip, markUsed };
