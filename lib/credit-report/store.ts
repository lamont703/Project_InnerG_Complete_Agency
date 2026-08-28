import "server-only";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentStatus, PaymentWeek, Tradeline } from "./model";

/**
 * Reads and writes for the ShearQuery Credit Report.
 *
 * SERVER ONLY, and the import at the top enforces it rather than trusting a
 * convention. Every table here is RLS-enabled with no policies, so the service
 * role is the only thing that can touch them — which means a single import of
 * this module into a client component would be a build error instead of a
 * silent leak of somebody else's payment record into a browser bundle.
 *
 * THE SHAPE OF THE DATA IS NOT MINE. lib/credit-report/model.ts already defines
 * Tradeline and PaymentWeek and scores against them, and 20260827020000 already
 * defines shop_roster and rent_weeks. This module is the seam between the two
 * and deliberately holds no scoring logic of its own — a second place that
 * decides what a late week is worth is a second answer to the same question.
 */

export interface Enrollment {
  id: string;
  memberId: string | null;
  shopName: string;
  address: string;
  email: string;
  smsPhone: string;
  shopLicenseNumber: string;
  shopLicenseState: string;
  dueDay: string;
  checkinIntervalDays: number;
  lastCheckinAt: string | null;
  nextCheckinAt: string | null;
  status: "active" | "paused" | "ended";
}

export interface RosterEntry {
  id: string;
  barberName: string;
  barberPhone: string | null;
  licenseNumber: string | null;
  resolution: string;
  rentPerWeek: number | null;
  startedAt: string | null;
  endedAt: string | null;
  status: "active" | "ended";
  memberId: string | null;
  inviteToken: string | null;
  invitedAt: string | null;
  claimedAt: string | null;
}

function admin() {
  return createAdminClient() as any;
}

/** URL-safe, 160 bits. Long enough that guessing is not a threat model. */
function token(): string {
  return randomBytes(20).toString("base64url");
}

// ---------------------------------------------------------------------------
// Enrolment
// ---------------------------------------------------------------------------

const ENROLLMENT_COLS =
  "id, member_id, shop_name, address, email, sms_phone, shop_license_number, shop_license_state, due_day, checkin_interval_days, last_checkin_at, next_checkin_at, status";

function toEnrollment(r: any): Enrollment {
  return {
    id: r.id,
    memberId: r.member_id ?? null,
    shopName: r.shop_name,
    address: r.address,
    email: r.email,
    smsPhone: r.sms_phone,
    shopLicenseNumber: r.shop_license_number,
    shopLicenseState: r.shop_license_state,
    dueDay: r.due_day,
    checkinIntervalDays: r.checkin_interval_days,
    lastCheckinAt: r.last_checkin_at ?? null,
    nextCheckinAt: r.next_checkin_at ?? null,
    status: r.status,
  };
}

export async function enrollmentForMember(memberId: string): Promise<Enrollment | null> {
  const { data } = await admin()
    .from("credit_report_shops")
    .select(ENROLLMENT_COLS)
    .eq("member_id", memberId)
    .neq("status", "ended")
    .maybeSingle();
  return data ? toEnrollment(data) : null;
}

export interface EnrollInput {
  shopName: string;
  address: string;
  email: string;
  smsPhone: string;
  shopLicenseNumber: string;
  shopLicenseState?: string;
  dueDay?: string;
  consentIp?: string | null;
}

export async function enrollShop(
  memberId: string | null,
  input: EnrollInput
): Promise<{ ok: boolean; id?: string; error?: string }> {
  /*
   * The first check-in is scheduled at enrolment rather than by a job that
   * scans for shops with no next_checkin_at. A row that is due but has never
   * been given a date is indistinguishable from one that is not due yet, and
   * the failure is silent: the shop simply never hears from us.
   */
  const next = new Date();
  next.setDate(next.getDate() + 14);

  const { data, error } = await admin()
    .from("credit_report_shops")
    .insert({
      member_id: memberId,
      shop_name: input.shopName,
      address: input.address,
      email: input.email,
      sms_phone: input.smsPhone,
      shop_license_number: input.shopLicenseNumber,
      shop_license_state: input.shopLicenseState ?? "TX",
      due_day: input.dueDay ?? "Monday",
      sms_consent_ip: input.consentIp ?? null,
      next_checkin_at: next.toISOString(),
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

export async function updateEnrollment(
  id: string,
  patch: Partial<Pick<EnrollInput, "shopName" | "address" | "email" | "smsPhone" | "shopLicenseNumber" | "dueDay">>
): Promise<{ ok: boolean; error?: string }> {
  const row: any = { updated_at: new Date().toISOString() };
  if (patch.shopName !== undefined) row.shop_name = patch.shopName;
  if (patch.address !== undefined) row.address = patch.address;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.smsPhone !== undefined) row.sms_phone = patch.smsPhone;
  if (patch.shopLicenseNumber !== undefined) row.shop_license_number = patch.shopLicenseNumber;
  if (patch.dueDay !== undefined) row.due_day = patch.dueDay;

  const { error } = await admin().from("credit_report_shops").update(row).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------------------------------------------------------------------------
// Roster
// ---------------------------------------------------------------------------

const ROSTER_COLS =
  "id, barber_name, barber_phone, license_number, resolution, rent_per_week, started_at, ended_at, status, member_id, invite_token, invited_at, claimed_at";

function toRoster(r: any): RosterEntry {
  return {
    id: r.id,
    barberName: r.barber_name,
    barberPhone: r.barber_phone ?? null,
    licenseNumber: r.license_number ?? null,
    resolution: r.resolution,
    rentPerWeek: r.rent_per_week == null ? null : Number(r.rent_per_week),
    startedAt: r.started_at ?? null,
    endedAt: r.ended_at ?? null,
    status: r.status,
    memberId: r.member_id ?? null,
    inviteToken: r.invite_token ?? null,
    invitedAt: r.invited_at ?? null,
    claimedAt: r.claimed_at ?? null,
  };
}

export async function rosterFor(enrollmentId: string): Promise<RosterEntry[]> {
  const { data } = await admin()
    .from("shop_roster")
    .select(ROSTER_COLS)
    .eq("enrollment_id", enrollmentId)
    .order("barber_name");
  return (data ?? []).map(toRoster);
}

export async function addWorker(
  enrollment: Enrollment,
  input: { name: string; phone?: string | null; rentPerWeek?: number | null; startedAt?: string | null }
): Promise<{ ok: boolean; id?: string; inviteToken?: string | null; error?: string }> {
  /*
   * An invite token is minted ONLY when there is a phone to send it to.
   * Otherwise the row would carry a live claim link that nobody was ever given
   * — a credential sitting in a database for no reason, and a way for anyone
   * who saw it to take over somebody else's record.
   */
  const invite = input.phone ? token() : null;

  const { data, error } = await admin()
    .from("shop_roster")
    .insert({
      enrollment_id: enrollment.id,
      shop_id: enrollment.id, // no claimed listing required to report
      shop_type: "shop",
      barber_name: input.name,
      barber_phone: input.phone || null,
      rent_per_week: input.rentPerWeek ?? null,
      started_at: input.startedAt || null,
      source: "owner_web",
      invite_token: invite,
      invited_at: invite ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id, inviteToken: invite };
}

export async function updateWorker(
  rosterId: string,
  patch: { name?: string; phone?: string | null; rentPerWeek?: number | null; status?: "active" | "ended"; endedAt?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const row: any = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.barber_name = patch.name;
  if (patch.phone !== undefined) row.barber_phone = patch.phone || null;
  if (patch.rentPerWeek !== undefined) row.rent_per_week = patch.rentPerWeek;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.endedAt !== undefined) row.ended_at = patch.endedAt || null;

  const { error } = await admin().from("shop_roster").update(row).eq("id", rosterId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------------------------------------------------------------------------
// Payment weeks
// ---------------------------------------------------------------------------

export async function weeksFor(rosterId: string): Promise<PaymentWeek[]> {
  const { data } = await admin()
    .from("rent_weeks")
    .select("week_start, status, days_late, note")
    .eq("roster_id", rosterId)
    .order("week_start");
  return (data ?? []).map((w: any) => ({
    weekStart: w.week_start,
    status: w.status as PaymentStatus,
    daysLate: w.days_late ?? null,
    amount: null,
    note: w.note ?? null,
  }));
}

/**
 * Record or correct one week.
 *
 * UPSERT ON (roster_id, week_start), which the unique index in 20260827020000
 * already enforces. Correcting history is a first-class action here, not an
 * edge case: an owner reconstructing months of records from memory will get
 * some of them wrong, and a system that only allows append forces them to
 * choose between an inaccurate record and no record.
 *
 * `reportedByPhone` carries the attribution that migration insisted on. A
 * correction made on the web is attributed to the enrolment's SMS number,
 * because that is the shop making the statement either way.
 */
export async function upsertWeek(
  rosterId: string,
  week: { weekStart: string; status: PaymentStatus; daysLate?: number | null; note?: string | null },
  reportedByPhone: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (week.status === "no_record") {
    const { error } = await admin()
      .from("rent_weeks")
      .delete()
      .eq("roster_id", rosterId)
      .eq("week_start", week.weekStart);
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  const { error } = await admin()
    .from("rent_weeks")
    .upsert(
      {
        roster_id: rosterId,
        week_start: week.weekStart,
        status: week.status,
        days_late: week.status === "late" || week.status === "caught_up" ? week.daysLate ?? null : null,
        note: week.note ?? null,
        reported_by_phone: reportedByPhone,
        reported_at: new Date().toISOString(),
      },
      { onConflict: "roster_id,week_start" }
    );
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------------------------------------------------------------------------
// The report itself
// ---------------------------------------------------------------------------

/**
 * Every tradeline belonging to one member, ready for buildReport().
 *
 * Keyed on shop_roster.member_id — the CLAIMED rows. An unclaimed row is a
 * statement a shop has made about a name, and until the person behind that
 * name proves they are it, it is not their report to see or to share.
 */
export async function tradelinesForMember(memberId: string): Promise<Tradeline[]> {
  const { data: roster } = await admin()
    .from("shop_roster")
    .select(`id, rent_per_week, started_at, ended_at, credit_report_shops ( shop_name, address, due_day )`)
    .eq("member_id", memberId)
    .order("started_at", { ascending: false });

  const rows = roster ?? [];
  const out: Tradeline[] = [];
  for (const r of rows) {
    const shop = Array.isArray(r.credit_report_shops) ? r.credit_report_shops[0] : r.credit_report_shops;
    out.push({
      shopName: shop?.shop_name ?? "Unnamed shop",
      shopSlug: null,
      city: shop?.address ?? "",
      rentPerWeek: r.rent_per_week == null ? 0 : Number(r.rent_per_week),
      dueDay: shop?.due_day ?? "Monday",
      startedAt: r.started_at ?? "",
      endedAt: r.ended_at ?? null,
      weeks: await weeksFor(r.id),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Sharing
// ---------------------------------------------------------------------------

export interface Share {
  id: string;
  token: string;
  label: string | null;
  expiresAt: string;
  revokedAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
}

function toShare(r: any): Share {
  return {
    id: r.id,
    token: r.token,
    label: r.label ?? null,
    expiresAt: r.expires_at,
    revokedAt: r.revoked_at ?? null,
    viewCount: r.view_count ?? 0,
    lastViewedAt: r.last_viewed_at ?? null,
    createdAt: r.created_at,
  };
}

export async function listShares(memberId: string): Promise<Share[]> {
  const { data } = await admin()
    .from("credit_report_shares")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(toShare);
}

export async function createShare(
  memberId: string,
  label: string | null,
  days = 30
): Promise<{ ok: boolean; share?: Share; error?: string }> {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  const { data, error } = await admin()
    .from("credit_report_shares")
    .insert({ member_id: memberId, token: token(), label, expires_at: expires.toISOString() })
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, share: toShare(data) };
}

export async function revokeShare(memberId: string, shareId: string): Promise<{ ok: boolean; error?: string }> {
  // Scoped by member_id as well as id: an id alone would let anyone who
  // obtained one revoke somebody else's link.
  const { error } = await admin()
    .from("credit_report_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", shareId)
    .eq("member_id", memberId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Resolve a share token to the member whose report it exposes.
 *
 * Returns null for unknown, revoked AND expired alike — the caller cannot tell
 * which, and should not be able to. Distinguishing "this link was revoked" from
 * "this link never existed" tells a stranger that a particular person is on the
 * system, which is the one thing the privacy model promises it will not do.
 */
export async function resolveShare(shareToken: string): Promise<{ memberId: string; shareId: string } | null> {
  const { data } = await admin()
    .from("credit_report_shares")
    .select("id, member_id, expires_at, revoked_at")
    .eq("token", shareToken)
    .maybeSingle();

  if (!data) return null;
  if (data.revoked_at) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return { memberId: data.member_id, shareId: data.id };
}

export async function recordShareView(shareId: string, currentCount: number): Promise<void> {
  await admin()
    .from("credit_report_shares")
    .update({ view_count: currentCount + 1, last_viewed_at: new Date().toISOString() })
    .eq("id", shareId);
}

/** Claim an invited roster row. The token is the proof; it is single-use. */
export async function claimInvite(
  inviteToken: string,
  memberId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data } = await admin()
    .from("shop_roster")
    .select("id, member_id")
    .eq("invite_token", inviteToken)
    .maybeSingle();

  if (!data) return { ok: false, error: "That invite link is not valid." };
  if (data.member_id) return { ok: false, error: "That invite has already been claimed." };

  const { error } = await admin()
    .from("shop_roster")
    .update({ member_id: memberId, claimed_at: new Date().toISOString(), invite_token: null })
    .eq("id", data.id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
