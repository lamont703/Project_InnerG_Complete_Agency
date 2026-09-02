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

  let q = db.from("broll_assets").select("*").overlaps("tags", tags);
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
  const exclude = new Set(o.exclude || []);
  return data
    .filter((r) => !exclude.has(r.id))
    .map((r) => ({ ...r, _score: r.tags.filter((t) => tags.includes(t)).length }))
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
