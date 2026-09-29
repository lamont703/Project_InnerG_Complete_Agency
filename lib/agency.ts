import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGhlEmail } from "@/lib/ghl-email";
import { SITE_URL } from "@/lib/site";
import { seedDemoCalendar } from "@/lib/calendar/demo";

/**
 * Agency accounts: the profile an agency fills in, which approves it as a
 * partner automatically on first save (lib/agency-partners.ts).
 *
 * An agency signs up (account type "agency"), tells us who they are on
 * /account/agency, and an admin sets up their demo shop from /admin/agencies —
 * the demo appointment book in their own Claude (lib/calendar/demo.ts).
 * Deliberately admin-triggered rather than automatic: the account type is
 * self-selected at signup, and calendar access includes texting clients
 * once a calendar is real, so a person decides who gets it.
 */

const db = () => createAdminClient() as any;

export interface AgencyProfile {
  agency_name: string;
  website: string | null;
  what_they_build: string | null;
  client_count: number | null;
  markets: string | null;
  demo_ready_at: string | null;
}

export async function getAgencyProfile(memberId: string): Promise<AgencyProfile | null> {
  const { data } = await db()
    .from("agency_profiles")
    .select("agency_name, website, what_they_build, client_count, markets, demo_ready_at")
    .eq("community_member_id", memberId)
    .maybeSingle();
  return data ?? null;
}

const clean = (v: unknown, max: number) => {
  const t = String(v ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim();
  return t ? t.slice(0, max) : null;
};

export async function saveAgencyProfile(memberId: string, input: Record<string, unknown>): Promise<{ ok: true } | { ok: false; error: string }> {
  const agency_name = clean(input.agency_name, 120);
  if (!agency_name) return { ok: false, error: "Add your agency's name." };
  let website = clean(input.website, 200);
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  const count = input.client_count === "" || input.client_count == null ? null : Math.round(Number(input.client_count));
  if (count != null && (!Number.isFinite(count) || count < 0 || count > 100000)) return { ok: false, error: "Client count should be a number." };

  const existing = await getAgencyProfile(memberId);
  const { error } = await db().from("agency_profiles").upsert(
    {
      community_member_id: memberId,
      agency_name,
      website,
      what_they_build: clean(input.what_they_build, 1000),
      client_count: count,
      markets: clean(input.markets, 300),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "community_member_id" }
  );
  if (error) return { ok: false, error: "Couldn't save that. Try again." };

  // First save only: approve automatically (decided 2026-09-29 — no manual
  // review queue; the partner agreement gates payment instead), then tell the
  // admin, who can still reject from /admin/agencies.
  if (!existing) {
    const { reviewAgency } = await import("@/lib/agency-partners");
    const approval = await reviewAgency(memberId, "approve").catch((e) => ({ ok: false as const, error: String(e?.message || e) }));
    if (!approval.ok) console.error("[agency] auto-approval failed:", approval.error);
    const to = process.env.ADMIN_ALERT_EMAIL || process.env.OUTREACH_ALERT_EMAIL;
    if (to) {
      await sendGhlEmail({
        email: to,
        subject: `New agency on ShearQuery: ${agency_name}`,
        html: `<p><strong>${escapeHtml(agency_name)}</strong> signed up as an agency${website ? ` (${escapeHtml(website)})` : ""} and was ${approval.ok ? "approved automatically" : "NOT approved — auto-approval failed"}.</p>
<p>What they build: ${escapeHtml(clean(input.what_they_build, 1000) || "not said")}<br/>Clients: ${count ?? "not said"} · Markets: ${escapeHtml(clean(input.markets, 300) || "not said")}</p>
<p><a href="${SITE_URL}/admin/agencies">Review agencies</a> — you can still reject one.</p>`,
      }).catch(() => {});
    }
  }
  return { ok: true };
}

export interface AgencyRow extends AgencyProfile {
  memberId: string;
  partnerStatus: string;
  referralCode: string | null;
  clientCount: number;
  /** The partner agreement version this agency accepted, if any. */
  agreementVersion: string | null;
  email: string | null;
  name: string;
  hasDemo: boolean;
  /** False for an agency ACCOUNT that hasn't told us about itself yet — nothing to approve. */
  hasProfile: boolean;
  createdAt: string;
}

export async function listAgencies(): Promise<AgencyRow[]> {
  const { data } = await db()
    .from("agency_profiles")
    .select("community_member_id, agency_name, website, what_they_build, client_count, markets, demo_ready_at, created_at, partner_status, referral_code, agreement_version, member:community_members(email, first_name, last_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  const ids = (data || []).map((r: any) => r.community_member_id);
  const { data: demos } = ids.length
    ? await db().from("calendar_providers").select("community_member_id, is_demo").in("community_member_id", ids)
    : { data: [] };
  const demoSet = new Set((demos || []).filter((d: any) => d.is_demo).map((d: any) => d.community_member_id));
  const { data: refs } = ids.length
    ? await db().from("agency_referrals").select("agency_member_id").in("agency_member_id", ids)
    : { data: [] };
  const refCount = new Map<string, number>();
  for (const r of refs || []) refCount.set(r.agency_member_id, (refCount.get(r.agency_member_id) || 0) + 1);
  const rows: AgencyRow[] = (data || []).map((r: any) => ({
    memberId: r.community_member_id,
    hasProfile: true,
    email: r.member?.email ?? null,
    name: [r.member?.first_name, r.member?.last_name].filter(Boolean).join(" ") || "—",
    agency_name: r.agency_name,
    website: r.website,
    what_they_build: r.what_they_build,
    client_count: r.client_count,
    markets: r.markets,
    demo_ready_at: r.demo_ready_at,
    hasDemo: demoSet.has(r.community_member_id),
    partnerStatus: r.partner_status,
    referralCode: r.referral_code,
    agreementVersion: r.agreement_version ?? null,
    clientCount: refCount.get(r.community_member_id) || 0,
    createdAt: r.created_at,
  }));

  // Agency accounts with no details yet. Listing only profiles hid them
  // entirely, so a new agency looked like no agency at all (2026-09-28).
  const { data: bare } = await db()
    .from("community_members")
    .select("id, email, first_name, last_name, created_at")
    .eq("audience", "agency")
    .order("created_at", { ascending: false })
    .limit(200);
  const withProfile = new Set(ids);
  for (const m of bare || []) {
    if (withProfile.has(m.id)) continue;
    rows.push({
      memberId: m.id,
      hasProfile: false,
      email: m.email ?? null,
      name: [m.first_name, m.last_name].filter(Boolean).join(" ") || "—",
      agency_name: "Details not filled in yet",
      website: null, what_they_build: null, client_count: null, markets: null, demo_ready_at: null,
      hasDemo: false, partnerStatus: "pending", referralCode: null, agreementVersion: null, clientCount: 0,
      createdAt: m.created_at,
    });
  }
  return rows;
}

/**
 * Grant calendar access and fill the agency's own calendar with the demo shop.
 * seedDemoCalendar refuses a real calendar, so this can never overwrite one.
 */
export async function setupAgencyDemo(memberId: string): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  const { data: member } = await db().from("community_members").select("email, audience").eq("id", memberId).maybeSingle();
  if (!member?.email) return { ok: false, error: "That member has no email on file." };
  if (member.audience !== "agency") return { ok: false, error: "That member isn't an agency account." };

  const { error: grantErr } = await db()
    .from("feature_access")
    .upsert({ email: member.email.trim().toLowerCase(), feature: "calendar", note: "agency demo" }, { onConflict: "email,feature" });
  if (grantErr) return { ok: false, error: `Couldn't grant calendar access: ${grantErr.message}` };

  try {
    const r = await seedDemoCalendar(memberId);
    await db().from("agency_profiles").update({ demo_ready_at: new Date().toISOString() }).eq("community_member_id", memberId);
    return { ok: true, summary: `${r.services} services, ${r.clients} clients, ${r.appointments} appointments` };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Couldn't set up the demo." };
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
