import "server-only";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { seedDemoCalendar } from "@/lib/calendar/demo";
import { DEMO_EMAIL_DOMAIN, demoToken } from "@/lib/demo/core";
import { demoLocationName, demoTitle, initialGbpState, instagramProfile } from "@/lib/demo/fixtures";
import type { DemoType } from "@/lib/demo/session";

/**
 * Made-up businesses for demo mode: one per agency per type, created on first
 * use. Each is a real member row (is_demo, no login) with a Google connection,
 * an appointment book and an Instagram account that only the fakes answer.
 */

const db = () => createAdminClient() as any;

/** Types whose real owners use the appointment book and Instagram tools. */
const PRO_TYPES: DemoType[] = ["barbershop", "salon", "barber", "cosmetologist"];
const SALON_BOOK: DemoType[] = ["salon", "cosmetologist"];

export async function ensureDemoBusiness(ownerMemberId: string, type: DemoType): Promise<string> {
  const { data: existing } = await db()
    .from("demo_businesses").select("demo_member_id").eq("owner_member_id", ownerMemberId).eq("business_type", type).maybeSingle();
  if (existing) return existing.demo_member_id;

  const title = demoTitle(type);
  const { data: member, error } = await db()
    .from("community_members")
    .insert({
      user_id: null,
      first_name: "Demo",
      last_name: title.replace(/^ShearQuery Demo /, ""),
      // Unique per agency and type, and on a domain that cannot receive mail.
      email: `${type}.${randomBytes(6).toString("hex")}@${DEMO_EMAIL_DOMAIN}`,
      audience: type,
      is_demo: true,
      plan: "autopilot",
      plan_source: "admin",
    })
    .select("id")
    .single();
  if (error || !member) throw new Error(`could not create the demo business: ${error?.message}`);
  const id: string = member.id;

  try {
    const state = initialGbpState(type);
    await must(db().from("demo_gbp_state").insert({ demo_member_id: id, ...state }));
    await must(db().from("gbp_connections").insert({
      community_member_id: id,
      google_account_email: `demo@${DEMO_EMAIL_DOMAIN}`,
      refresh_token: demoToken(id),
      locations: [{ name: demoLocationName(type), title }],
      selected_location: demoLocationName(type),
      status: "connected",
      monitoring_emails_enabled: false,
      last_synced_at: new Date().toISOString(),
    }));
    if (PRO_TYPES.includes(type)) {
      await seedDemoCalendar(id, { name: title, kind: SALON_BOOK.includes(type) ? "salon" : "barber" });
    }
    const ig = instagramProfile(type);
    if (ig) {
      await must(db().from("member_instagram_connections").insert({
        community_member_id: id,
        access_token: demoToken(id),
        ig_user_id: `demo-${type}`,
        username: ig.username,
        account_type: "BUSINESS",
        // Far off, so nothing ever tries to refresh a demo token.
        expires_at: new Date(Date.now() + 10 * 365 * 86400_000).toISOString(),
        status: "connected",
      }));
    }
    const { error: linkErr } = await db().from("demo_businesses").insert({ owner_member_id: ownerMemberId, business_type: type, demo_member_id: id });
    if (linkErr) throw new Error(linkErr.message);
    return id;
  } catch (e) {
    // Two starts racing, or a half-made business: remove ours (every row
    // above cascades from the member) and use whichever one exists.
    await db().from("community_members").delete().eq("id", id).eq("is_demo", true);
    const { data: winner } = await db()
      .from("demo_businesses").select("demo_member_id").eq("owner_member_id", ownerMemberId).eq("business_type", type).maybeSingle();
    if (winner) return winner.demo_member_id;
    throw e;
  }
}

/** Put a demo business back as it started: profile, drafts, history and book. */
export async function resetDemoBusiness(demoMemberId: string, type: DemoType) {
  const { data: m } = await db().from("community_members").select("is_demo").eq("id", demoMemberId).maybeSingle();
  if (!m?.is_demo) throw new Error("refusing to reset a member that isn't a demo business");
  await must(db().from("demo_gbp_state").update({ ...initialGbpState(type), updated_at: new Date().toISOString() }).eq("demo_member_id", demoMemberId));
  await db().from("gbp_change_requests").delete().eq("community_member_id", demoMemberId);
  await db().from("gbp_write_snapshots").delete().eq("community_member_id", demoMemberId);
  await db().from("gbp_scheduled_posts").delete().eq("community_member_id", demoMemberId);
  if (PRO_TYPES.includes(type)) {
    await seedDemoCalendar(demoMemberId, { name: demoTitle(type), kind: SALON_BOOK.includes(type) ? "salon" : "barber" });
  }
}

async function must(q: PromiseLike<{ error: any }>) {
  const { error } = await q;
  if (error) throw new Error(error.message);
}
