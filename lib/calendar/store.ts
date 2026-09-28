import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PUBLIC_ENTITY_TYPES } from "@/lib/gbp-audit-public";
import { openSlots, outsideHoursReason, type HoursRow, type Interval } from "@/lib/calendar/availability";
import { localDateKey, addDaysToKey, startOfLocalDay, parseDateKey, isValidTimeZone } from "@/lib/calendar/time";

/**
 * The calendar's data layer. Every function is scoped by provider id, and the
 * provider is always resolved from the caller's member id — never taken from
 * input — so one owner's Claude cannot touch another owner's book.
 *
 * Writes that can collide (booking, moving) rely on the database's overlap
 * guard (calendar_appointments_no_overlap) rather than a read-then-write
 * check, which two simultaneous bookings would both pass.
 */

const db = () => createAdminClient() as any;
const OVERLAP = "23P01"; // Postgres exclusion_violation

export interface Provider {
  id: string;
  display_name: string;
  timezone: string;
  slot_step_minutes: number;
  min_notice_minutes: number;
  booking_window_days: number;
  entity_type: string | null;
  entity_id: string | null;
}

export async function getProvider(memberId: string): Promise<Provider | null> {
  const { data } = await db().from("calendar_providers").select("*").eq("community_member_id", memberId).maybeSingle();
  return data ?? null;
}

/** Create the member's calendar on first use, named after them and linked to their claimed listing. */
export async function ensureProvider(memberId: string): Promise<Provider> {
  const existing = await getProvider(memberId);
  if (existing) return existing;

  const [{ data: member }, { data: link }] = await Promise.all([
    db().from("community_members").select("first_name, last_name").eq("id", memberId).maybeSingle(),
    db().from("community_member_entity_links").select("entity_type, entity_id").eq("community_member_id", memberId).maybeSingle(),
  ]);
  const name = [member?.first_name, member?.last_name].filter(Boolean).join(" ").trim() || "My calendar";
  const { data, error } = await db()
    .from("calendar_providers")
    .insert({
      community_member_id: memberId,
      display_name: name,
      entity_type: link?.entity_type ?? null,
      entity_id: link?.entity_id ?? null,
    })
    .select("*")
    .single();
  if (error) {
    // Two first calls at once: the unique member id makes the second lose; read the winner.
    const again = await getProvider(memberId);
    if (again) return again;
    throw new Error(`could not create the calendar: ${error.message}`);
  }
  return data;
}

export async function listingName(p: Provider): Promise<string | null> {
  const cfg = p.entity_type ? PUBLIC_ENTITY_TYPES[p.entity_type] : null;
  if (!cfg || !p.entity_id) return null;
  const { data } = await db().from(cfg.table).select(cfg.nameField).eq("id", p.entity_id).maybeSingle();
  return data?.[cfg.nameField] ?? null;
}

export async function updateProviderSettings(providerId: string, patch: Partial<Pick<Provider, "timezone" | "slot_step_minutes" | "min_notice_minutes" | "booking_window_days" | "display_name">>) {
  if (patch.timezone && !isValidTimeZone(patch.timezone)) throw new Error(`"${patch.timezone}" isn't a time zone name like America/Chicago.`);
  const { error } = await db().from("calendar_providers").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", providerId);
  if (error) throw new Error(error.message);
}

// ── hours and time off ──────────────────────────────────────────────────────

export async function getHours(providerId: string): Promise<HoursRow[]> {
  const { data } = await db().from("calendar_hours").select("weekday, start_minute, end_minute").eq("provider_id", providerId);
  return (data || []).sort((a: HoursRow, b: HoursRow) => a.weekday - b.weekday || a.start_minute - b.start_minute);
}

/** Replace the hours for the weekdays named; every other day is left exactly as it was. */
export async function setHoursForDays(providerId: string, days: { weekday: number; ranges: { start: number; end: number }[] }[]) {
  const touched = [...new Set(days.map((d) => d.weekday))];
  const { error: delErr } = await db().from("calendar_hours").delete().eq("provider_id", providerId).in("weekday", touched);
  if (delErr) throw new Error(delErr.message);
  const rows = days.flatMap((d) => d.ranges.map((r) => ({ provider_id: providerId, weekday: d.weekday, start_minute: r.start, end_minute: r.end })));
  if (rows.length) {
    const { error } = await db().from("calendar_hours").insert(rows);
    if (error) throw new Error(error.message);
  }
}

export async function listTimeOff(providerId: string, from: Date, to: Date) {
  const { data } = await db()
    .from("calendar_time_off")
    .select("id, starts_at, ends_at, reason")
    .eq("provider_id", providerId)
    .lt("starts_at", to.toISOString())
    .gt("ends_at", from.toISOString())
    .order("starts_at");
  return data || [];
}

export async function addTimeOff(providerId: string, start: Date, end: Date, reason: string | null) {
  const { data, error } = await db()
    .from("calendar_time_off")
    .insert({ provider_id: providerId, starts_at: start.toISOString(), ends_at: end.toISOString(), reason })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function removeTimeOff(providerId: string, id: string): Promise<boolean> {
  const { data } = await db().from("calendar_time_off").delete().eq("id", id).eq("provider_id", providerId).select("id");
  return !!data?.length;
}

// ── services ────────────────────────────────────────────────────────────────

export interface Service { id: string; name: string; duration_minutes: number; price_cents: number | null; buffer_minutes: number; active: boolean }

export async function listServices(providerId: string, includeInactive = false): Promise<Service[]> {
  let q = db().from("calendar_services").select("id, name, duration_minutes, price_cents, buffer_minutes, active, sort").eq("provider_id", providerId);
  if (!includeInactive) q = q.eq("active", true);
  const { data } = await q.order("sort").order("name");
  return data || [];
}

/** Match by id, or by name case-insensitively — Claude will say "a fade", not a uuid. */
export async function findService(providerId: string, ref: string): Promise<Service | null> {
  const services = await listServices(providerId);
  const r = ref.trim().toLowerCase();
  return (
    services.find((s) => s.id === ref) ||
    services.find((s) => s.name.toLowerCase() === r) ||
    (services.filter((s) => s.name.toLowerCase().includes(r)).length === 1 ? services.find((s) => s.name.toLowerCase().includes(r))! : null)
  );
}

export async function upsertService(providerId: string, s: { name: string; duration_minutes: number; price_cents: number | null; buffer_minutes: number }) {
  const existing = (await listServices(providerId, true)).find((x) => x.name.toLowerCase() === s.name.trim().toLowerCase());
  if (existing) {
    const { error } = await db().from("calendar_services").update({ ...s, name: s.name.trim(), active: true }).eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { id: existing.id, created: false };
  }
  const { data, error } = await db().from("calendar_services").insert({ provider_id: providerId, ...s, name: s.name.trim() }).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string, created: true };
}

/** Deactivated, not deleted: past appointments keep pointing at it. */
export async function removeService(providerId: string, id: string): Promise<boolean> {
  const { data } = await db().from("calendar_services").update({ active: false }).eq("id", id).eq("provider_id", providerId).select("id");
  return !!data?.length;
}

// ── clients ─────────────────────────────────────────────────────────────────

/** US-first E.164: 10 digits get +1. Anything unrecognisable is null, not guessed. */
export function normalisePhone(raw: unknown): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  const digits = t.replace(/\D/g, "");
  if (t.startsWith("+") && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export interface Client { id: string; name: string; phone: string | null; email: string | null; notes: string | null }

export async function findClients(providerId: string, query: string): Promise<Client[]> {
  const q = query.trim();
  const phone = normalisePhone(q);
  let req = db().from("calendar_clients").select("id, name, phone, email, notes").eq("provider_id", providerId).limit(10);
  req = phone ? req.eq("phone", phone) : req.ilike("name", `%${q.replace(/[%_]/g, "")}%`);
  const { data } = await req;
  return data || [];
}

/** Same phone = same client. Without a phone, a new record is created each time unless an id is given. */
export async function upsertClient(providerId: string, c: { name: string; phone?: string | null; email?: string | null; notes?: string | null }): Promise<Client> {
  const phone = normalisePhone(c.phone);
  if (phone) {
    const { data: found } = await db().from("calendar_clients").select("id, name, phone, email, notes").eq("provider_id", providerId).eq("phone", phone).maybeSingle();
    if (found) return found;
  }
  const { data, error } = await db()
    .from("calendar_clients")
    .insert({ provider_id: providerId, name: c.name.trim(), phone, email: c.email?.trim() || null, notes: c.notes?.trim() || null })
    .select("id, name, phone, email, notes")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function clientHistory(providerId: string, clientId: string, limit = 10) {
  const { data } = await db()
    .from("calendar_appointments")
    .select("id, service_name, price_cents, starts_at, status")
    .eq("provider_id", providerId)
    .eq("client_id", clientId)
    .order("starts_at", { ascending: false })
    .limit(limit);
  return data || [];
}

// ── appointments ────────────────────────────────────────────────────────────

export interface Appointment {
  id: string; starts_at: string; ends_at: string; blocks_until: string; status: string; source: string;
  service_name: string; price_cents: number | null; notes: string | null;
  client: { id: string; name: string; phone: string | null } | null;
}

export async function listAppointments(providerId: string, from: Date, to: Date, includeCancelled = false): Promise<Appointment[]> {
  let q = db()
    .from("calendar_appointments")
    .select("id, starts_at, ends_at, blocks_until, status, source, service_name, price_cents, notes, client:calendar_clients(id, name, phone)")
    .eq("provider_id", providerId)
    .gte("starts_at", from.toISOString())
    .lt("starts_at", to.toISOString())
    .order("starts_at");
  if (!includeCancelled) q = q.in("status", ["booked", "confirmed", "completed", "no_show"]);
  const { data } = await q;
  return data || [];
}

export async function getAppointment(providerId: string, id: string): Promise<Appointment | null> {
  const { data } = await db()
    .from("calendar_appointments")
    .select("id, starts_at, ends_at, blocks_until, status, source, service_name, price_cents, notes, client:calendar_clients(id, name, phone)")
    .eq("provider_id", providerId)
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

/** Everything that makes a time unavailable, in the window: live bookings and time off. */
async function blockedIntervals(providerId: string, from: Date, to: Date, ignoreAppointmentId?: string): Promise<Interval[]> {
  const [{ data: appts }, off] = await Promise.all([
    db()
      .from("calendar_appointments")
      .select("id, starts_at, blocks_until")
      .eq("provider_id", providerId)
      .in("status", ["booked", "confirmed", "completed"])
      .lt("starts_at", to.toISOString())
      .gt("blocks_until", from.toISOString()),
    listTimeOff(providerId, from, to),
  ]);
  return [
    ...(appts || []).filter((a: any) => a.id !== ignoreAppointmentId).map((a: any) => ({ start: new Date(a.starts_at), end: new Date(a.blocks_until) })),
    ...off.map((o: any) => ({ start: new Date(o.starts_at), end: new Date(o.ends_at) })),
  ];
}

export async function findOpenTimes(args: {
  provider: Provider;
  service: Service;
  fromKey: string;
  toKey: string;
  /** Clients get the minimum notice; the pro booking a walk-in does not. */
  forClient: boolean;
  limit?: number;
}): Promise<Date[]> {
  const { provider, service } = args;
  const from = startOfLocalDay(args.fromKey, provider.timezone);
  const to = startOfLocalDay(addDaysToKey(args.toKey, 1), provider.timezone);
  const [hours, blocked] = await Promise.all([getHours(provider.id), blockedIntervals(provider.id, from, to)]);
  const now = Date.now();
  return openSlots({
    hours,
    blocked,
    durationMinutes: service.duration_minutes,
    bufferMinutes: service.buffer_minutes,
    stepMinutes: provider.slot_step_minutes,
    tz: provider.timezone,
    fromKey: args.fromKey,
    toKey: args.toKey,
    notBefore: new Date(args.forClient ? now + provider.min_notice_minutes * 60_000 : now),
    limit: args.limit,
  });
}

export type BookResult = { ok: true; appointment: Appointment } | { ok: false; reason: string; needsConfirm?: boolean };

/**
 * Book, or refuse with a reason Claude can repeat.
 *
 * Outside working hours or on time off is allowed only with allowOutsideHours
 * — the pro may squeeze in a regular, but should be asked first rather than
 * have it happen silently. An overlap with another booking is never allowed.
 */
export async function bookAppointment(args: {
  provider: Provider;
  service: Service;
  start: Date;
  client: Client | null;
  notes?: string | null;
  source: "claude" | "web" | "walk_in" | "client_claude";
  allowOutsideHours?: boolean;
}): Promise<BookResult> {
  const { provider, service, start } = args;
  if (Number.isNaN(start.getTime())) return { ok: false, reason: "That isn't a valid date and time." };
  const end = new Date(start.getTime() + service.duration_minutes * 60_000);
  const blocksUntil = new Date(end.getTime() + service.buffer_minutes * 60_000);

  if (!args.allowOutsideHours) {
    const hours = await getHours(provider.id);
    const reason = outsideHoursReason({ start, durationMinutes: service.duration_minutes, hours, tz: provider.timezone });
    if (reason) return { ok: false, reason: `Not booked: ${reason}. Ask the owner whether to book it anyway.`, needsConfirm: true };
    const off = await listTimeOff(provider.id, start, blocksUntil);
    if (off.length) return { ok: false, reason: `Not booked: that overlaps time off${off[0].reason ? ` (${off[0].reason})` : ""}. Ask the owner whether to book it anyway.`, needsConfirm: true };
  }

  const { data, error } = await db()
    .from("calendar_appointments")
    .insert({
      provider_id: provider.id,
      client_id: args.client?.id ?? null,
      service_id: service.id,
      service_name: service.name,
      price_cents: service.price_cents,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      blocks_until: blocksUntil.toISOString(),
      status: "booked",
      source: args.source,
      notes: args.notes?.trim() || null,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === OVERLAP) return { ok: false, reason: "Not booked: that time overlaps another appointment. Use find_open_times for free slots." };
    return { ok: false, reason: `Not booked: ${error.message}` };
  }
  return { ok: true, appointment: (await getAppointment(provider.id, data.id))! };
}

export async function moveAppointment(args: { provider: Provider; id: string; start: Date; allowOutsideHours?: boolean }): Promise<BookResult> {
  const { provider } = args;
  const appt = await getAppointment(provider.id, args.id);
  if (!appt) return { ok: false, reason: "No appointment with that id on this calendar." };
  if (!["booked", "confirmed"].includes(appt.status)) return { ok: false, reason: `That appointment is ${appt.status}, so it can't be moved.` };

  const length = new Date(appt.ends_at).getTime() - new Date(appt.starts_at).getTime();
  const buffer = new Date(appt.blocks_until).getTime() - new Date(appt.ends_at).getTime();
  const end = new Date(args.start.getTime() + length);
  const blocksUntil = new Date(end.getTime() + buffer);

  if (!args.allowOutsideHours) {
    const reason = outsideHoursReason({ start: args.start, durationMinutes: length / 60_000, hours: await getHours(provider.id), tz: provider.timezone });
    if (reason) return { ok: false, reason: `Not moved: ${reason}. Ask the owner whether to move it anyway.`, needsConfirm: true };
    const off = await listTimeOff(provider.id, args.start, blocksUntil);
    if (off.length) return { ok: false, reason: "Not moved: that overlaps time off. Ask the owner whether to move it anyway.", needsConfirm: true };
  }

  const { error } = await db()
    .from("calendar_appointments")
    .update({ starts_at: args.start.toISOString(), ends_at: end.toISOString(), blocks_until: blocksUntil.toISOString(), updated_at: new Date().toISOString() })
    .eq("id", appt.id)
    .eq("provider_id", provider.id);
  if (error) {
    if (error.code === OVERLAP) return { ok: false, reason: "Not moved: that time overlaps another appointment." };
    return { ok: false, reason: `Not moved: ${error.message}` };
  }
  return { ok: true, appointment: (await getAppointment(provider.id, appt.id))! };
}

export async function setAppointmentStatus(args: {
  providerId: string;
  id: string;
  status: "confirmed" | "completed" | "cancelled" | "no_show";
  reason?: string | null;
}): Promise<{ ok: boolean; reason?: string; appointment?: Appointment }> {
  const appt = await getAppointment(args.providerId, args.id);
  if (!appt) return { ok: false, reason: "No appointment with that id on this calendar." };
  if (appt.status === "cancelled") return { ok: false, reason: "That appointment is already cancelled." };
  const patch: Record<string, unknown> = { status: args.status, updated_at: new Date().toISOString() };
  if (args.status === "cancelled") {
    patch.cancelled_at = new Date().toISOString();
    patch.cancel_reason = args.reason?.trim() || null;
  }
  const { error } = await db().from("calendar_appointments").update(patch).eq("id", appt.id).eq("provider_id", args.providerId);
  if (error) {
    // Restoring a cancelled slot to live can collide with a booking made since.
    if (error.code === OVERLAP) return { ok: false, reason: "That time has been booked by someone else since." };
    return { ok: false, reason: error.message };
  }
  return { ok: true, appointment: (await getAppointment(args.providerId, appt.id))! };
}

/** Local date window helper for "today", "tomorrow", "this week" and explicit dates. */
export function windowKeys(tz: string, when: string | undefined): { fromKey: string; toKey: string } | null {
  const today = localDateKey(new Date(), tz);
  const w = String(when || "today").trim().toLowerCase();
  if (w === "today") return { fromKey: today, toKey: today };
  if (w === "tomorrow") return { fromKey: addDaysToKey(today, 1), toKey: addDaysToKey(today, 1) };
  if (w === "week" || w === "this week" || w === "next 7 days") return { fromKey: today, toKey: addDaysToKey(today, 6) };
  const range = /^(\d{4}-\d{2}-\d{2})(?:\s*(?:to|\.\.)\s*(\d{4}-\d{2}-\d{2}))?$/.exec(w);
  if (range && parseDateKey(range[1]) && (!range[2] || parseDateKey(range[2]))) {
    const toKey = range[2] || range[1];
    return toKey >= range[1] ? { fromKey: range[1], toKey } : null;
  }
  return null;
}
