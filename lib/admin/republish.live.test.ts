// @vitest-environment node
import { describe, it, expect } from "vitest";
import { publishToYouTube } from "@/lib/youtube-publish";
import { publishToGbpBrand } from "@/lib/gbp-brand-publish";
import { buildGbpSummary, SITE } from "@/lib/admin/publisher-copy";

/**
 * Republish ONE queue item to ONE platform. Opted into explicitly:
 *
 *   REPUBLISH_ITEM=<item_key> REPUBLISH_PLATFORM=youtube|gbp \
 *     npx vitest run lib/admin/republish.live.test.ts --environment=node
 *
 * WHY THIS EXISTS. A slot publishes to several platforms and any one can fail
 * on its own — that is what 'partial' means. The only retry before this was
 * re-queueing the item, which re-posts everywhere that already succeeded and
 * puts the same video out twice.
 *
 * IT CALLS THE SAME MODULES THE CRON DOES — lib/youtube-publish.ts and
 * lib/gbp-brand-publish.ts. A second copy of either would drift from the real
 * one, and the copy nobody runs daily is the one that rots.
 *
 * IT REFUSES TO POST A DUPLICATE. A platform already recorded as ok in
 * `results` has a live post, and re-running would put a second copy out with no
 * way to tell them apart afterwards.
 */

const ITEM = process.env.REPUBLISH_ITEM;
const PLATFORM = (process.env.REPUBLISH_PLATFORM || "youtube") as "youtube" | "gbp";

describe.skipIf(!ITEM)(`republish to ${PLATFORM}`, () => {
  it("publishes the failed item and corrects the row", async () => {
    const base = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const headers = { apikey: key, Authorization: `Bearer ${key}` };

    const [row] = await fetch(
      `${base}/rest/v1/publisher_queue?select=*&item_key=eq.${encodeURIComponent(ITEM!)}`,
      { headers }
    ).then((r) => r.json());
    expect(row, `no queue row with item_key ${ITEM}`).toBeTruthy();

    const prior = (row.results ?? {})[PLATFORM];
    if (prior && "ok" in prior && prior.ok) {
      throw new Error(
        `refusing: ${ITEM} already published to ${PLATFORM} (${prior.id}). ` +
        `Re-running would post a second copy.`
      );
    }

    let outcome: { ok: true; id: string; url?: string } | { ok: false; error: string };

    if (PLATFORM === "youtube") {
      expect(row.video_url, "row has no video").toBeTruthy();
      const vid = await fetch(row.video_url);
      expect(vid.ok, `video unreachable: HTTP ${vid.status}`).toBe(true);
      const bytes = Buffer.from(await vid.arrayBuffer());
      console.log(`[republish] ${ITEM} — ${Math.round(bytes.length / 1024)}KB`);
      const r = await publishToYouTube(row, bytes);
      outcome = r.ok
        ? { ok: true, id: r.id, url: `https://youtube.com/shorts/${r.id}` }
        : { ok: false, error: r.error };
    } else {
      // The brand connection lives in publisher_connections, and its refresh
      // token is redeemed by lib/gbp-brand-publish against the brand client.
      const [conn] = await fetch(
        `${base}/rest/v1/publisher_connections?select=refresh_token,config,enabled,status&platform=eq.gbp`,
        { headers }
      ).then((r) => r.json());
      expect(conn?.refresh_token, "gbp is not connected").toBeTruthy();

      const r = await publishToGbpBrand({
        refreshToken: conn.refresh_token,
        accountName: conn.config?.accountName,
        locationName: conn.config?.locationName,
        summary: buildGbpSummary(row),
        // GBP takes the cover image, not the MP4 — a LocalPost MediaItem
        // documents PHOTO only.
        photoUrl: row.thumbnail_url ?? null,
        url: SITE,
      });
      outcome = r.ok ? { ok: true, id: r.postName } : { ok: false, error: r.error };
    }

    if (!outcome.ok) throw new Error(outcome.error);
    console.log(`[republish] published ${outcome.url ?? outcome.id}`);

    /*
     * The row is corrected, not overwritten. results[PLATFORM] still held the
     * failure that caused this; leaving it would make the record permanently
     * wrong, and replacing the whole object would erase the other platforms'
     * outcomes from the same slot.
     */
    const now = new Date().toISOString();
    const results = { ...(row.results ?? {}), [PLATFORM]: outcome };
    const patch: Record<string, unknown> = {
      results,
      status: Object.values(results).every((v: any) => "skipped" in v || v.ok)
        ? "published"
        : "partial",
      updated_at: now,
    };
    // YouTube also has legacy columns the board still reads for older rows.
    if (PLATFORM === "youtube") {
      patch.youtube_id = outcome.id;
      patch.youtube_error = null;
      patch.youtube_published_at = now;
    }

    const [updated] = await fetch(
      `${base}/rest/v1/publisher_queue?item_key=eq.${encodeURIComponent(ITEM!)}`,
      {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(patch),
      }
    ).then((r) => r.json());

    console.log(`[republish] row status now: ${updated.status}`);
    expect((updated.results ?? {})[PLATFORM].ok).toBe(true);
  }, 600000);
});
