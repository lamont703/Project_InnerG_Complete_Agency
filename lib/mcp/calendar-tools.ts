import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { McpTool, McpToolContext, McpToolAnnotations } from "@/lib/mcp/tools";
import { canUseCalendar, CALENDAR_NOT_AVAILABLE } from "@/lib/calendar/access";
import { normaliseDay } from "@/lib/gbp-change-rules";
import {
  zonedToUtc, parseDateKey, localDateKey, addDaysToKey, formatLocal, minuteToClock, parseClock, startOfLocalDay,
} from "@/lib/calendar/time";
import {
  getProvider, ensureProvider, listingName, updateProviderSettings, getHours, setHoursForDays,
  listTimeOff, addTimeOff, removeTimeOff, listServices, findService, upsertService, removeService,
  findClients, upsertClient, clientHistory, listAppointments, findOpenTimes, bookAppointment,
  moveAppointment, setAppointmentStatus, windowKeys, normalisePhone,
  type Provider, type Appointment,
} from "@/lib/calendar/store";
import { notifyCancelled } from "@/lib/calendar/notify";

/**
 * The pro's own appointment book, managed from Claude.
 *
 * PRIVATE TESTING: every handler checks canUseCalendar first
 * (lib/calendar/access.ts). The tools are listed for everyone — the list is
 * built without a database read — and answer "not yet" outside the allowlist.
 *
 * THESE WRITE REAL DATA, NOT DRAFTS. Unlike the Google tools, a booking here
 * is the pro changing their own ShearQuery calendar, so there is no draft
 * step: Claude's own permission prompt is the approval, and cancel is marked
 * destructive so it always asks. Nothing here texts a client — confirmations
 * and reminders come with client booking, which is a later build.
 *
 * Writes need the "propose" scope (a connection allowed to change things).
 * Revisit with a dedicated scope before rollout.
 */

const READS: McpToolAnnotations = { readOnlyHint: true, openWorldHint: false };
const WRITES: McpToolAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
const NO_IDENTITY = "This tool needs an owner connection and this connection has none.";

async function allowed(ctx: McpToolContext): Promise<{ ok: true; memberId: string } | { ok: false; text: string }> {
  if (!ctx.identity) return { ok: false, text: NO_IDENTITY };
  const { data } = await (createAdminClient().from("community_members") as any).select("email").eq("id", ctx.identity.memberId).maybeSingle();
  if (!canUseCalendar(data?.email)) return { ok: false, text: CALENDAR_NOT_AVAILABLE };
  return { ok: true, memberId: ctx.identity.memberId };
}

/** Reads never create a calendar; they say how to start one. */
async function readProvider(ctx: McpToolContext): Promise<{ ok: true; p: Provider } | { ok: false; text: string }> {
  const a = await allowed(ctx);
  if (!a.ok) return a;
  const p = await getProvider(a.memberId);
  if (!p) return { ok: false, text: "This owner has no ShearQuery calendar yet. Set it up by giving it working hours (set_calendar_hours) and services (save_calendar_service)." };
  return { ok: true, p };
}

async function writeProvider(ctx: McpToolContext): Promise<{ ok: true; p: Provider } | { ok: false; text: string }> {
  const a = await allowed(ctx);
  if (!a.ok) return a;
  return { ok: true, p: await ensureProvider(a.memberId) };
}

const money = (cents: number | null) => (cents == null ? "" : ` · $${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`);

function apptLine(a: Appointment, tz: string, withDate = false): string {
  const who = a.client ? `${a.client.name}${a.client.phone ? ` (${a.client.phone})` : ""}` : "no client recorded";
  return `${formatLocal(new Date(a.starts_at), tz, withDate)}–${formatLocal(new Date(a.ends_at), tz, false)} · ${a.service_name}${money(a.price_cents)} · ${who} · ${a.status.replace("_", "-")} · id ${a.id}${a.notes ? `\n    note: ${a.notes}` : ""}`;
}

/** "2026-10-02" or "today"/"tomorrow", plus a clock time, in the provider's zone. */
function instantFrom(p: Provider, date: unknown, time: unknown): Date | string {
  const today = localDateKey(new Date(), p.timezone);
  const d = String(date ?? "").trim().toLowerCase();
  const key = d === "today" ? today : d === "tomorrow" ? addDaysToKey(today, 1) : d;
  const parts = parseDateKey(key);
  if (!parts) return `"${String(date)}" isn't a date. Use YYYY-MM-DD, "today" or "tomorrow".`;
  const minute = parseClock(time);
  if (minute == null) return `"${String(time)}" isn't a time. Use something like "3pm" or "15:30".`;
  return zonedToUtc(parts.year, parts.month, parts.day, minute, p.timezone);
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_INDEX: Record<string, number> = { SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6 };

// ── reads ───────────────────────────────────────────────────────────────────

const myCalendar: McpTool = {
  name: "my_calendar",
  title: "How this owner's appointment calendar is set up",
  provides: "their calendar setup — hours, services, time zone and booking rules",
  description:
    "Show how the owner's ShearQuery appointment calendar is set up: time zone, weekly hours, services with length and price, how far ahead and how soon clients can book, and upcoming time off. Call this first for any calendar question.",
  requiresIdentity: true,
  annotations: READS,
  inputSchema: { type: "object", properties: {} },
  handler: async (_a, ctx) => {
    const r = await readProvider(ctx);
    if (!r.ok) return r.text;
    const p = r.p;
    const now = new Date();
    const [hours, services, off, upcoming, listing] = await Promise.all([
      getHours(p.id),
      listServices(p.id),
      listTimeOff(p.id, now, new Date(now.getTime() + 60 * 86400_000)),
      listAppointments(p.id, now, new Date(now.getTime() + 7 * 86400_000)),
      listingName(p),
    ]);
    const week = [1, 2, 3, 4, 5, 6, 0].map((wd) => {
      const today = hours.filter((h) => h.weekday === wd);
      return `  ${DAY_NAMES[wd]}: ${today.length ? today.map((h) => `${minuteToClock(h.start_minute)}–${minuteToClock(h.end_minute)}`).join(", ") : "closed"}`;
    });
    return [
      `CALENDAR — ${p.display_name}${listing ? ` at ${listing}` : ""}`,
      `Time zone ${p.timezone} · start times every ${p.slot_step_minutes} min · clients book at least ${p.min_notice_minutes} min ahead, up to ${p.booking_window_days} days out`,
      "",
      "WEEKLY HOURS", ...week,
      "",
      `SERVICES (${services.length})`,
      ...(services.length
        ? services.map((s) => `  ${s.name} · ${s.duration_minutes} min${s.buffer_minutes ? ` + ${s.buffer_minutes} min clean-up` : ""}${money(s.price_cents)}`)
        : ["  none yet — add them with save_calendar_service"]),
      "",
      `TIME OFF (next 60 days): ${off.length ? off.map((o: any) => `${formatLocal(new Date(o.starts_at), p.timezone)} to ${formatLocal(new Date(o.ends_at), p.timezone)}${o.reason ? ` (${o.reason})` : ""} [id ${o.id}]`).join("; ") : "none"}`,
      `Appointments in the next 7 days: ${upcoming.filter((a) => ["booked", "confirmed"].includes(a.status)).length}`,
    ].join("\n");
  },
};

const mySchedule: McpTool = {
  name: "my_schedule",
  title: "This owner's appointments for a day or week",
  provides: "their appointments for a day or week, with clients and ids",
  description:
    'List the owner\'s appointments for "today", "tomorrow", "week" (next 7 days), a date (YYYY-MM-DD) or a range ("2026-10-01 to 2026-10-07"), with times, services, clients and ids. Include cancelled ones with include_cancelled.',
  requiresIdentity: true,
  annotations: READS,
  inputSchema: {
    type: "object",
    properties: {
      when: { type: "string", description: 'Default "today".' },
      include_cancelled: { type: "boolean" },
    },
  },
  handler: async (args, ctx) => {
    const r = await readProvider(ctx);
    if (!r.ok) return r.text;
    const p = r.p;
    const w = windowKeys(p.timezone, args.when);
    if (!w) return 'Say "today", "tomorrow", "week", a date like 2026-10-02, or a range like "2026-10-01 to 2026-10-07".';
    const days = Math.round((startOfLocalDay(w.toKey, p.timezone).getTime() - startOfLocalDay(w.fromKey, p.timezone).getTime()) / 86400_000) + 1;
    if (days > 31) return "That range is longer than a month. Ask for a shorter one.";
    const appts = await listAppointments(p.id, startOfLocalDay(w.fromKey, p.timezone), startOfLocalDay(addDaysToKey(w.toKey, 1), p.timezone), !!args.include_cancelled);
    if (!appts.length) return `No appointments ${w.fromKey === w.toKey ? `on ${w.fromKey}` : `from ${w.fromKey} to ${w.toKey}`}.`;

    const byDay = new Map<string, Appointment[]>();
    for (const a of appts) {
      const k = localDateKey(new Date(a.starts_at), p.timezone);
      byDay.set(k, [...(byDay.get(k) || []), a]);
    }
    const out: string[] = [];
    for (const [k, list] of byDay) {
      const booked = list.filter((a) => ["booked", "confirmed", "completed"].includes(a.status));
      const total = booked.reduce((s, a) => s + (a.price_cents || 0), 0);
      out.push(`${formatLocal(startOfLocalDay(k, p.timezone), p.timezone).replace(/, 12am$/, "")} — ${booked.length} booked${total ? ` · about $${Math.round(total / 100)}` : ""}`);
      for (const a of list) out.push(`  ${apptLine(a, p.timezone)}`);
      out.push("");
    }
    return out.join("\n").trim();
  },
};

const findOpenTimesTool: McpTool = {
  name: "find_open_times",
  title: "Free times on this owner's calendar for a service",
  provides: "open appointment times for a service on a day or week",
  description:
    'Find open start times for a service on the owner\'s calendar, for "today", "tomorrow", "week", a date or a range. Accounts for working hours, existing bookings, clean-up time and time off. Set for_client to apply the minimum-notice rule clients get.',
  requiresIdentity: true,
  annotations: READS,
  inputSchema: {
    type: "object",
    properties: {
      service: { type: "string", description: "Service name or id, from my_calendar." },
      when: { type: "string", description: 'Default "week".' },
      for_client: { type: "boolean" },
      limit: { type: "integer", minimum: 1, maximum: 60, description: "Default 20." },
    },
    required: ["service"],
  },
  handler: async (args, ctx) => {
    const r = await readProvider(ctx);
    if (!r.ok) return r.text;
    const p = r.p;
    const service = await findService(p.id, String(args.service || ""));
    if (!service) return `No single service matches "${String(args.service)}". Services: ${(await listServices(p.id)).map((s) => s.name).join(", ") || "none yet"}.`;
    const w = windowKeys(p.timezone, args.when || "week");
    if (!w) return 'Say "today", "tomorrow", "week", a date like 2026-10-02, or a range.';
    const slots = await findOpenTimes({ provider: p, service, fromKey: w.fromKey, toKey: w.toKey, forClient: !!args.for_client, limit: Math.min(Math.max(Number(args.limit) || 20, 1), 60) });
    if (!slots.length) return `No open times for ${service.name} (${service.duration_minutes} min) from ${w.fromKey} to ${w.toKey}.`;
    const byDay = new Map<string, string[]>();
    for (const s of slots) {
      const k = localDateKey(s, p.timezone);
      byDay.set(k, [...(byDay.get(k) || []), formatLocal(s, p.timezone, false)]);
    }
    return [
      `OPEN TIMES for ${service.name} (${service.duration_minutes} min${service.buffer_minutes ? ` + ${service.buffer_minutes} clean-up` : ""}), ${p.timezone}:`,
      ...[...byDay].map(([k, times]) => `  ${k} (${DAY_NAMES[new Date(`${k}T12:00:00Z`).getUTCDay()]}): ${times.join(", ")}`),
    ].join("\n");
  },
};

const findClient: McpTool = {
  name: "find_client",
  title: "Look up a client and their visit history",
  provides: "a client's details and recent visits",
  description: "Find a client on the owner's calendar by name or phone number, with their notes and recent appointments.",
  requiresIdentity: true,
  annotations: READS,
  inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  handler: async (args, ctx) => {
    const r = await readProvider(ctx);
    if (!r.ok) return r.text;
    const q = String(args.query || "").trim();
    if (q.length < 2) return "Give at least two characters of a name, or a phone number.";
    const clients = await findClients(r.p.id, q);
    if (!clients.length) return `No client matches "${q}".`;
    const out: string[] = [];
    for (const c of clients.slice(0, 5)) {
      const hist = await clientHistory(r.p.id, c.id, 5);
      out.push(
        `${c.name}${c.phone ? ` · ${c.phone}` : ""}${c.email ? ` · ${c.email}` : ""} · id ${c.id}`,
        c.notes ? `  notes: ${c.notes}` : "",
        hist.length
          ? `  recent: ${hist.map((h: any) => `${formatLocal(new Date(h.starts_at), r.p.timezone)} ${h.service_name} (${h.status.replace("_", "-")})`).join("; ")}`
          : "  no visits yet",
        ""
      );
    }
    return out.filter((l) => l !== "").join("\n");
  },
};

// ── setup writes ────────────────────────────────────────────────────────────

const setHours: McpTool = {
  name: "set_calendar_hours",
  title: "Set weekly working hours on the calendar",
  provides: "changing weekly working hours",
  description:
    "Set the owner's weekly working hours for the days named; every other day stays as it is. Give a day two entries for a split shift, or closed: true to close it. Times like \"9am\" and \"6:30pm\".",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: WRITES,
  inputSchema: {
    type: "object",
    properties: {
      days: {
        type: "array",
        items: {
          type: "object",
          properties: { day: { type: "string" }, closed: { type: "boolean" }, open: { type: "string" }, close: { type: "string" } },
          required: ["day"],
        },
      },
    },
    required: ["days"],
  },
  handler: async (args, ctx) => {
    const r = await writeProvider(ctx);
    if (!r.ok) return r.text;
    const byDay = new Map<number, { start: number; end: number }[]>();
    for (const d of Array.isArray(args.days) ? args.days : []) {
      const name = normaliseDay(d?.day);
      if (!name) return `"${String(d?.day)}" isn't a day of the week.`;
      const wd = DAY_INDEX[name];
      if (!byDay.has(wd)) byDay.set(wd, []);
      if (d.closed === true) continue;
      const start = parseClock(d.open);
      const end = parseClock(d.close);
      if (start == null || end == null) return `${DAY_NAMES[wd]}: give open and close times like "9am" and "6pm", or closed: true.`;
      if (end <= start) return `${DAY_NAMES[wd]}: closing isn't after opening. Overnight hours aren't supported.`;
      byDay.get(wd)!.push({ start, end });
    }
    if (!byDay.size) return "Say which days to set.";
    await setHoursForDays(r.p.id, [...byDay].map(([weekday, ranges]) => ({ weekday, ranges })));
    const hours = await getHours(r.p.id);
    return [
      "Hours saved. The week now reads:",
      ...[1, 2, 3, 4, 5, 6, 0].map((wd) => {
        const t = hours.filter((h) => h.weekday === wd);
        return `  ${DAY_NAMES[wd]}: ${t.length ? t.map((h) => `${minuteToClock(h.start_minute)}–${minuteToClock(h.end_minute)}`).join(", ") : "closed"}`;
      }),
      "Existing appointments were not moved.",
    ].join("\n");
  },
};

const calendarSettings: McpTool = {
  name: "update_calendar_settings",
  title: "Change calendar time zone and booking rules",
  provides: "changing calendar time zone and booking rules",
  description:
    "Change the calendar's time zone (IANA name like America/Chicago), how often start times are offered, how much notice clients must give, and how far ahead they can book.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: WRITES,
  inputSchema: {
    type: "object",
    properties: {
      timezone: { type: "string" },
      slot_step_minutes: { type: "integer", enum: [5, 10, 15, 20, 30, 60] },
      min_notice_minutes: { type: "integer", minimum: 0, maximum: 10080 },
      booking_window_days: { type: "integer", minimum: 1, maximum: 365 },
      display_name: { type: "string" },
    },
  },
  handler: async (args, ctx) => {
    const r = await writeProvider(ctx);
    if (!r.ok) return r.text;
    const patch: Record<string, any> = {};
    for (const k of ["timezone", "slot_step_minutes", "min_notice_minutes", "booking_window_days", "display_name"]) if (args[k] != null) patch[k] = args[k];
    if (!Object.keys(patch).length) return "Nothing to change.";
    try {
      await updateProviderSettings(r.p.id, patch);
    } catch (e: any) {
      return `Not saved: ${e.message}`;
    }
    return `Saved: ${Object.entries(patch).map(([k, v]) => `${k.replace(/_/g, " ")} = ${v}`).join(", ")}.${patch.timezone ? " Weekly hours keep their wall-clock times in the new zone." : ""}`;
  },
};

const saveService: McpTool = {
  name: "save_calendar_service",
  title: "Add or update a bookable service",
  provides: "adding or changing bookable services",
  description:
    "Add a service clients can book, or update one with the same name: its length in minutes, price in dollars, and clean-up minutes kept free after it. Existing appointments keep the name and price they were booked with.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: WRITES,
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
      minutes: { type: "integer", minimum: 5, maximum: 600 },
      price: { type: "number", minimum: 0, description: "Dollars. Omit if the price varies." },
      cleanup_minutes: { type: "integer", minimum: 0, maximum: 120 },
    },
    required: ["name", "minutes"],
  },
  handler: async (args, ctx) => {
    const r = await writeProvider(ctx);
    if (!r.ok) return r.text;
    const name = String(args.name || "").trim();
    if (!name || name.length > 80) return "Give the service a name of up to 80 characters.";
    const minutes = Number(args.minutes);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 600) return "Length must be 5 to 600 minutes.";
    const price = args.price == null ? null : Math.round(Number(args.price) * 100);
    if (price != null && (!Number.isFinite(price) || price < 0)) return "Price must be a number of dollars.";
    const buffer = Number(args.cleanup_minutes ?? 0);
    const res = await upsertService(r.p.id, { name, duration_minutes: minutes, price_cents: price, buffer_minutes: Number.isInteger(buffer) ? Math.min(Math.max(buffer, 0), 120) : 0 });
    return `${res.created ? "Added" : "Updated"} ${name}: ${minutes} min${buffer ? ` + ${buffer} min clean-up` : ""}${money(price)}.`;
  },
};

const removeServiceTool: McpTool = {
  name: "remove_calendar_service",
  title: "Stop offering a service",
  provides: "removing a bookable service",
  description: "Stop offering a service for new bookings. Past and upcoming appointments for it are kept.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: WRITES,
  inputSchema: { type: "object", properties: { service: { type: "string" } }, required: ["service"] },
  handler: async (args, ctx) => {
    const r = await writeProvider(ctx);
    if (!r.ok) return r.text;
    const s = await findService(r.p.id, String(args.service || ""));
    if (!s) return `No single service matches "${String(args.service)}".`;
    await removeService(r.p.id, s.id);
    return `${s.name} is no longer offered. Existing appointments for it are unchanged.`;
  },
};

const blockTime: McpTool = {
  name: "block_time_off",
  title: "Block time off on the calendar",
  provides: "blocking time off",
  description:
    "Block time so nothing can be booked in it: a whole day (just `date`), a range of days (`date` and `end_date`), or part of a day (`date` with `start` and `end` times). Existing appointments in that time are NOT cancelled — this says which ones overlap.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: WRITES,
  inputSchema: {
    type: "object",
    properties: {
      date: { type: "string", description: 'YYYY-MM-DD, "today" or "tomorrow".' },
      end_date: { type: "string", description: "Last day off, for a range." },
      start: { type: "string", description: 'For part of a day, e.g. "1pm".' },
      end: { type: "string", description: 'For part of a day, e.g. "3pm".' },
      reason: { type: "string" },
    },
    required: ["date"],
  },
  handler: async (args, ctx) => {
    const r = await writeProvider(ctx);
    if (!r.ok) return r.text;
    const p = r.p;
    let from: Date, to: Date;
    if (args.start || args.end) {
      const a = instantFrom(p, args.date, args.start);
      const b = instantFrom(p, args.date, args.end);
      if (typeof a === "string") return a;
      if (typeof b === "string") return b;
      [from, to] = [a, b];
    } else {
      const first = instantFrom(p, args.date, "00:00");
      const last = instantFrom(p, args.end_date || args.date, "00:00");
      if (typeof first === "string") return first;
      if (typeof last === "string") return last;
      from = first;
      to = startOfLocalDay(addDaysToKey(localDateKey(last, p.timezone), 1), p.timezone);
    }
    if (to <= from) return "The end has to be after the start.";
    const id = await addTimeOff(p.id, from, to, args.reason ? String(args.reason).slice(0, 120) : null);
    const clashes = (await listAppointments(p.id, from, to)).filter((a) => ["booked", "confirmed"].includes(a.status));
    return [
      `Blocked ${formatLocal(from, p.timezone)} to ${formatLocal(to, p.timezone)}${args.reason ? ` (${args.reason})` : ""}. [id ${id}]`,
      clashes.length
        ? `${clashes.length} appointment(s) already in that time were NOT cancelled:\n${clashes.map((a) => `  ${apptLine(a, p.timezone, true)}`).join("\n")}\nAsk the owner whether to move or cancel them.`
        : "No existing appointments fall in that time.",
    ].join("\n");
  },
};

const removeTimeOffTool: McpTool = {
  name: "remove_time_off",
  title: "Remove blocked time off",
  provides: "removing blocked time off",
  description: "Remove a time-off block by its id from my_calendar, reopening that time for bookings.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: WRITES,
  inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  handler: async (args, ctx) => {
    const r = await writeProvider(ctx);
    if (!r.ok) return r.text;
    return (await removeTimeOff(r.p.id, String(args.id || ""))) ? "Time off removed; that time is bookable again." : "No time-off block with that id.";
  },
};

// ── appointment writes ──────────────────────────────────────────────────────

const bookTool: McpTool = {
  name: "book_appointment",
  title: "Book an appointment on the owner's calendar",
  provides: "booking appointments",
  description:
    "Book a client in: service, date, time, and the client's name (plus phone so repeat visits link up). Refuses a time that overlaps another booking. Outside working hours or on time off it asks first — only set allow_outside_hours after the owner says yes. Does not text the client.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: WRITES,
  inputSchema: {
    type: "object",
    properties: {
      service: { type: "string" },
      date: { type: "string", description: 'YYYY-MM-DD, "today" or "tomorrow".' },
      time: { type: "string", description: 'e.g. "3pm", "15:30".' },
      client_name: { type: "string" },
      client_phone: { type: "string" },
      client_id: { type: "string", description: "From find_client, to book an existing client exactly." },
      notes: { type: "string" },
      walk_in: { type: "boolean" },
      allow_outside_hours: { type: "boolean" },
    },
    required: ["service", "date", "time"],
  },
  handler: async (args, ctx) => {
    const r = await writeProvider(ctx);
    if (!r.ok) return r.text;
    const p = r.p;
    const service = await findService(p.id, String(args.service || ""));
    if (!service) return `No single service matches "${String(args.service)}". Services: ${(await listServices(p.id)).map((s) => s.name).join(", ") || "none yet — add one with save_calendar_service"}.`;
    const start = instantFrom(p, args.date, args.time);
    if (typeof start === "string") return start;
    if (start.getTime() < Date.now() - 15 * 60_000 && !args.walk_in) return `${formatLocal(start, p.timezone)} is in the past.`;

    let client = null;
    if (args.client_id) {
      const { data } = await (createAdminClient().from("calendar_clients") as any)
        .select("id, name, phone, email, notes").eq("id", String(args.client_id)).eq("provider_id", p.id).maybeSingle();
      if (!data) return "No client with that id on this calendar.";
      client = data;
    } else if (args.client_name) {
      if (args.client_phone && !normalisePhone(args.client_phone)) return `"${String(args.client_phone)}" doesn't look like a full phone number.`;
      client = await upsertClient(p.id, { name: String(args.client_name).slice(0, 80), phone: args.client_phone ?? null });
    }

    const res = await bookAppointment({
      provider: p, service, start, client,
      notes: args.notes ? String(args.notes).slice(0, 500) : null,
      source: args.walk_in ? "walk_in" : "claude",
      allowOutsideHours: !!args.allow_outside_hours,
    });
    if (!res.ok) return res.reason;
    return `Booked: ${apptLine(res.appointment, p.timezone, true)}\nThe client was not texted.`;
  },
};

const moveTool: McpTool = {
  name: "move_appointment",
  title: "Move an appointment to another time",
  provides: "moving appointments",
  description: "Move an appointment (id from my_schedule) to a new date and time, keeping its length and clean-up time. Refuses overlaps; asks first outside working hours. Does not text the client.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: WRITES,
  inputSchema: {
    type: "object",
    properties: { id: { type: "string" }, date: { type: "string" }, time: { type: "string" }, allow_outside_hours: { type: "boolean" } },
    required: ["id", "date", "time"],
  },
  handler: async (args, ctx) => {
    const r = await writeProvider(ctx);
    if (!r.ok) return r.text;
    const start = instantFrom(r.p, args.date, args.time);
    if (typeof start === "string") return start;
    const res = await moveAppointment({ provider: r.p, id: String(args.id || ""), start, allowOutsideHours: !!args.allow_outside_hours });
    return res.ok ? `Moved: ${apptLine(res.appointment, r.p.timezone, true)}\nThe client was not texted — let them know.` : res.reason;
  },
};

const cancelTool: McpTool = {
  name: "cancel_appointment",
  title: "Cancel an appointment",
  provides: "cancelling appointments",
  description:
    "Cancel an appointment (id from my_schedule), freeing the time. Confirm with the owner first. Texts the client only with notify_client: true — ask the owner, especially for a client who booked themselves online or through Claude.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  inputSchema: {
    type: "object",
    properties: { id: { type: "string" }, reason: { type: "string" }, notify_client: { type: "boolean", description: "Text the client that it's cancelled." } },
    required: ["id"],
  },
  handler: async (args, ctx) => {
    const r = await writeProvider(ctx);
    if (!r.ok) return r.text;
    const res = await setAppointmentStatus({ providerId: r.p.id, id: String(args.id || ""), status: "cancelled", reason: args.reason ? String(args.reason).slice(0, 200) : null });
    if (!res.ok) return res.reason!;
    let texted = false;
    if (args.notify_client && res.appointment?.client?.phone) {
      await notifyCancelled({ pro: { provider: r.p, listing: await listingName(r.p), services: [] }, appointment: res.appointment, by: "pro" });
      texted = true;
    }
    return `Cancelled: ${apptLine(res.appointment!, r.p.timezone, true)}\nThe time is free again. ${texted ? "The client was texted." : "The client was not texted — let them know."}`;
  },
};

const statusTool: McpTool = {
  name: "update_appointment_status",
  title: "Mark an appointment confirmed, completed or no-show",
  provides: "marking appointments confirmed, completed or no-show",
  description: "Mark an appointment (id from my_schedule) as confirmed, completed, or no_show. A no-show frees the time; a completed visit counts in the client's history.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: WRITES,
  inputSchema: {
    type: "object",
    properties: { id: { type: "string" }, status: { type: "string", enum: ["confirmed", "completed", "no_show"] } },
    required: ["id", "status"],
  },
  handler: async (args, ctx) => {
    const r = await writeProvider(ctx);
    if (!r.ok) return r.text;
    const status = String(args.status);
    if (!["confirmed", "completed", "no_show"].includes(status)) return "Status must be confirmed, completed or no_show.";
    const res = await setAppointmentStatus({ providerId: r.p.id, id: String(args.id || ""), status: status as any });
    return res.ok ? `Updated: ${apptLine(res.appointment!, r.p.timezone, true)}` : res.reason!;
  },
};

export const CALENDAR_TOOLS: McpTool[] = [
  myCalendar, mySchedule, findOpenTimesTool, findClient,
  setHours, calendarSettings, saveService, removeServiceTool, blockTime, removeTimeOffTool,
  bookTool, moveTool, cancelTool, statusTool,
];
