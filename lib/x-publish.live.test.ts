// @vitest-environment node
//
// PINNED TO NODE. The project default is jsdom, and jsdom's fetch cannot send
// a Blob inside FormData - the append step dies with a bare "fetch failed" that
// names nothing and looks exactly like a network fault or a bad endpoint. It
// cost a diagnosis to notice the environment was the problem, not the code.
import { describe, it, expect } from "vitest";
import { uploadVideoToX, refreshXToken } from "@/lib/x-publish";

/**
 * A REAL call against X, opted into with X_LIVE_CHECK=1. Skipped by default so
 * it never runs in CI or in an ordinary `vitest run`.
 *
 * WHY THIS EXISTS. The chunked upload broke in production and the dry run could
 * not have caught it: a dry run resolves connections and builds copy, it does
 * not speak to X. The failure was a wrong ENDPOINT SHAPE, which only a real
 * request can disprove — and it cost a live slot to discover.
 *
 * NOTHING IS POSTED. Uploaded media is invisible until a post references it,
 * and X expires an unused upload by itself. This exercises initialize, append,
 * finalize and the status poll, then stops.
 *
 * IT DOES ROTATE THE REFRESH TOKEN, because X issues a new one on every
 * redemption and kills the old one. The rotated pair is written straight back
 * to publisher_connections — exactly what the cron does — so running this is
 * safe, but losing the write half way through is not. That is why the update
 * happens immediately after the refresh and before anything else.
 */

const LIVE = process.env.X_LIVE_CHECK === "1";

describe.skipIf(!LIVE)("X media upload — live", () => {
  it("uploads a real video through initialize/append/finalize", async () => {
    const base = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const headers = { apikey: key, Authorization: `Bearer ${key}` };

    const connRes = await fetch(`${base}/rest/v1/publisher_connections?platform=eq.x&select=*`, { headers });
    const [conn] = await connRes.json();
    expect(conn, "no x row in publisher_connections").toBeTruthy();

    const refreshed = await refreshXToken(conn.refresh_token);
    if (!refreshed.ok) throw new Error(`refresh failed (${refreshed.reason}): ${refreshed.error}`);

    // Persist the rotated pair FIRST. The old refresh token is already dead.
    await fetch(`${base}/rest/v1/publisher_connections?platform=eq.x`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: refreshed.accessToken,
        refresh_token: refreshed.refreshToken,
        expires_at: new Date(Date.now() + refreshed.expiresInSecs * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    const rowRes = await fetch(
      `${base}/rest/v1/publisher_queue?select=item_key,video_url&video_url=not.is.null&order=position.asc&limit=1`,
      { headers }
    );
    const [row] = await rowRes.json();
    expect(row?.video_url, "no queued row with a video").toBeTruthy();

    const vid = await fetch(row.video_url);
    const bytes = Buffer.from(await vid.arrayBuffer());
    console.log(`[x-live] ${row.item_key} — ${Math.round(bytes.length / 1024)}KB`);

    const out = await uploadVideoToX(refreshed.accessToken, bytes);
    if (!out.ok) throw new Error(`${out.stage}: ${out.error}`);

    console.log(`[x-live] media id ${out.mediaId} — upload accepted, nothing posted`);
    expect(out.mediaId).toBeTruthy();
  }, 300000);
});
