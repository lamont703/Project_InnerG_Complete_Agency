import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import type { McpTool, McpToolAnnotations } from "@/lib/mcp/tools";
import { parseDateKey, localDateKey, addDaysToKey, zonedToUtc, parseClock, formatLocal } from "@/lib/calendar/time";
import { windowKeys } from "@/lib/calendar/store";
import {
  searchBookablePros, bookableProvider, clientOpenTimes, sendPhoneCode, checkPhoneCode,
  getMemberPhone, setMemberPhone, clientBook, memberAppointments, clientCancel, CLIENT_LIMITS,
} from "@/lib/calendar/client-booking";

/**
 * Booking appointments as a CLIENT, from the client's own Claude.
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

const money = (c: number | null) => (c == null ? "" : ` · $${(c / 100).toFixed(c % 100 ? 2 : 0)}`);

const findPros: McpTool = {
  name: "find_pros_to_book",
  title: "Find barbers and stylists you can book on ShearQuery",
  provides: "barbers and stylists taking bookings on ShearQuery, with their services",
  description:
    "Find barbers, stylists and shops that take real bookings on ShearQuery, by name or business name (or leave the search empty to list them). Returns each pro's id, where they work, and their services with length and price.",
  requiresIdentity: true,
  annotations: READS,
  inputSchema: { type: "object", properties: { query: { type: "string" } } },
  handler: async (args, ctx) => {
    if (!ctx.identity) return NO_IDENTITY;
    const pros = await searchBookablePros(String(args.query || ""));
    if (!pros.length) return "No one matching that takes bookings on ShearQuery yet. Booking is new and is opening to pros gradually.";
    return pros
      .map((p) =>
        [
          `${p.provider.display_name}${p.listing ? ` at ${p.listing}` : ""} · pro id ${p.provider.id} · ${p.provider.timezone}`,
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
    'Open times with a pro (id from find_pros_to_book) for a service, on "today", "tomorrow", "week", a date (YYYY-MM-DD) or a range. Times are in the pro\'s local time zone.',
  requiresIdentity: true,
  annotations: READS,
  inputSchema: {
    type: "object",
    properties: { pro_id: { type: "string" }, service: { type: "string" }, when: { type: "string", description: 'Default "week".' } },
    required: ["pro_id", "service"],
  },
  handler: async (args, ctx) => {
    if (!ctx.identity) return NO_IDENTITY;
    const pro = await bookableProvider(String(args.pro_id || ""));
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
    "Book the client an appointment with a pro (id from find_pros_to_book) at an open time from pro_open_times. Confirm the details with the client first. Needs a confirmed mobile number (verify_my_phone). The client gets a text confirmation with a link to view or cancel.",
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
    const pro = await bookableProvider(String(args.pro_id || ""));
    if (!pro) return "That pro isn't taking bookings on ShearQuery.";
    const service = pickService(pro.services, args.service);
    if (!service) return `No single service matches. They offer: ${pro.services.map((s) => s.name).join(", ")}.`;

    const tz = pro.provider.timezone;
    const today = localDateKey(new Date(), tz);
    const d = String(args.date || "").trim().toLowerCase();
    const key = d === "today" ? today : d === "tomorrow" ? addDaysToKey(today, 1) : d;
    const parts = parseDateKey(key);
    const minute = parseClock(args.time);
    if (!parts || minute == null) return 'Give the date as YYYY-MM-DD (or "today"/"tomorrow") and a time like "3pm".';
    const start = zonedToUtc(parts.year, parts.month, parts.day, minute, tz);

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
    return [
      `Booked: ${service.name} with ${pro.provider.display_name}${pro.listing ? ` at ${pro.listing}` : ""}, ${formatLocal(start, tz)} (${tz}).`,
      `A confirmation was texted to ${phone} with a link to view or cancel. Appointment id ${res.appointment.id}.`,
    ].join("\n");
  },
};

const myBookings: McpTool = {
  name: "my_bookings",
  title: "Your upcoming and recent appointments",
  provides: "the appointments you booked as a client",
  description: "List the appointments this client has booked with pros on ShearQuery — upcoming and the last 30 days — with ids for cancel_my_booking.",
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

export const CLIENT_BOOKING_TOOLS: McpTool[] = [findPros, proOpenTimes, verifyPhone, confirmPhone, bookWithPro, myBookings, cancelMine];
