import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGhlEmail } from "@/lib/ghl-email";
import { SITE_URL } from "@/lib/site";
import { makeReferralCode, normaliseReferralCode, pickReferralSignal, isEmail, type ReferralSource } from "@/lib/agency-referral-rules";

/**
 * Agency partners: approval, referral codes, email invites, and CREDIT — which
 * agency brought which business to ShearQuery.
 *
 * THE RULES, decided by the product owner on 2026-09-28, revised 2026-09-29:
 *  - Only APPROVED agencies earn credit. Approval is AUTOMATIC when an agency
 *    first saves its details (lib/agency.ts); an admin can still reject.
 *  - The partner agreement gates PAYMENT, not approval: commission accrues
 *    from day one, but no payout is set up or sent until the current version
 *    is accepted (agreementAccepted, checked in lib/billing/connect.ts and
 *    lib/commissions.ts).
 *  - Credit is locked at signup, one agency per client, first one wins — the
 *    primary key on agency_referrals.client_member_id enforces it.
 *  - Invites are email only for now.
 *  - An agency cannot credit itself or another agency account.
 * Commission is computed FROM this credit, in lib/commissions.ts.
 */

const db = () => createAdminClient() as any;
const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

export const INVITES_PER_DAY = 50;
export const INVITE_DAYS = 30;
export const REF_COOKIE = "sq_ref";
export const INVITE_COOKIE = "sq_agency_invite";

// ── approval (admin) ────────────────────────────────────────────────────────

export async function reviewAgency(memberId: string, action: "approve" | "reject", note?: string | null) {
  const { data: profile } = await db().from("agency_profiles").select("agency_name, referral_code, partner_status").eq("community_member_id", memberId).maybeSingle();
  if (!profile) return { ok: false as const, error: "No agency profile for that member." };

  if (action === "reject") {
    await db().from("agency_profiles").update({ partner_status: "rejected", reviewed_note: note ?? null, updated_at: new Date().toISOString() }).eq("community_member_id", memberId);
    return { ok: true as const, code: null };
  }

  let code: string = profile.referral_code;
  if (!code) {
    const { data: taken } = await db().from("agency_profiles").select("referral_code").not("referral_code", "is", null);
    code = makeReferralCode(profile.agency_name, new Set((taken || []).map((t: any) => t.referral_code)));
  }
  const { error } = await db()
    .from("agency_profiles")
    .update({ partner_status: "approved", referral_code: code, approved_at: new Date().toISOString(), reviewed_note: note ?? null, updated_at: new Date().toISOString() })
    .eq("community_member_id", memberId);
  if (error) return { ok: false as const, error: error.message };

  if (profile.partner_status !== "approved") {
    const { data: m } = await db().from("community_members").select("email, first_name").eq("id", memberId).maybeSingle();
    if (m?.email) {
      await sendGhlEmail({
        email: m.email,
        name: m.first_name || undefined,
        subject: "You're approved as a ShearQuery partner",
        html: `<p>Hi ${m.first_name || "there"},</p>
<p>${escapeHtml(profile.agency_name)} is approved as a ShearQuery partner. Your referral code is <strong>${code}</strong>, and your link is <a href="${SITE_URL}/join/${code}">${SITE_URL}/join/${code}</a>.</p>
<p>Businesses that join through your link, your code or an invite you send are credited to you. <a href="${SITE_URL}/account/agency">Open your agency page</a> to invite your clients and see who's joined.</p>
<p>Before we can pay you commission, <a href="${SITE_URL}/account/agency/agreement">read and accept the partner agreement</a>.</p>`,
      }).catch(() => {});
    }
  }
  return { ok: true as const, code };
}

/**
 * Whether this agency may be PAID: it has accepted the current partner
 * agreement. While the agreement is a draft nothing can be accepted, so
 * nothing is required.
 */
export async function agreementAccepted(memberId: string): Promise<boolean> {
  const { agreementIsFinal, PARTNER_AGREEMENT } = await import("@/lib/partner-agreement");
  if (!agreementIsFinal()) return true;
  const { data } = await db().from("agency_profiles").select("agreement_version").eq("community_member_id", memberId).maybeSingle();
  return data?.agreement_version === PARTNER_AGREEMENT.version;
}

export const AGREEMENT_NEEDED_FOR_PAYOUT = "Accept the partner agreement before payouts can be set up or sent.";

export async function approvedAgencyByCode(code: string): Promise<{ memberId: string; name: string } | null> {
  const c = normaliseReferralCode(code);
  if (!c) return null;
  const { data } = await db().from("agency_profiles").select("community_member_id, agency_name").eq("referral_code", c).eq("partner_status", "approved").maybeSingle();
  return data ? { memberId: data.community_member_id, name: data.agency_name } : null;
}

async function isApprovedAgency(memberId: string) {
  const { data } = await db().from("agency_profiles").select("partner_status").eq("community_member_id", memberId).maybeSingle();
  return data?.partner_status === "approved";
}

// ── invites ─────────────────────────────────────────────────────────────────

export async function sendAgencyInvite(args: { agencyMemberId: string; email: unknown; businessName?: unknown }) {
  if (!(await isApprovedAgency(args.agencyMemberId))) return { ok: false as const, error: "Invites open once your agency is approved." };
  if (!isEmail(args.email)) return { ok: false as const, error: "That isn't an email address." };
  const email = args.email.trim().toLowerCase();
  const businessName = String(args.businessName ?? "").trim().slice(0, 120) || null;

  const dayAgo = new Date(Date.now() - 86400_000).toISOString();
  const { count } = await db().from("agency_invites").select("id", { count: "exact", head: true }).eq("agency_member_id", args.agencyMemberId).gte("sent_at", dayAgo);
  if ((count ?? 0) >= INVITES_PER_DAY) return { ok: false as const, error: `You've sent ${INVITES_PER_DAY} invites today. Try again tomorrow.` };

  const { data: recent } = await db().from("agency_invites").select("id").eq("agency_member_id", args.agencyMemberId).eq("email", email).is("accepted_at", null).gte("sent_at", new Date(Date.now() - 7 * 86400_000).toISOString()).limit(1);
  if (recent?.length) return { ok: false as const, error: "You invited that email in the last week. Give them a few days." };

  const { data: agency } = await db().from("agency_profiles").select("agency_name").eq("community_member_id", args.agencyMemberId).maybeSingle();
  const token = randomBytes(24).toString("base64url");
  const { error } = await db().from("agency_invites").insert({
    agency_member_id: args.agencyMemberId,
    email,
    business_name: businessName,
    token_hash: sha(token),
    expires_at: new Date(Date.now() + INVITE_DAYS * 86400_000).toISOString(),
  });
  if (error) return { ok: false as const, error: "Couldn't create the invite." };

  const link = `${SITE_URL}/join/invite/${token}`;
  const agencyName = escapeHtml(agency?.agency_name || "Your agency");
  const sent = await sendGhlEmail({
    email,
    subject: `${agency?.agency_name || "Your agency"} invited you to ShearQuery`,
    html: `<p>Hi${businessName ? ` ${escapeHtml(businessName)}` : ""},</p>
<p>${agencyName} invited you to ShearQuery — the directory and toolkit for barbers, stylists, shops and salons. With a free account you can claim your listing, take appointment requests, and run your Google profile from Claude.</p>
<p><a href="${link}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 16px;border-radius:8px;font-weight:700;text-decoration:none">Accept the invite</a></p>
<p style="color:#64748b;font-size:13px">If you weren't expecting this, you can ignore it.</p>`,
  });
  if (!sent.ok) return { ok: false as const, error: "The invite email couldn't be sent. Check the address and try again." };
  return { ok: true as const };
}

export async function inviteByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return null;
  const { data } = await db()
    .from("agency_invites")
    .select("id, agency_member_id, email, expires_at, accepted_at")
    .eq("token_hash", sha(token))
    .maybeSingle();
  if (!data || new Date(data.expires_at).getTime() < Date.now()) return null;
  return data;
}

// ── credit ──────────────────────────────────────────────────────────────────

/** Record the credit. Returns false when the client already belongs to an agency, or isn't eligible. */
export async function creditReferral(args: { clientMemberId: string; agencyMemberId: string; source: ReferralSource }): Promise<boolean> {
  if (args.clientMemberId === args.agencyMemberId) return false;
  if (!(await isApprovedAgency(args.agencyMemberId))) return false;
  const { data: client } = await db().from("community_members").select("audience").eq("id", args.clientMemberId).maybeSingle();
  // An agency account is a partner, not a client: agencies don't earn on each other.
  if (!client || client.audience === "agency") return false;
  const { error } = await db()
    .from("agency_referrals")
    .insert({ client_member_id: args.clientMemberId, agency_member_id: args.agencyMemberId, source: args.source });
  // 23505: already credited to an agency. First one wins; that is the rule, not a failure.
  return !error;
}

/**
 * Credit a brand-new signup from whatever it carried: an invite cookie, a code
 * typed in the form, or the link cookie. Never throws — a referral problem must
 * not fail somebody's signup.
 */
export async function attributeSignup(args: { clientMemberId: string; inviteToken?: string | null; typedCode?: string | null; linkCode?: string | null }) {
  try {
    const signal = pickReferralSignal(args);
    if (!signal) return;
    if (signal.source === "invite") {
      const invite = await inviteByToken(signal.value);
      if (!invite) return attributeSignup({ ...args, inviteToken: null });
      if (await creditReferral({ clientMemberId: args.clientMemberId, agencyMemberId: invite.agency_member_id, source: "invite" })) {
        await db().from("agency_invites").update({ accepted_at: new Date().toISOString(), accepted_member_id: args.clientMemberId }).eq("id", invite.id);
      }
      return;
    }
    const agency = await approvedAgencyByCode(signal.value);
    if (agency) await creditReferral({ clientMemberId: args.clientMemberId, agencyMemberId: agency.memberId, source: signal.source });
  } catch (e) {
    console.error("[agency] referral attribution failed:", e);
  }
}

// ── the agency's view ───────────────────────────────────────────────────────

export interface AgencyClient {
  memberId: string;
  /** A sample client (agency_demo_clients), not a real business. Never credited. */
  isDemo: boolean;
  name: string;
  email: string | null;
  type: string | null;
  joinedAt: string;
  source: string;
  claimedListing: boolean;
  googleConnected: boolean;
  calendarLive: boolean;
  auditScore: number | null;
}

// ── sample clients ──────────────────────────────────────────────────────────

/**
 * The three sample clients an agency starts with, one per stage of setup, so
 * the client list shows what "done", "halfway" and "just joined" look like.
 * Named as samples so none can be mistaken for, or collide with, a real shop.
 */
const DEMO_CLIENTS = [
  { business_type: "barber", name: "Sample Barber", source: "invite", daysAgo: 21, claimed_listing: true, google_connected: true, calendar_live: true, audit_score: 86 },
  { business_type: "salon", name: "Sample Salon", source: "link", daysAgo: 9, claimed_listing: true, google_connected: true, calendar_live: false, audit_score: 62 },
  { business_type: "school", name: "Sample Barber School", source: "code", daysAgo: 2, claimed_listing: false, google_connected: false, calendar_live: false, audit_score: null },
] as const;

/** Give an agency its sample clients. Idempotent; never throws. */
export async function ensureDemoClients(agencyMemberId: string) {
  try {
    const now = Date.now();
    await db()
      .from("agency_demo_clients")
      .upsert(
        DEMO_CLIENTS.map(({ daysAgo, ...c }) => ({ ...c, agency_member_id: agencyMemberId, joined_at: new Date(now - daysAgo * 86400_000).toISOString() })),
        { onConflict: "agency_member_id,business_type", ignoreDuplicates: true }
      );
  } catch (e) {
    console.error("[agency] sample clients failed:", e);
  }
}

export async function agencyDashboard(agencyMemberId: string) {
  // Covers agency accounts made before sample clients existed.
  await ensureDemoClients(agencyMemberId);
  const { data: refs } = await db()
    .from("agency_referrals")
    .select("client_member_id, source, created_at, member:community_members!agency_referrals_client_member_id_fkey(first_name, last_name, email, audience)")
    .eq("agency_member_id", agencyMemberId)
    .order("created_at", { ascending: false })
    .limit(500);
  const ids = (refs || []).map((r: any) => r.client_member_id);

  const [links, gbp, cal, audits, invites] = await Promise.all([
    ids.length ? db().from("community_member_entity_links").select("community_member_id").in("community_member_id", ids) : { data: [] },
    ids.length ? db().from("gbp_connections").select("community_member_id, status, refresh_token").in("community_member_id", ids) : { data: [] },
    ids.length ? db().from("calendar_providers").select("community_member_id, active, is_demo").in("community_member_id", ids) : { data: [] },
    ids.length ? db().from("gbp_audit_snapshots").select("community_member_id, score, created_at").in("community_member_id", ids).order("created_at", { ascending: false }).limit(2000) : { data: [] },
    db().from("agency_invites").select("email, business_name, sent_at, accepted_at, expires_at").eq("agency_member_id", agencyMemberId).order("sent_at", { ascending: false }).limit(100),
  ]);

  const has = (rows: any, pred: (r: any) => boolean = () => true) => new Set(((rows?.data) || []).filter(pred).map((r: any) => r.community_member_id));
  const claimed = has(links);
  const google = has(gbp, (r) => !!r.refresh_token && r.status !== "revoked");
  const calendar = has(cal, (r) => r.active && !r.is_demo);
  const latestScore = new Map<string, number>();
  for (const a of (audits as any)?.data || []) if (!latestScore.has(a.community_member_id)) latestScore.set(a.community_member_id, a.score);

  const { data: demos } = await db()
    .from("agency_demo_clients")
    .select("business_type, name, source, joined_at, claimed_listing, google_connected, calendar_live, audit_score")
    .eq("agency_member_id", agencyMemberId)
    .order("joined_at", { ascending: false });

  const clients: AgencyClient[] = (refs || []).map((r: any) => ({
    memberId: r.client_member_id,
    isDemo: false,
    name: [r.member?.first_name, r.member?.last_name].filter(Boolean).join(" ") || "—",
    email: r.member?.email ?? null,
    type: r.member?.audience ?? null,
    joinedAt: r.created_at,
    source: r.source,
    claimedListing: claimed.has(r.client_member_id),
    googleConnected: google.has(r.client_member_id),
    calendarLive: calendar.has(r.client_member_id),
    auditScore: latestScore.get(r.client_member_id) ?? null,
  }));
  const samples: AgencyClient[] = (demos || []).map((d: any) => ({
    memberId: `demo-${d.business_type}`,
    isDemo: true,
    name: d.name,
    email: null,
    type: d.business_type,
    joinedAt: d.joined_at,
    source: d.source,
    claimedListing: d.claimed_listing,
    googleConnected: d.google_connected,
    calendarLive: d.calendar_live,
    auditScore: d.audit_score,
  }));
  // Real clients first; samples after, so they never push a real one down.
  return { clients: [...clients, ...samples], realCount: clients.length, invites: (invites as any)?.data || [] };
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** An agency accepts the current partner agreement, typing its name as its signature. */
export async function acceptPartnerAgreement(memberId: string, name: unknown, ip: string | null) {
  const { agreementIsFinal, PARTNER_AGREEMENT } = await import("@/lib/partner-agreement");
  if (!agreementIsFinal()) return { ok: false as const, error: "The partner agreement isn't final yet, so it can't be accepted." };
  const signed = String(name ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 120);
  if (signed.length < 2) return { ok: false as const, error: "Type your full name to accept." };
  const { data: profile } = await db().from("agency_profiles").select("community_member_id").eq("community_member_id", memberId).maybeSingle();
  if (!profile) return { ok: false as const, error: "Add your agency's details first." };
  const { error } = await db().from("agency_profiles").update({
    agreement_version: PARTNER_AGREEMENT.version,
    agreement_accepted_at: new Date().toISOString(),
    agreement_accepted_by: signed,
    agreement_accepted_ip: ip,
  }).eq("community_member_id", memberId);
  return error ? { ok: false as const, error: "Couldn't record that. Try again." } : { ok: true as const, version: PARTNER_AGREEMENT.version };
}
