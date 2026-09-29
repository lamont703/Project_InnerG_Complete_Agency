import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin-allowlist";
import { AUDIENCES } from "@/lib/audiences";
import type { DemoContext } from "@/lib/demo/core";

/**
 * Who is in a demo, as which made-up business. The session belongs to the
 * signed-in member, not to one Claude connection: "show me this as a salon"
 * lasts until they say stop, whichever chat they're in.
 */

const db = () => createAdminClient() as any;

export const DEMO_TYPES = ["barbershop", "salon", "barber", "cosmetologist", "school", "supply_store"] as const;
export type DemoType = (typeof DEMO_TYPES)[number];

export const isDemoType = (t: unknown): t is DemoType => typeof t === "string" && (DEMO_TYPES as readonly string[]).includes(t);

export const demoLabel = (t: DemoType) => AUDIENCES[t].label;

/** Agencies run demos to sell; admins run them to check what agencies see. */
export async function canRunDemos(memberId: string): Promise<boolean> {
  const { data } = await db().from("community_members").select("audience, email, is_demo").eq("id", memberId).maybeSingle();
  if (!data || data.is_demo) return false;
  return data.audience === "agency" || isAdminEmail(data.email);
}

export async function startDemoSession(ownerMemberId: string, type: DemoType) {
  await db().from("demo_sessions").upsert({ owner_member_id: ownerMemberId, business_type: type, started_at: new Date().toISOString() }, { onConflict: "owner_member_id" });
}

export async function stopDemoSession(ownerMemberId: string): Promise<boolean> {
  const { data } = await db().from("demo_sessions").delete().eq("owner_member_id", ownerMemberId).select("owner_member_id");
  return !!data?.length;
}

/**
 * The demo a member is in right now, with its business — or null.
 *
 * THROWS if it can't tell. It must never fall back to "not in a demo" on an
 * error: for an admin with a real Google profile, that fallback turns a
 * publish they believe is a demo into a change to their real listing. The
 * handler refuses the call instead.
 */
export async function activeDemo(ownerMemberId: string): Promise<DemoContext | null> {
  const { data: s, error } = await db().from("demo_sessions").select("business_type").eq("owner_member_id", ownerMemberId).maybeSingle();
  if (error) throw new Error(`demo session lookup failed: ${error.message}`);
  if (!s) return null;
  if (!isDemoType(s.business_type)) throw new Error("demo session has an unknown business type");
  const { data: b, error: bErr } = await db()
    .from("demo_businesses")
    .select("demo_member_id, member:community_members!demo_businesses_demo_member_id_fkey(email, is_demo)")
    .eq("owner_member_id", ownerMemberId)
    .eq("business_type", s.business_type)
    .maybeSingle();
  if (bErr) throw new Error(`demo business lookup failed: ${bErr.message}`);
  // Never act as a member that isn't flagged demo.
  if (!b?.member?.is_demo) throw new Error("the demo business is missing; start the demo again");
  return { ownerMemberId, demoMemberId: b.demo_member_id, demoEmail: b.member.email, businessType: s.business_type };
}
