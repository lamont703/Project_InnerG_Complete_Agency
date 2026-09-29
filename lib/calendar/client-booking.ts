import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCalendarAccess } from "@/lib/feature-access";
import {
  getHours, listServices, findOpenTimes, upsertClient, bookAppointment, getAppointment, setAppointmentStatus, moveAppointment,
  normalisePhone, listingName, type Provider, type Service, type Appointment,
} from "@/lib/calendar/store";
import { amountDueCents, clientMayChange, policyFrom, HOLD_MINUTES, type PaymentMode } from "@/lib/calendar/policy";
import { localDateKey } from "@/lib/calendar/time";
import { notifyBooked, notifyCancelled, sendText } from "@/lib/calendar/notify";

/**
 * Clients booking on a pro's calendar — from the listing's Book button or from
 * their own Claude.
 *
 * A CLIENT IS A VERIFIED PHONE. Names are typed and can be anything; a phone
 * proven by a text code is what stops one person's Claude filling a barber's
 * day with invented bookings, and it is what links a client's web and Claude
 * bookings into one record. Everything a client can do is bounded by the
 * limits below, which hold whichever door they come through.
 *
 * Only calendars whose OWNER is on the calendar allowlist are bookable while
 * this is in testing (bookableProvider). Clients themselves are not
 * allowlisted — a second account is how the owner tests it.
 */

export const CLIENT_LIMITS = {
  /** Live upcoming appointments one client may hold with one pro. */
  maxUpcomingPerPro: 2,
  codeTtlMinutes: 10,
  codeMaxAttempts: 5,
  codesPerPhonePerHour: 3,
  codesPerRequesterPerHour: 6,
} as const;

const db = () => createAdminClient() as any;
const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

// ── which calendars can be booked ───────────────────────────────────────────

export interface BookablePro {
  provider: Provider;
  listing: string | null;
  services: Service[];
}

/** A calendar clients may book: active, owner allowlisted, with hours and at least one service. */
export async function bookableProvider(providerId: string): Promise<BookablePro | null> {
  if (!/^[0-9a-f-]{36}$/i.test(providerId)) return null;
  const { data: p } = await db()
    .from("calendar_providers")
    .select("*, member:community_members(email)")
    .eq("id", providerId)
    .eq("active", true)
    .maybeSingle();
  if (!p || !(await hasCalendarAccess(p.member?.email))) return null;
  const [services, hours] = await Promise.all([listServices(p.id), getHours(p.id)]);
  if (!services.length || !hours.length) return null;
  const { member: _m, ...provider } = p;
  return { provider, listing: await listingName(provider), services };
}

/** The bookable calendar behind a directory listing, if its owner has one. */
export async function bookableForEntity(entityType: string, entityId: string): Promise<BookablePro | null> {
  const { data } = await db()
    .from("calendar_providers")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("active", true)
    .limit(5);
  for (const row of data || []) {
    const pro = await bookableProvider(row.id);
    if (pro) return pro;
  }
  return null;
}

/**
 * For Claude: bookable pros matching a name or business, newest calendars first.
 *
 * Demo calendars are left out — a real client must never find and book the
 * made-up shop — except for the demo's own owner, who is testing it.
 */
export async function searchBookablePros(query: string, viewerMemberId?: string | null): Promise<BookablePro[]> {
  const { data } = await db()
    .from("calendar_providers")
    .select("id, display_name, is_demo, community_member_id")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(50);
  const q = query.trim().toLowerCase();
  const out: BookablePro[] = [];
  for (const row of data || []) {
    if (row.is_demo && row.community_member_id !== viewerMemberId) continue;
    const pro = await bookableProvider(row.id);
    if (!pro) continue;
    const hay = `${pro.provider.display_name} ${pro.listing || ""}`.toLowerCase();
    if (!q || hay.includes(q)) out.push(pro);
    if (out.length >= 10) break;
  }
  return out;
}

export async function clientOpenTimes(pro: BookablePro, service: Service, fromKey: string, toKey: string, limit = 40) {
  const { provider } = pro;
  // A time held for a client who never paid is free again once its hold runs out.
  const { releaseExpiredHolds } = await import("@/lib/calendar/payments");
  await releaseExpiredHolds(provider.id).catch((e) => console.error("[calendar] hold release failed:", e?.message));
  const lastKey = localDateKey(new Date(Date.now() + provider.booking_window_days * 86400_000), provider.timezone);
  if (fromKey > lastKey) return [];
  return findOpenTimes({ provider, service, fromKey, toKey: toKey > lastKey ? lastKey : toKey, forClient: true, limit });
}

// ── text codes ──────────────────────────────────────────────────────────────

export type CodeSend = { ok: true } | { ok: false; reason: string };

/**
 * Send a 6-digit code. Rate-limited per phone and per requester (member or
 * IP), so the endpoint cannot be used to text a stranger repeatedly.
 */
export async function sendPhoneCode(args: { phone: unknown; memberId?: string | null; ip?: string | null }): Promise<CodeSend> {
  const phone = normalisePhone(args.phone);
  if (!phone) return { ok: false, reason: "That doesn't look like a full mobile number with area code." };
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();

  const { count: perPhone } = await db().from("calendar_phone_codes").select("id", { count: "exact", head: true }).eq("phone", phone).gte("created_at", hourAgo);
  if ((perPhone ?? 0) >= CLIENT_LIMITS.codesPerPhonePerHour) return { ok: false, reason: "Too many codes sent to that number. Try again in an hour." };

  const requester = args.ip || "unknown";
  let q = db().from("calendar_phone_codes").select("id", { count: "exact", head: true }).gte("created_at", hourAgo);
  q = args.memberId ? q.eq("community_member_id", args.memberId) : q.eq("requester_ip", requester);
  const { count: perRequester } = await q;
  if ((perRequester ?? 0) >= CLIENT_LIMITS.codesPerRequesterPerHour) return { ok: false, reason: "Too many codes requested. Try again in an hour." };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { error } = await db().from("calendar_phone_codes").insert({
    phone,
    code_hash: sha(`${phone}:${code}`),
    community_member_id: args.memberId ?? null,
    requester_ip: args.memberId ? null : requester,
    expires_at: new Date(Date.now() + CLIENT_LIMITS.codeTtlMinutes * 60_000).toISOString(),
  });
  if (error) return { ok: false, reason: "Could not create a code. Try again." };

  const sent = await sendText(phone, `Your ShearQuery booking code is ${code}. It expires in ${CLIENT_LIMITS.codeTtlMinutes} minutes. If you didn't ask for this, ignore it.`);
  if (!sent.ok) return { ok: false, reason: "The code couldn't be texted. Check the number and try again." };
  return { ok: true };
}

/** Check a code against the newest live one for the phone. Single use. */
export async function checkPhoneCode(phoneRaw: unknown, codeRaw: unknown): Promise<{ ok: true; phone: string } | { ok: false; reason: string }> {
  const phone = normalisePhone(phoneRaw);
  const code = String(codeRaw ?? "").replace(/\D/g, "");
  if (!phone || code.length !== 6) return { ok: false, reason: "Enter the 6-digit code from the text." };

  const { data: row } = await db()
    .from("calendar_phone_codes")
    .select("id, code_hash, attempts, expires_at")
    .eq("phone", phone)
    .is("verified_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return { ok: false, reason: "That code has expired. Ask for a new one." };
  if (row.attempts >= CLIENT_LIMITS.codeMaxAttempts) return { ok: false, reason: "Too many wrong tries. Ask for a new code." };

  await db().from("calendar_phone_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
  const a = Buffer.from(sha(`${phone}:${code}`));
  const b = Buffer.from(row.code_hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "That code isn't right." };

  // Claimed atomically: a code verifies once.
  const { data: claimed } = await db().from("calendar_phone_codes").update({ verified_at: new Date().toISOString() }).eq("id", row.id).is("verified_at", null).select("id");
  if (!claimed?.length) return { ok: false, reason: "That code was already used. Ask for a new one." };
  return { ok: true, phone };
}

export async function getMemberPhone(memberId: string): Promise<string | null> {
  const { data } = await db().from("member_verified_phones").select("phone").eq("community_member_id", memberId).maybeSingle();
  return data?.phone ?? null;
}

export async function setMemberPhone(memberId: string, phone: string) {
  await db().from("member_verified_phones").upsert({ community_member_id: memberId, phone, verified_at: new Date().toISOString() }, { onConflict: "community_member_id" });
}

// ── booking ─────────────────────────────────────────────────────────────────

export type ClientBookResult =
  | {
      ok: true; appointment: Appointment; manageUrl: string; pro: BookablePro;
      /** Present when the pro takes payment at booking: the time is HELD until the client pays here. */
      payment?: { url: string; mode: PaymentMode; dueCents: number; tipCents: number; holdUntil: Date };
    }
  | { ok: false; reason: string };

/**
 * Book as a client. The phone must already be verified by the caller.
 *
 * The time must be one clientOpenTimes would offer — inside hours, outside
 * time off, after the minimum notice, within the booking window. A client can
 * never pass "book it anyway"; that is the pro's call alone.
 */
export async function clientBook(args: {
  pro: BookablePro;
  service: Service;
  start: Date;
  name: string;
  phone: string;
  memberId?: string | null;
  notes?: string | null;
  source: "web" | "client_claude";
  origin: string;
  /** Optional tip added to a booking payment, in cents. Ignored when nothing is paid at booking. */
  tipCents?: number;
}): Promise<ClientBookResult> {
  const { pro, service, start } = args;
  const { provider } = pro;
  const name = args.name.trim().slice(0, 80);
  if (!name) return { ok: false, reason: "Add a name for the booking." };

  const key = localDateKey(start, provider.timezone);
  const offered = await clientOpenTimes(pro, service, key, key, 200);
  if (!offered.some((d) => d.getTime() === start.getTime())) {
    return { ok: false, reason: "That time isn't open. Pick one of the open times." };
  }

  const client = await upsertClient(provider.id, { name, phone: args.phone });
  if (args.memberId) {
    await db().from("calendar_clients").update({ community_member_id: args.memberId }).eq("id", client.id).is("community_member_id", null);
  }

  const { count } = await db()
    .from("calendar_appointments")
    .select("id", { count: "exact", head: true })
    .eq("provider_id", provider.id)
    .eq("client_id", client.id)
    .in("status", ["pending_payment", "booked", "confirmed"])
    .gte("starts_at", new Date().toISOString());
  if ((count ?? 0) >= CLIENT_LIMITS.maxUpcomingPerPro) {
    return { ok: false, reason: `You already have ${count} upcoming appointments with ${provider.display_name}. Cancel one to book another, or contact them directly.` };
  }

  // The pro's payment rule, as it applies right now (plan and Stripe readiness
  // included), and the rules the client is agreeing to — kept on the booking.
  const { paymentTerms, createBookingCheckout, clampTip, releaseHold } = await import("@/lib/calendar/payments");
  const terms = await paymentTerms(provider);
  const due = amountDueCents(terms.policy, terms.mode, service.price_cents);
  const tip = due > 0 && terms.tipsAvailable ? clampTip(args.tipCents) : 0;
  const snapshot = { ...terms.policy, payment_mode: due > 0 ? terms.mode : "none" };

  const res = await bookAppointment({
    provider, service, start, client, notes: args.notes, source: args.source,
    payment: due > 0
      ? { status: "pending_payment", paymentStatus: "awaiting", amountDueCents: due, holdExpiresAt: new Date(Date.now() + (HOLD_MINUTES + 1) * 60_000), policy: snapshot }
      : { status: "booked", paymentStatus: "none", amountDueCents: null, holdExpiresAt: null, policy: snapshot },
  });
  if (!res.ok) return { ok: false, reason: res.reason.replace(/ Ask the owner.*$/, "").replace(/ Use find_open_times.*$/, "") };

  const token = randomBytes(24).toString("base64url");
  await db()
    .from("calendar_appointments")
    .update({ manage_token_hash: sha(token), booked_by_member_id: args.memberId ?? null })
    .eq("id", res.appointment.id);
  const manageUrl = `${args.origin}/appointments/${token}`;

  if (due > 0) {
    // Nobody is texted yet: it isn't a booking until it's paid.
    const co = await createBookingCheckout({ provider, appointment: res.appointment, mode: terms.mode, dueCents: due, tipCents: tip, token, origin: args.origin });
    if (!co.ok) {
      await releaseHold(provider.id, res.appointment.id);
      return { ok: false, reason: co.error };
    }
    return { ok: true, appointment: res.appointment, manageUrl, pro, payment: { url: co.url, mode: terms.mode, dueCents: due, tipCents: tip, holdUntil: co.expiresAt } };
  }

  await notifyBooked({ pro, appointment: res.appointment, clientPhone: args.phone, manageUrl });
  return { ok: true, appointment: res.appointment, manageUrl, pro };
}

// ── the client's own appointments ───────────────────────────────────────────

/** An appointment by its texted manage link. */
export async function appointmentByToken(token: string): Promise<{ appointment: Appointment; pro: BookablePro | null; providerId: string } | null> {
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return null;
  const { data } = await db().from("calendar_appointments").select("id, provider_id").eq("manage_token_hash", sha(token)).maybeSingle();
  if (!data) return null;
  const appointment = await getAppointment(data.provider_id, data.id);
  if (!appointment) return null;
  return { appointment, pro: await bookableProvider(data.provider_id), providerId: data.provider_id };
}

/** Everything a signed-in member booked as a client, across pros. */
export async function memberAppointments(memberId: string) {
  const phone = await getMemberPhone(memberId);
  let q = db().from("calendar_clients").select("id");
  q = phone ? q.or(`community_member_id.eq.${memberId},phone.eq.${phone}`) : q.eq("community_member_id", memberId);
  const { data: clients } = await q;
  const ids = (clients || []).map((c: any) => c.id);
  if (!ids.length) return [];
  const { data } = await db()
    .from("calendar_appointments")
    .select("id, provider_id, starts_at, ends_at, status, service_name, price_cents, payment_status, provider:calendar_providers(display_name, timezone)")
    .in("client_id", ids)
    .gte("starts_at", new Date(Date.now() - 30 * 86400_000).toISOString())
    .order("starts_at")
    .limit(30);
  return data || [];
}

/**
 * Cancel as the client. Outside the cutoff only; inside it, the client is told
 * to contact the pro, because a last-minute cancellation is a conversation.
 */
export async function clientCancel(args: { providerId: string; appointmentId: string; reason?: string | null }): Promise<{ ok: boolean; reason?: string; refund?: string | null }> {
  const appt = await getAppointment(args.providerId, args.appointmentId);
  if (!appt) return { ok: false, reason: "Appointment not found." };
  const { releaseHold, settleCancellation } = await import("@/lib/calendar/payments");
  // Not paid yet: nothing to refund, just let the held time go.
  if (appt.status === "pending_payment") {
    await releaseHold(args.providerId, appt.id);
    return { ok: true, refund: null };
  }
  if (!["booked", "confirmed"].includes(appt.status)) return { ok: false, reason: `This appointment is already ${appt.status.replace("_", "-")}.` };
  const policy = await rulesFor(args.providerId, appt);
  const minutesAway = (new Date(appt.starts_at).getTime() - Date.now()) / 60_000;
  const may = clientMayChange(policy, "cancel", minutesAway);
  if (!may.ok) return { ok: false, reason: may.reason };
  const res = await setAppointmentStatus({ providerId: args.providerId, id: appt.id, status: "cancelled", reason: args.reason ?? "cancelled by client" });
  if (!res.ok) return { ok: false, reason: res.reason };
  await db().from("calendar_appointments").update({ cancelled_by: "client" }).eq("id", appt.id);
  const refund = await settleCancellation({ providerId: args.providerId, appointment: appt, by: "client" });
  const pro = await bookableProvider(args.providerId);
  if (pro) await notifyCancelled({ pro, appointment: appt, by: "client" });
  return { ok: true, refund };
}

/** The rules a booking was made under, or the pro's current ones for a booking made before rules were kept. */
export async function rulesFor(providerId: string, appt: Appointment) {
  if (appt.policy) return policyFrom(appt.policy as any);
  const { data } = await db().from("calendar_providers").select("*").eq("id", providerId).maybeSingle();
  return policyFrom(data);
}

export { normalisePhone };

/**
 * Move a client's own booking to another open time, for the same service.
 * Same rules as booking (the new time must be one clientOpenTimes offers) and
 * as cancelling (not within the cutoff). The pro and the client are texted.
 */
export async function clientReschedule(args: { providerId: string; appointmentId: string; start: Date }): Promise<{ ok: true; appointment: Appointment; pro: BookablePro } | { ok: false; reason: string }> {
  const appt = await getAppointment(args.providerId, args.appointmentId);
  if (!appt) return { ok: false, reason: "Appointment not found." };
  if (appt.status === "pending_payment") return { ok: false, reason: "This booking isn't paid yet. Finish paying, or cancel it and book the new time." };
  if (!["booked", "confirmed"].includes(appt.status)) return { ok: false, reason: `This appointment is already ${appt.status.replace("_", "-")}.` };
  const may = clientMayChange(await rulesFor(args.providerId, appt), "reschedule", (new Date(appt.starts_at).getTime() - Date.now()) / 60_000, appt.reschedule_count ?? 0);
  if (!may.ok) return { ok: false, reason: may.reason };
  const pro = await bookableProvider(args.providerId);
  if (!pro) return { ok: false, reason: "This calendar isn't taking bookings online right now. Contact them directly." };
  const service = pro.services.find((s) => s.name.toLowerCase() === appt.service_name.toLowerCase());
  if (!service) return { ok: false, reason: `${appt.service_name} isn't offered online any more. Contact them directly to change it.` };
  const key = localDateKey(args.start, pro.provider.timezone);
  const offered = await clientOpenTimes(pro, service, key, key, 200);
  if (!offered.some((d) => d.getTime() === args.start.getTime())) return { ok: false, reason: "That time isn't open. Pick one of the open times." };
  const moved = await moveAppointment({ provider: pro.provider, id: appt.id, start: args.start, countAsClientReschedule: true });
  if (!moved.ok) return { ok: false, reason: moved.reason };
  const { notifyMoved } = await import("@/lib/calendar/notify");
  await notifyMoved({ pro, before: appt, after: moved.appointment }).catch(() => {});
  return { ok: true, appointment: moved.appointment, pro };
}
