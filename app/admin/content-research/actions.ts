"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { runContentResearch } from "@/lib/research/agents";
import { setFindingStatus } from "@/lib/research/store";
import type { FindingStatus } from "@/lib/research/types";

/** Both actions re-verify the caller — middleware fails open on an auth exception. */

export async function runContentAgent(): Promise<{ ok: boolean; found?: number; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  try {
    const r = await runContentResearch();
    if (r.error) return { ok: false, error: r.error };
    revalidatePath("/admin/content-research");
    return { ok: true, found: r.findings.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Research failed." };
  }
}

export async function setContentFindingStatus(
  id: string,
  status: FindingStatus,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  try {
    await setFindingStatus(id, status);
    revalidatePath("/admin/content-research");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update." };
  }
}

/**
 * Turn a finding into a queued item, so a decision does not need a terminal.
 *
 * THE SEAM THIS CLOSES. Content Research says what to make and the publisher
 * says what goes out next, and until now nothing joined them — the only route
 * from a suggestion to the queue was running scripts/shorts/queue_shorts.js by
 * hand. So the decision surface and the queue never touched, and the queue ran
 * dry whenever nobody opened a terminal.
 *
 * IT DOES NOT RENDER THE VIDEO, and that is not a shortcut. A publisher row
 * needs a publicly reachable MP4 that both platforms fetch for themselves, and
 * a research finding is a topic. So the row is created WITHOUT video_url and
 * waits.
 *
 * That is safe rather than merely tolerated: the publish cron selects with
 * .not("video_url", "is", null), so an unrendered item is skipped over and the
 * line keeps moving. It cannot block position 1. The same pattern the
 * shorts_queue trigger already relies on — the row exists first, the video
 * arrives after.
 *
 * Marked 'actioned' in the same breath. A finding you queued is a finding you
 * acted on, and leaving it in 'new' would mean deciding twice.
 */
export async function queueFinding(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorised." };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const db = createAdminClient() as any;

  const { data: finding, error: readErr } = await db
    .from("research_findings")
    .select("id, title, suggestion, agent, video_type, stat, label")
    .eq("id", id)
    .single();

  if (readErr || !finding) return { ok: false, error: readErr?.message ?? "Finding not found." };
  if (finding.agent !== "content") return { ok: false, error: "Only content findings can be queued." };

  // Back of the line, matching what the shorts_queue trigger does. Position is
  // the operator's to change; arriving items never jump the order.
  const { data: last } = await db
    .from("publisher_queue")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);
  const position = ((last?.[0]?.position as number) ?? 0) + 1;

  const { error: insErr } = await db.from("publisher_queue").insert({
    // Deterministic, so pressing the button twice is refused by the unique
    // index rather than queueing the same idea again.
    item_key: `research-${finding.id}`,
    title: finding.title,
    caption: finding.suggestion ?? null,
    position,
    status: "queued",
    /*
     * THE FORMAT TRAVELS WITH THE IDEA. Without this the publisher re-derives
     * the pipeline from the headline, which chose a renderer and a price by
     * accident and got a whole category wrong: every data reel carries a figure
     * like "130,165", which is not a small leading count, so all of them derived
     * to the $1.16 avatar.
     *
     * stat and label come along because a data reel cannot render without them.
     */
    video_type: (finding as { video_type?: string | null }).video_type ?? null,
    stat: (finding as { stat?: string | null }).stat ?? null,
    label: (finding as { label?: string | null }).label ?? null,
  });

  if (insErr) {
    if (String(insErr.message).includes("duplicate") || insErr.code === "23505") {
      return { ok: false, error: "Already queued." };
    }
    return { ok: false, error: insErr.message };
  }

  await setFindingStatus(id, "actioned");
  revalidatePath("/admin/content-research");
  revalidatePath("/admin/content-publisher");
  return { ok: true };
}
