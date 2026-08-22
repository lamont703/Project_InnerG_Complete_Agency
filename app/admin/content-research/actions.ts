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
