import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUDIENCES, storedAudience, type AudienceId } from "@/lib/audiences";

/**
 * Set a member's account type — ONLY while it is empty. Used by Claude
 * (set_my_account_type) and the website (/account/plan) alike, so both follow
 * one rule: the type decides plans, prices and agency commission, so once set
 * it's changed deliberately by ShearQuery, never in passing.
 */
export async function setAccountTypeOnce(memberId: string, raw: unknown): Promise<{ ok: true; type: AudienceId } | { ok: false; error: string; current?: AudienceId | null }> {
  const id = storedAudience(String(raw ?? ""));
  if (!id || AUDIENCES[id].status !== "live" || id === "client") return { ok: false, error: `"${String(raw)}" isn't an account type that can be chosen.` };
  const db = createAdminClient() as any;
  // Conditional on the column being empty, in the database: a type that is
  // already set cannot be overwritten, even by two requests racing.
  const { data: updated } = await db.from("community_members").update({ audience: id }).eq("id", memberId).is("audience", null).select("id");
  if (updated?.length) return { ok: true, type: id };
  const { data } = await db.from("community_members").select("audience").eq("id", memberId).maybeSingle();
  const current = storedAudience(data?.audience);
  return current
    ? { ok: false, error: `This is already a ${AUDIENCES[current].label} account. To change it, contact ShearQuery.`, current }
    : { ok: false, error: "Couldn't set the type. Try again." };
}
