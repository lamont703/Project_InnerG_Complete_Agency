import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGhlEmail } from "@/lib/ghl-email";
import { SITE_URL } from "@/lib/site";
import { AUDIENCES, storedAudience } from "@/lib/audiences";
import { getMemberPlan, publishesThisMonth } from "@/lib/member-plan";
import { FREE_PUBLISHES_PER_MONTH, PLAN_LABEL } from "@/lib/plans";
import { nextSteps, type SupportStatus } from "@/lib/agency-support-rules";

/**
 * The agency support view: a business owner lets the agency that brought them
 * in see, read-only, what's connected, stuck or failing on their account.
 *
 * THE OWNER DECIDES. Access is switched on and off by the owner (their
 * account page, or my_agency_access in Claude); the agency can only ask. It is
 * only ever for the agency credited in agency_referrals, and it is re-checked
 * against that on every read, so a grant can't outlive the credit.
 *
 * WHAT IT NEVER SHOWS: the client's own customers — no appointment names or
 * phone numbers, no review text. Operational status only.
 */

const db = () => createAdminClient() as any;

export async function creditedAgency(clientMemberId: string): Promise<{ id: string; name: string } | null> {
  const { data: ref } = await db().from("agency_referrals").select("agency_member_id").eq("client_member_id", clientMemberId).maybeSingle();
  if (!ref) return null;
  const { data: p } = await db().from("agency_profiles").select("agency_name").eq("community_member_id", ref.agency_member_id).maybeSingle();
  return { id: ref.agency_member_id, name: p?.agency_name || "your agency" };
}

/** The owner's switch. */
export async function setAgencyAccess(clientMemberId: string, on: boolean): Promise<{ ok: true; agency: string; on: boolean } | { ok: false; error: string }> {
  const agency = await creditedAgency(clientMemberId);
  if (!agency) return { ok: false, error: "No agency brought this account to ShearQuery, so there's no agency to share it with." };
  const { error } = await db().from("agency_access_grants").upsert(
    on
      ? { client_member_id: clientMemberId, agency_member_id: agency.id, granted_at: new Date().toISOString(), revoked_at: null }
      : { client_member_id: clientMemberId, agency_member_id: agency.id, revoked_at: new Date().toISOString() },
    { onConflict: "client_member_id" }
  );
  if (error) return { ok: false, error: "Couldn't save that. Try again." };
  return { ok: true, agency: agency.name, on };
}

export async function agencyAccessState(clientMemberId: string) {
  const agency = await creditedAgency(clientMemberId);
  if (!agency) return { agency: null, on: false };
  const { data } = await db().from("agency_access_grants").select("agency_member_id, revoked_at").eq("client_member_id", clientMemberId).maybeSingle();
  return { agency, on: !!data && !data.revoked_at && data.agency_member_id === agency.id };
}

/** Access holds only while the grant is on AND the agency is still the one credited. */
export async function hasAccess(agencyMemberId: string, clientMemberId: string): Promise<boolean> {
  const state = await agencyAccessState(clientMemberId);
  return state.on && state.agency?.id === agencyMemberId;
}

/** Clients who have shared their account with this agency. */
export async function sharedClientIds(agencyMemberId: string): Promise<Set<string>> {
  const { data } = await db().from("agency_access_grants").select("client_member_id").eq("agency_member_id", agencyMemberId).is("revoked_at", null);
  const ids = new Set<string>();
  for (const r of data || []) if (await hasAccess(agencyMemberId, r.client_member_id)) ids.add(r.client_member_id);
  return ids;
}

/** The agency asks a client to share. At most once every three days per client. */
export async function requestAccess(agencyMemberId: string, clientMemberId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const agency = await creditedAgency(clientMemberId);
  if (agency?.id !== agencyMemberId) return { ok: false, error: "That business isn't one of this agency's clients." };
  if (await hasAccess(agencyMemberId, clientMemberId)) return { ok: false, error: "They've already shared their account with you." };
  const { data: g } = await db().from("agency_access_grants").select("requested_at").eq("client_member_id", clientMemberId).maybeSingle();
  if (g?.requested_at && Date.now() - new Date(g.requested_at).getTime() < 3 * 86400_000) {
    return { ok: false, error: "You asked them in the last three days. Give them a little time." };
  }
  const { data: m } = await db().from("community_members").select("email, first_name").eq("id", clientMemberId).maybeSingle();
  if (!m?.email) return { ok: false, error: "That client has no email on file." };
  const sent = await sendGhlEmail({
    email: m.email,
    subject: `${agency.name} would like to help with your ShearQuery account`,
    html: `<p>Hi ${esc(m.first_name || "there")},</p><p>${esc(agency.name)}, the agency that brought you to ShearQuery, is asking to see your account so they can help — for example, spotting a Google connection that needs fixing or a draft waiting for you.</p><p>They'd see what's connected and what's stuck, <strong>read-only</strong>. They can't change anything, and they never see your customers' names, numbers or reviews. You can switch it off any time.</p><p><a href="${SITE_URL}/account/agency-access">Review and decide</a></p>`,
  });
  if (!sent.ok) return { ok: false, error: "The request email couldn't be sent." };
  if (g) await db().from("agency_access_grants").update({ requested_at: new Date().toISOString() }).eq("client_member_id", clientMemberId);
  else await db().from("agency_access_grants").insert({ client_member_id: clientMemberId, agency_member_id: agencyMemberId, revoked_at: new Date().toISOString(), requested_at: new Date().toISOString() });
  return { ok: true };
}

export interface SupportReport {
  clientName: string;
  type: string;
  status: SupportStatus;
  googleLocation: string | null;
  googleLastSynced: string | null;
  pendingDraftKinds: string[];
  recentPublished: number;
  autopilotOn: boolean;
  billing: string | null;
  steps: string[];
}

/** The health check. Callers must check hasAccess first; this reads without asking. */
export async function clientSupportReport(clientMemberId: string): Promise<SupportReport | null> {
  const now = Date.now();
  const since = (days: number) => new Date(now - days * 86400_000).toISOString();
  const { data: member } = await db().from("community_members").select("first_name, last_name, audience").eq("id", clientMemberId).maybeSingle();
  if (!member) return null;
  const type = storedAudience(member.audience);

  const [mp, used, link, conn, changes, autopilotFails, provider, ig, audit, sub] = await Promise.all([
    getMemberPlan(clientMemberId),
    publishesThisMonth(clientMemberId),
    db().from("community_member_entity_links").select("entity_id").eq("community_member_id", clientMemberId).maybeSingle(),
    db().from("gbp_connections").select("status, refresh_token, selected_location, locations, last_synced_at").eq("community_member_id", clientMemberId).maybeSingle(),
    db().from("gbp_change_requests").select("status, proposed->>kind, error, created_at").eq("community_member_id", clientMemberId).gte("created_at", since(30)).order("created_at", { ascending: false }).limit(100),
    db().from("autopilot_actions").select("id", { count: "exact", head: true }).eq("community_member_id", clientMemberId).eq("status", "failed").gte("created_at", since(7)),
    db().from("calendar_providers").select("id, active, is_demo").eq("community_member_id", clientMemberId).maybeSingle(),
    db().from("member_instagram_connections").select("status").eq("community_member_id", clientMemberId).maybeSingle(),
    db().from("gbp_audit_snapshots").select("score").eq("community_member_id", clientMemberId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db().from("billing_subscriptions").select("plan, status").eq("community_member_id", clientMemberId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const c = conn.data;
  const googleConnection: SupportStatus["googleConnection"] = !c?.refresh_token
    ? "none"
    : c.status === "revoked" ? "revoked"
    : c.status === "error" ? "error"
    : !c.selected_location && !(Array.isArray(c.locations) && c.locations.length === 1) ? "needs_selection"
    : "connected";

  const rows: any[] = changes.data || [];
  const pending = rows.filter((r) => r.status === "pending" && now - new Date(r.created_at).getTime() < 24 * 3_600_000);
  const failed = rows.filter((r) => r.status === "failed").slice(0, 5).map((r) => ({ kind: String(r.kind || "change").replace(/_/g, " "), error: String(r.error || "unknown").slice(0, 200), at: r.created_at }));

  let textFailures = 0;
  if (provider.data?.id && !provider.data.is_demo) {
    const { count } = await db().from("calendar_appointments").select("id", { count: "exact", head: true }).eq("provider_id", provider.data.id).not("notify_error", "is", null).gte("created_at", since(14));
    textFailures = count ?? 0;
  }

  const igStatus = ig.data?.status;
  const status: SupportStatus = {
    googleConnection,
    claimedListing: !!link.data,
    pendingDrafts: pending.length,
    failedChanges: failed,
    plan: PLAN_LABEL[mp.plan],
    publishesLeft: mp.plan === "free" ? Math.max(0, FREE_PUBLISHES_PER_MONTH - used) : null,
    autopilotFailures: autopilotFails.count ?? 0,
    calendar: !provider.data ? "none" : provider.data.is_demo ? "demo" : provider.data.active ? "live" : "none",
    textFailures,
    instagram: !igStatus ? "none" : igStatus === "connected" ? "connected" : igStatus === "expired" ? "expired" : "error",
    auditScore: audit.data?.score ?? null,
  };

  const locTitle = Array.isArray(c?.locations) ? (c.locations.find((l: any) => l.name === c.selected_location) ?? c.locations[0])?.title ?? null : null;
  return {
    clientName: [member.first_name, member.last_name].filter(Boolean).join(" ") || "Client",
    type: type ? AUDIENCES[type].label : "type not set",
    status,
    googleLocation: locTitle,
    googleLastSynced: c?.last_synced_at ?? null,
    pendingDraftKinds: pending.map((r) => String(r.kind || "change").replace(/_/g, " ")),
    recentPublished: rows.filter((r) => ["applied", "reverted"].includes(r.status)).length,
    autopilotOn: mp.plan === "autopilot",
    billing: sub.data ? `${PLAN_LABEL[sub.data.plan as "manage" | "autopilot"] ?? sub.data.plan} — ${sub.data.status === "past_due" ? "payment failed, card needs updating" : sub.data.status}` : null,
    steps: nextSteps(status),
  };
}

/** The report as text, for Claude and for the page. */
export function reportLines(r: SupportReport): string[] {
  const s = r.status;
  const google = { none: "not connected", connected: "connected", needs_selection: "connected, but no location chosen", error: "error — needs reconnecting", revoked: "expired — needs reconnecting" }[s.googleConnection];
  return [
    `${r.clientName} (${r.type})`,
    `  Plan: ${s.plan}${s.publishesLeft != null ? ` — ${s.publishesLeft} of ${FREE_PUBLISHES_PER_MONTH} free publishes left this month` : ""}${r.billing ? ` · billing: ${r.billing}` : ""}`,
    `  Listing claimed: ${s.claimedListing ? "yes" : "no"}`,
    `  Google: ${google}${r.googleLocation ? ` (${r.googleLocation})` : ""}${r.googleLastSynced ? `, last synced ${r.googleLastSynced.slice(0, 10)}` : ""}`,
    `  Audit score: ${s.auditScore ?? "no audit yet"}`,
    `  Last 30 days: ${r.recentPublished} change${r.recentPublished === 1 ? "" : "s"} published, ${s.failedChanges.length} failed, ${s.pendingDrafts} draft${s.pendingDrafts === 1 ? "" : "s"} waiting${r.pendingDraftKinds.length ? ` (${r.pendingDraftKinds.join(", ")})` : ""}`,
    ...s.failedChanges.map((f) => `    - ${f.at.slice(0, 10)} ${f.kind} failed: ${f.error}`),
    `  Autopilot: ${r.autopilotOn ? `on${s.autopilotFailures ? `, ${s.autopilotFailures} failure${s.autopilotFailures === 1 ? "" : "s"} this week` : ", running cleanly"}` : "off"}`,
    `  Calendar: ${s.calendar === "live" ? `live${s.textFailures ? `, ${s.textFailures} text${s.textFailures === 1 ? "" : "s"} failed in 2 weeks` : ""}` : "not in use"}`,
    `  Instagram: ${s.instagram === "none" ? "not connected" : s.instagram}`,
    "",
    "WHERE TO HELP",
    ...r.steps.map((x, i) => `  ${i + 1}. ${x}`),
  ];
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
