import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCalendarAccess } from "@/lib/feature-access";
import {
  getHours, listServices, findOpenTimes, upsertClient, bookAppointment, getAppointment, setAppointmentStatus, moveAppointment,
  normalisePhone, listingName, type Provider, type Service, type Appointment,
} from "@/lib/calendar/store";
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
  /** Inside this, a client calls the shop instead of cancelling here. */
  cancelCutoffMinutes: 120,
  codeTtlMinutes: 10,
  codeMaxAttempts: 5,
  codesPerPhonePerHour: 3,
  codesPerRequesterPerHour: 6,
  /**
   * Codes per hour from one AI assistant's server address. A guest booking
   * from Claude or ChatGPT reaches us from THEIR servers, shared by all their
   * users, so the website's per-visitor 6 would let the seventh person on
   * ChatGPT that hour be refused. The per-phone limit is unchanged, so no one
   * number can be spammed either way.
   */
  codesPerAiServerPerHour: 60,
  /** How long a guest pass lasts after one verified code. */
  guestPassMinutes: 30,
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
export async function sendPhoneCode(args: { phone: unknown; memberId?: string | null; ip?: string | null; viaAi?: boolean }): Promise<CodeSend> {
  const phone = normalisePhone(args.phone);
  if (!phone) return { ok: false, reason: "That doesn't look like a full mobile number with area code." };
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();

  const { count: perPhone } = await db().from("calendar_phone_codes").select("id", { count: "exact", head: true }).eq("phone", phone).gte("created_at", hourAgo);
  if ((perPhone ?? 0) >= CLIENT_LIMITS.codesPerPhonePerHour) return { ok: false, reason: "Too many codes sent to that number. Try again in an hour." };

  // AI guest requests are counted under their own key, since the address is
  // the AI provider's server, not the client's.
  const requester = args.viaAi ? `ai:${args.ip || "unknown"}` : args.ip || "unknown";
  const cap = args.memberId ? CLIENT_LIMITS.codesPerRequesterPerHour : args.viaAi ? CLIENT_LIMITS.codesPerAiServerPerHour : CLIENT_LIMITS.codesPerRequesterPerHour;
  let q = db().from("calendar_phone_codes").select("id", { count: "exact", head: true }).gte("created_at", hourAgo);
  q = args.memberId ? q.eq("community_member_id", args.memberId) : q.eq("requester_ip", requester);
  const { count: perRequester } = await q;
  if ((perRequester ?? 0) >= cap) return { ok: false, reason: "Too many codes requested. Try again in an hour." };

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
  | { ok: true; appointment: Appointment; manageUrl: string; pro: BookablePro }
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
    .in("status", ["booked", "confirmed"])
    .gte("starts_at", new Date().toISOString());
  if ((count ?? 0) >= CLIENT_LIMITS.maxUpcomingPerPro) {
    return { ok: false, reason: `You already have ${count} upcoming appointments with ${provider.display_name}. Cancel one to book another, or contact them directly.` };
  }

  const res = await bookAppointment({ provider, service, start, client, notes: args.notes, source: args.source });
  if (!res.ok) return { ok: false, reason: res.reason.replace(/ Ask the owner.*$/, "").replace(/ Use find_open_times.*$/, "") };

  const token = randomBytes(24).toString("base64url");
  await db()
    .from("calendar_appointments")
    .update({ manage_token_hash: sha(token), booked_by_member_id: args.memberId ?? null })
    .eq("id", res.appointment.id);
  const manageUrl = `${args.origin}/appointments/${token}`;

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
    .select("id, provider_id, starts_at, ends_at, status, service_name, price_cents, provider:calendar_providers(display_name, timezone)")
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
export async function clientCancel(args: { providerId: string; appointmentId: string; reason?: string | null }): Promise<{ ok: boolean; reason?: string }> {
  const appt = await getAppointment(args.providerId, args.appointmentId);
  if (!appt) return { ok: false, reason: "Appointment not found." };
  if (!["booked", "confirmed"].includes(appt.status)) return { ok: false, reason: `This appointment is already ${appt.status.replace("_", "-")}.` };
  const minutesAway = (new Date(appt.starts_at).getTime() - Date.now()) / 60_000;
  if (minutesAway < CLIENT_LIMITS.cancelCutoffMinutes) {
    return { ok: false, reason: `It's less than ${CLIENT_LIMITS.cancelCutoffMinutes / 60} hours away, so it can't be cancelled online. Contact them directly.` };
  }
  const res = await setAppointmentStatus({ providerId: args.providerId, id: appt.id, status: "cancelled", reason: args.reason ?? "cancelled by client" });
  if (!res.ok) return { ok: false, reason: res.reason };
  await db().from("calendar_appointments").update({ cancelled_by: "client" }).eq("id", appt.id);
  const pro = await bookableProvider(args.providerId);
  if (pro) await notifyCancelled({ pro, appointment: appt, by: "client" });
  return { ok: true };
}

export { normalisePhone };

// ── guests managing their own bookings, without an account ─────────────────

/** After one verified code: a pass the client's AI can use for the next steps. */
export async function issueGuestPass(phone: string): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  await db().from("calendar_guest_passes").insert({
    token_hash: sha(token), phone, expires_at: new Date(Date.now() + CLIENT_LIMITS.guestPassMinutes * 60_000).toISOString(),
  });
  return token;
}

/** The verified phone behind a live pass, or null. */
export async function phoneFromGuestPass(token: unknown): Promise<string | null> {
  const t = String(token ?? "");
  if (!/^[A-Za-z0-9_-]{32}$/.test(t)) return null;
  const { data } = await db().from("calendar_guest_passes").select("phone, expires_at").eq("token_hash", sha(t)).maybeSingle();
  return data && new Date(data.expires_at) > new Date() ? data.phone : null;
}

/** A client's upcoming live bookings, across every pro, by their verified phone. */
export async function upcomingForPhone(phone: string) {
  const { data: clients } = await db().from("calendar_clients").select("id, provider_id").eq("phone", phone);
  if (!clients?.length) return [];
  const { data } = await db()
    .from("calendar_appointments")
    .select("id, provider_id, starts_at, status, service_name, price_cents, client_id")
    .in("client_id", clients.map((c: any) => c.id))
    .in("status", ["booked", "confirmed"])
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(20);
  return (data || []) as { id: string; provider_id: string; starts_at: string; status: string; service_name: string; price_cents: number | null; client_id: string }[];
}

/** Whether this appointment belongs to that phone — the check before a guest acts on it. */
export async function appointmentBelongsToPhone(appointmentId: string, phone: string): Promise<string | null> {
  const { data } = await db().from("calendar_appointments").select("provider_id, client:calendar_clients(phone)").eq("id", appointmentId).maybeSingle();
  return data?.client?.phone === phone ? data.provider_id : null;
}

/**
 * Move a client's own booking to another open time, for the same service.
 * Same rules as booking (the new time must be one clientOpenTimes offers) and
 * as cancelling (not within the cutoff). The pro and the client are texted.
 */
export async function clientReschedule(args: { providerId: string; appointmentId: string; start: Date }): Promise<{ ok: true; appointment: Appointment; pro: BookablePro } | { ok: false; reason: string }> {
  const appt = await getAppointment(args.providerId, args.appointmentId);
  if (!appt) return { ok: false, reason: "Appointment not found." };
  if (!["booked", "confirmed"].includes(appt.status)) return { ok: false, reason: `This appointment is already ${appt.status.replace("_", "-")}.` };
  if ((new Date(appt.starts_at).getTime() - Date.now()) / 60_000 < CLIENT_LIMITS.cancelCutoffMinutes) {
    return { ok: false, reason: `It's less than ${CLIENT_LIMITS.cancelCutoffMinutes / 60} hours away, so it can't be changed online. Contact them directly.` };
  }
  const pro = await bookableProvider(args.providerId);
  if (!pro) return { ok: false, reason: "This calendar isn't taking bookings online right now. Contact them directly." };
  const service = pro.services.find((s) => s.name.toLowerCase() === appt.service_name.toLowerCase());
  if (!service) return { ok: false, reason: `${appt.service_name} isn't offered online any more. Contact them directly to change it.` };
  const key = localDateKey(args.start, pro.provider.timezone);
  const offered = await clientOpenTimes(pro, service, key, key, 200);
  if (!offered.some((d) => d.getTime() === args.start.getTime())) return { ok: false, reason: "That time isn't open. Pick one of the open times." };
  const moved = await moveAppointment({ provider: pro.provider, id: appt.id, start: args.start });
  if (!moved.ok) return { ok: false, reason: moved.reason };
  const { notifyMoved } = await import("@/lib/calendar/notify");
  await notifyMoved({ pro, before: appt, after: moved.appointment }).catch(() => {});
  return { ok: true, appointment: moved.appointment, pro };
}
