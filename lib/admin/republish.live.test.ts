// @vitest-environment node
import { describe, it, expect } from "vitest";
import { publishToYouTube } from "@/lib/youtube-publish";

/**
 * Republish ONE queue item to YouTube. Opted into explicitly:
 *
 *   REPUBLISH_ITEM=hairstyles-w2-layers npx vitest run lib/admin/republish.live.test.ts --environment=node
 *
 * WHY THIS EXISTS. A slot publishes to several platforms and any one of them
 * can fail on its own — that is what 'partial' means. Until now the only way to
 * retry the failed half was to re-queue the item, which would re-post it
 * everywhere that already succeeded and put the same video out twice.
 *
 * IT USES lib/youtube-publish.ts, the same module the cron calls. A second copy
 * of the upload would drift from the real one, and the copy nobody runs daily
 * is the one that rots.
 *
 * IT REFUSES TO POST A DUPLICATE. A row that already carries a youtube_id has a
 * Short live, and re-uploading would put a second copy on the channel with no
 * way to tell them apart afterwards.
 */

const ITEM = process.env.REPUBLISH_ITEM;

describe.skipIf(!ITEM)("republish to YouTube", () => {
  it("uploads the failed item and records the result", async () => {
    const base = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const headers = { apikey: key, Authorization: `Bearer ${key}` };

    const rowRes = await fetch(
      `${base}/rest/v1/publisher_queue?select=*&item_key=eq.${encodeURIComponent(ITEM!)}`,
      { headers }
    );
    const [row] = await rowRes.json();
    expect(row, `no queue row with item_key ${ITEM}`).toBeTruthy();

    if (row.youtube_id) {
      throw new Error(
        `refusing: ${ITEM} already has youtube_id ${row.youtube_id}. ` +
        `Re-uploading would put a second copy on the channel.`
      );
    }
    expect(row.video_url, "row has no video").toBeTruthy();

    const vid = await fetch(row.video_url);
    expect(vid.ok, `video unreachable: HTTP ${vid.status}`).toBe(true);
    const bytes = Buffer.from(await vid.arrayBuffer());
    console.log(`[republish] ${ITEM} — ${Math.round(bytes.length / 1024)}KB`);

    const out = await publishToYouTube(row, bytes);
    if (!out.ok) throw new Error(out.error);
    const url = `https://youtube.com/shorts/${out.id}`;
    console.log(`[republish] published ${url}`);

    /*
     * The row is corrected, not overwritten. results.youtube still held the
     * failure that caused this; leaving it would make the record permanently
     * wrong, and blanking the whole object would erase the other platforms'
     * outcomes from the same slot.
     */
    const now = new Date().toISOString();
    const results = { ...(row.results ?? {}), youtube: { ok: true, id: out.id, url } };
    const patch = await fetch(
      `${base}/rest/v1/publisher_queue?item_key=eq.${encodeURIComponent(ITEM!)}`,
      {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({
          results,
          youtube_id: out.id,
          youtube_error: null,
          youtube_published_at: now,
          // Every attempted platform has now succeeded, so 'partial' is no
          // longer the honest label.
          status: Object.values(results).every(
            (v: any) => "skipped" in v || v.ok
          ) ? "published" : "partial",
          updated_at: now,
        }),
      }
    );
    const [updated] = await patch.json();
    console.log(`[republish] row status now: ${updated.status}`);
    expect(updated.youtube_id).toBe(out.id);
  }, 600000);
});
