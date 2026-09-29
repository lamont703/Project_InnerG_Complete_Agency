import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import type { McpTool, McpToolAnnotations } from "@/lib/mcp/tools";
import { parseDateKey, localDateKey, addDaysToKey, zonedToUtc, parseClock, formatLocal } from "@/lib/calendar/time";
import { windowKeys } from "@/lib/calendar/store";
import {
  searchBookablePros, bookableProvider, clientOpenTimes, sendPhoneCode, checkPhoneCode,
  getMemberPhone, setMemberPhone, clientBook, memberAppointments, clientCancel, clientReschedule, CLIENT_LIMITS,
} from "@/lib/calendar/client-booking";

/**
 * Booking appointments as a CLIENT, from the client's own Claude.
 *
 * Finding pros and their open times is open to anyone. Booking, moving and
 * cancelling need a free ShearQuery client account: the first booking tool a
 * client's AI calls answers 401, Claude shows its Connect card, and the client
 * signs in or signs up and comes straight back. That replaced guest booking by
 * text code (2026-09-29): without an account, every change after the booking
 * meant another code or a link, and the connector kept asking to sign in anyway.
 *
 * The client adds the same ShearQuery connector and signs in. Before the first
 * booking they prove a mobile number with a text code (verify_my_phone, then
 * confirm_my_phone); that number is who they are on the pro's calendar, and it
 * links these bookings with any they made on the website.
 *
 * Only pros whose calendars are bookable can be found or booked — while the
 * calendar is in testing, that means allowlisted owners only
 * (lib/calendar/client-booking.ts, bookableProvider). Clients themselves are
 * not allowlisted.
 *
 * A client can never book outside a pro's open times, beyond the booking
 * window, inside the minimum notice, or more than CLIENT_LIMITS.maxUpcomingPerPro
 * at once with one pro. Those are the pro's rules and hold whatever the client's
 * Claude asks.
 */

const READS: McpToolAnnotations = { readOnlyHint: true, openWorldHint: false };
const WRITES: McpToolAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true };
const NO_IDENTITY = "Booking needs the client to be signed in to ShearQuery in this connection.";
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** A pro by id, or by the booking handle on their "Book me" page. */
async function resolvePro(ref: unknown) {
  const raw = String(ref || "").trim();
  if (/^[0-9a-f-]{36}$/i.test(raw)) return bookableProvider(raw);
  const { providerIdByHandle } = await import("@/lib/calendar/booking-handle");
  const id = await providerIdByHandle(raw.replace(/^.*\/book\//, "").replace(/[/?#].*$/, ""));
  return id ? bookableProvider(id) : null;
}

/** A start time from "date" + "time" as a client's AI says them, in the pro's zone. */
function startFrom(tz: string, date: unknown, time: unknown): Date | null {
  const today = localDateKey(new Date(), tz);
  const d = String(date || "").trim().toLowerCase();
  const key = d === "today" ? today : d === "tomorrow" ? addDaysToKey(today, 1) : d;
  const parts = parseDateKey(key);
  const minute = parseClock(time);
  return parts && minute != null ? zonedToUtc(parts.year, parts.month, parts.day, minute, tz) : null;
}

const money = (c: number | null) => (c == null ? "" : ` · $${(c / 100).toFixed(c % 100 ? 2 : 0)}`);

const findPros: McpTool = {
  name: "find_pros_to_book",
  title: "Find barbers and stylists you can book on ShearQuery",
  provides: "barbers and stylists taking bookings on ShearQuery, with their services",
  description:
    "Find barbers, stylists and shops that take real bookings on ShearQuery, by name, business name, or the booking handle from their \"Book me\" page (e.g. marcus-cuts) — or leave the search empty to list them. No ShearQuery account needed to look; booking needs the client to sign in (a free client account). Returns each pro's id, where they work, and their services with length and price.",
  annotations: READS,
  inputSchema: { type: "object", properties: { query: { type: "string" } } },
  handler: async (args, ctx) => {
    const byHandle = args.query ? await resolvePro(args.query) : null;
    const pros = byHandle ? [byHandle] : await searchBookablePros(String(args.query || ""), ctx.identity?.memberId ?? null);
    if (!pros.length) return "No one matching that takes bookings on ShearQuery yet. Booking is new and is opening to pros gradually.";
    // Booking itself needs sign-in: book_with_pro (a free client account).
    const { ensureBookingHandle } = await import("@/lib/calendar/booking-handle");
    const handles = await Promise.all(pros.map((p) => ensureBookingHandle(p.provider.id)));
    return pros
      .map((p, i) =>
        [
          `${p.provider.display_name}${p.listing ? ` at ${p.listing}` : ""} · pro id ${p.provider.id}${handles[i] ? ` · booking handle ${handles[i]} (${SITE_URL}/book/${handles[i]})` : ""} · ${p.provider.timezone}`,
          ...p.services.map((s) => `  ${s.name} · ${s.duration_minutes} min${money(s.price_cents)}`),
        ].join("\n")
      )
      .join("\n\n");
  },
};

const proOpenTimes: McpTool = {
  name: "pro_open_times",
  title: "Open times with a barber or stylist",
  provides: "a pro's open appointment times for a service",
  description:
    'Open times with a pro (id from find_pros_to_book, or their booking handle) for a service, on "today", "tomorrow", "week", a date (YYYY-MM-DD) or a range. Times are in the pro\'s local time zone. No ShearQuery account needed.',
  annotations: READS,
  inputSchema: {
    type: "object",
    properties: { pro_id: { type: "string" }, service: { type: "string" }, when: { type: "string", description: 'Default "week".' } },
    required: ["pro_id", "service"],
  },
  handler: async (args) => {
    const pro = await resolvePro(args.pro_id);
    if (!pro) return "That pro isn't taking bookings on ShearQuery.";
    const service = pickService(pro.services, args.service);
    if (!service) return `No single service matches. They offer: ${pro.services.map((s) => s.name).join(", ")}.`;
    const w = windowKeys(pro.provider.timezone, args.when || "week");
    if (!w) return 'Say "today", "tomorrow", "week", a date like 2026-10-02, or a range.';
    const slots = await clientOpenTimes(pro, service, w.fromKey, w.toKey, 40);
    if (!slots.length) return `${pro.provider.display_name} has no open times for ${service.name} then.`;
    const byDay = new Map<string, string[]>();
    for (const s of slots) {
      const k = localDateKey(s, pro.provider.timezone);
      byDay.set(k, [...(byDay.get(k) || []), formatLocal(s, pro.provider.timezone, false)]);
    }
    return [
      `OPEN with ${pro.provider.display_name} for ${service.name} (${service.duration_minutes} min${money(service.price_cents)}), ${pro.provider.timezone}:`,
      ...[...byDay].map(([k, t]) => `  ${k} (${DAY[new Date(`${k}T12:00:00Z`).getUTCDay()]}): ${t.join(", ")}`),
    ].join("\n");
  },
};

const verifyPhone: McpTool = {
  name: "verify_my_phone",
  title: "Text a code to confirm your mobile number",
  provides: "confirming your mobile number for bookings",
  description:
    "Before a client's first booking, text a 6-digit code to their mobile number. Then call confirm_my_phone with the code they read back. The number is how the pro knows and contacts them.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: WRITES,
  inputSchema: { type: "object", properties: { phone: { type: "string" } }, required: ["phone"] },
  handler: async (args, ctx) => {
    if (!ctx.identity) return NO_IDENTITY;
    const res = await sendPhoneCode({ phone: args.phone, memberId: ctx.identity.memberId });
    return res.ok ? `Code texted. Ask for the 6 digits and call confirm_my_phone. It expires in ${CLIENT_LIMITS.codeTtlMinutes} minutes.` : res.reason;
  },
};

const confirmPhone: McpTool = {
  name: "confirm_my_phone",
  title: "Confirm your mobile number with the texted code",
  provides: "confirming your mobile number for bookings",
  description: "Confirm the client's mobile number with the 6-digit code from verify_my_phone. Needed once; later bookings reuse it.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: WRITES,
  inputSchema: { type: "object", properties: { phone: { type: "string" }, code: { type: "string" } }, required: ["phone", "code"] },
  handler: async (args, ctx) => {
    if (!ctx.identity) return NO_IDENTITY;
    const res = await checkPhoneCode(args.phone, args.code);
    if (!res.ok) return res.reason;
    await setMemberPhone(ctx.identity.memberId, res.phone);
    return `Confirmed ${res.phone}. You can book now.`;
  },
};

const bookWithPro: McpTool = {
  name: "book_with_pro",
  title: "Book an appointment with a barber or stylist",
  provides: "booking appointments with a pro",
  description:
    "Book the client a NEW appointment with a pro (id or booking handle from find_pros_to_book) at an open time from pro_open_times. Confirm the details with the client first. Needs a confirmed mobile number (verify_my_phone). To CHANGE an existing booking, never book a second one: use reschedule_my_booking. The client gets a text confirmation with a link to view, reschedule or cancel.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: WRITES,
  inputSchema: {
    type: "object",
    properties: {
      pro_id: { type: "string" },
      service: { type: "string" },
      date: { type: "string", description: 'YYYY-MM-DD, "today" or "tomorrow", in the pro\'s time zone.' },
      time: { type: "string", description: 'e.g. "3pm", exactly as pro_open_times listed it.' },
      name: { type: "string", description: "Name for the booking. Defaults to the client's ShearQuery name." },
      notes: { type: "string" },
    },
    required: ["pro_id", "service", "date", "time"],
  },
  handler: async (args, ctx) => {
    if (!ctx.identity) return NO_IDENTITY;
    const phone = await getMemberPhone(ctx.identity.memberId);
    if (!phone) return "The client needs to confirm their mobile number first: call verify_my_phone.";
    const pro = await resolvePro(args.pro_id);
    if (!pro) return "That pro isn't taking bookings on ShearQuery.";
    const service = pickService(pro.services, args.service);
    if (!service) return `No single service matches. They offer: ${pro.services.map((s) => s.name).join(", ")}.`;

    const tz = pro.provider.timezone;
    const start = startFrom(tz, args.date, args.time);
    if (!start) return 'Give the date as YYYY-MM-DD (or "today"/"tomorrow") and a time like "3pm".';

    let name = String(args.name || "").trim();
    if (!name) {
      const { data } = await (createAdminClient().from("community_members") as any).select("first_name, last_name").eq("id", ctx.identity.memberId).maybeSingle();
      name = [data?.first_name, data?.last_name].filter(Boolean).join(" ").trim();
    }
    if (!name) return "What name should the booking be under?";

    const res = await clientBook({
      pro, service, start, name, phone,
      memberId: ctx.identity.memberId,
      notes: args.notes ? String(args.notes).slice(0, 300) : null,
      source: "client_claude",
      origin: ctx.origin || SITE_URL,
    });
    if (!res.ok) return res.reason;
    await markAsClient(ctx.identity.memberId);
    return [
      `Booked: ${service.name} with ${pro.provider.display_name}${pro.listing ? ` at ${pro.listing}` : ""}, ${formatLocal(start, tz)} (${tz}).`,
      `A confirmation was texted to ${phone} with a link to view, reschedule or cancel. Appointment id ${res.appointment.id}.`,
    ].join("\n");
  },
};

const myBookings: McpTool = {
  name: "my_bookings",
  title: "Your upcoming and recent appointments",
  provides: "the appointments you booked as a client",
  description: "List the appointments this client has booked with pros on ShearQuery — upcoming and the last 30 days — with ids for reschedule_my_booking and cancel_my_booking. Includes bookings made on the website or before signing up, once the client's mobile number is confirmed.",
  requiresIdentity: true,
  annotations: READS,
  inputSchema: { type: "object", properties: {} },
  handler: async (_a, ctx) => {
    if (!ctx.identity) return NO_IDENTITY;
    const rows = await memberAppointments(ctx.identity.memberId);
    if (!rows.length) return "No appointments booked through ShearQuery yet.";
    return rows
      .map((r: any) => `${formatLocal(new Date(r.starts_at), r.provider?.timezone || "America/Chicago")} · ${r.service_name}${money(r.price_cents)} with ${r.provider?.display_name || "a pro"} · ${r.status.replace("_", "-")} · id ${r.id}`)
      .join("\n");
  },
};

const cancelMine: McpTool = {
  name: "cancel_my_booking",
  title: "Cancel one of your appointments",
  provides: "cancelling your own appointments",
  description: `Cancel one of the client's own appointments (id from my_bookings). Confirm first. Not possible within ${CLIENT_LIMITS.cancelCutoffMinutes / 60} hours of the time — then the client contacts the pro.`,
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  handler: async (args, ctx) => {
    if (!ctx.identity) return NO_IDENTITY;
    // Only an appointment this member booked, found through their own list.
    const mine = (await memberAppointments(ctx.identity.memberId)).find((r: any) => r.id === String(args.id || ""));
    if (!mine) return "That isn't one of your appointments. Check my_bookings.";
    const res = await clientCancel({ providerId: mine.provider_id, appointmentId: mine.id, reason: "cancelled by client in Claude" });
    return res.ok ? "Cancelled. The pro has been told, and that time is open again." : res.reason!;
  },
};

function pickService(services: { id: string; name: string; duration_minutes: number; price_cents: number | null; buffer_minutes: number; active: boolean }[], ref: unknown) {
  const r = String(ref ?? "").trim().toLowerCase();
  if (!r) return null;
  const exact = services.find((s) => s.id === ref || s.name.toLowerCase() === r);
  if (exact) return exact;
  const partial = services.filter((s) => s.name.toLowerCase().includes(r));
  return partial.length === 1 ? partial[0] : null;
}


const rescheduleMine: McpTool = {
  name: "reschedule_my_booking",
  title: "Move one of your appointments to another time",
  provides: "moving your own appointments to another open time",
  description: `Move one of the client's own appointments (id from my_bookings) to another open time for the same service. Check the new time with pro_open_times and confirm with the client first. This MOVES the booking; never book a second one to reschedule. Not possible within ${CLIENT_LIMITS.cancelCutoffMinutes / 60} hours of the time — then the client contacts the pro.`,
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string" },
      date: { type: "string", description: 'YYYY-MM-DD, "today" or "tomorrow", in the pro\'s time zone.' },
      time: { type: "string", description: 'e.g. "3pm", as pro_open_times listed it.' },
    },
    required: ["id", "date", "time"],
  },
  handler: async (args, ctx) => {
    if (!ctx.identity) return NO_IDENTITY;
    const mine = (await memberAppointments(ctx.identity.memberId)).find((r: any) => r.id === String(args.id || ""));
    if (!mine) return "That isn't one of your appointments. Check my_bookings.";
    const tz = (mine as any).provider?.timezone || "America/Chicago";
    const start = startFrom(tz, args.date, args.time);
    if (!start) return 'Give the date as YYYY-MM-DD (or "today"/"tomorrow") and a time like "3pm".';
    const res = await clientReschedule({ providerId: mine.provider_id, appointmentId: mine.id, start });
    if (!res.ok) return res.reason;
    return `Moved: ${res.appointment.service_name} with ${res.pro.provider.display_name} is now ${formatLocal(start, tz)} (${tz}). The client and the pro have both been texted.`;
  },
};

/**
 * Someone who signed up from their AI to book has no account type yet. Booking
 * makes them a client — only while the type is empty, so a business account
 * booking a haircut stays a business account.
 */
async function markAsClient(memberId: string) {
  await (createAdminClient().from("community_members") as any).update({ audience: "client" }).eq("id", memberId).is("audience", null);
}

export const CLIENT_BOOKING_TOOLS: McpTool[] = [findPros, proOpenTimes, verifyPhone, confirmPhone, bookWithPro, myBookings, rescheduleMine, cancelMine];
