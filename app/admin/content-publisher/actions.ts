"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";

/**
 * Reordering the line.
 *
 * RE-VERIFIES THE CALLER. Middleware gates /admin/content-publisher, but it
 * fails OPEN on an auth exception and this writes with the service-role client
 * - the same defence-in-depth the ad-campaign actions keep, and the reason
 * isAdmin() exists as its own module rather than as a middleware assumption.
 */

/**
 * Take the full ordered list of ids and renumber them 1..n.
 *
 * THE WHOLE LIST, NOT A MOVE. A "move item X to position 3" API has to decide
 * what happens to everything between the old and new slots, and the client
 * already knows the answer because it just rendered it. Sending the resulting
 * order outright means the array the operator is looking at IS what gets
 * stored, and there is no second implementation of the shifting rule to
 * disagree with the first.
 *
 * REFUSES A PARTIAL LIST. If the ids sent do not match the queued rows exactly,
 * something raced - a publish landed, or another tab reordered - and applying
 * it anyway would renumber a stale set and silently drop whatever is missing to
 * the back. Better to refuse and let the page reload with the truth.
 */
export async function reorderQueue(
  orderedIds: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  if (!orderedIds.length) return { ok: false, error: "Nothing to reorder." };

  const db = createAdminClient();

  const { data: current, error: readError } = await db
    .from("publisher_queue")
    .select("id")
    .eq("status", "queued");

  if (readError) return { ok: false, error: readError.message };

  const currentIds = new Set((current ?? []).map((r: any) => r.id as string));
  const sentIds = new Set(orderedIds);

  if (currentIds.size !== sentIds.size || [...currentIds].some((id) => !sentIds.has(id))) {
    return {
      ok: false,
      error: "The queue changed while you were reordering. Reload and try again.",
    };
  }

  /**
   * Written one row at a time on purpose. There is no unique constraint on
   * position, so an intermediate state where two rows briefly share a number is
   * harmless, and the alternative - an upsert of the whole set - would need
   * every not-null column restated just to move an integer.
   *
   * The queue is tens of rows on an internal page. This is not the hot path.
   */
  const stamp = new Date().toISOString();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await (db.from("publisher_queue") as any)
      .update({ position: i + 1, updated_at: stamp })
      .eq("id", orderedIds[i]);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/admin/content-publisher");
  return { ok: true };
}

/**
 * Drop an item out of the line without publishing it.
 *
 * 'skipped' rather than a delete: the item_key is unique precisely so the same
 * figure cannot re-enter the queue, and deleting the row would surrender that
 * guard and let the next queueing run put it straight back.
 */
export async function skipItem(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };

  const db = createAdminClient();
  const { error } = await (db.from("publisher_queue") as any)
    .update({ status: "skipped", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "queued");

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/content-publisher");
  return { ok: true };
}


/**
 * Render one card, on this machine.
 *
 * LOCAL ONLY, AND IT SAYS SO RATHER THAN FAILING STRANGELY. Rendering needs
 * ffmpeg, puppeteer, the HeyGen key and the scripts/ directory — none of which
 * exist on the hosted function. The Video Cutter learned that the expensive
 * way: bundling ffmpeg put it at 307.94MB against a 250MB limit and the deploy
 * was rejected. So this checks for VERCEL and refuses with a plain sentence
 * instead of throwing ENOENT somewhere the operator cannot see it.
 *
 * DETACHED, NOT AWAITED. An avatar render takes two to three minutes and a
 * server action held open that long is a request waiting to be killed by a
 * timeout somewhere between the browser and Next. So it starts the job, returns
 * immediately, and the card updates itself when video_url is written — which
 * the renderer does LAST, after the file is in storage. Refreshing the board is
 * how you see it land.
 *
 * The spawn target is a plain relative path. Nothing here constructs a path
 * into node_modules, which is the move that made Turbopack walk directories and
 * broke two builds today.
 */
export async function renderCard(id: string): Promise<{ ok: boolean; error?: string; log?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorised." };
  if (process.env.VERCEL) {
    return { ok: false, error: "Rendering runs locally only — it needs ffmpeg, puppeteer and the HeyGen key." };
  }

  const { spawn } = await import("node:child_process");
  const { openSync } = await import("node:fs");
  const log = `/tmp/render-${id}.log`;

  try {
    const out = openSync(log, "a");
    const child = spawn("node", ["scripts/render_queued.js", "--go", `--id=${id}`], {
      detached: true,
      stdio: ["ignore", out, out],
    });
    child.unref();
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "could not start the renderer" };
  }

  return { ok: true, log };
}
