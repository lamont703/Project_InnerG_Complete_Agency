import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getProvider, setHoursForDays, upsertService, upsertClient, findService, findOpenTimes,
  bookAppointment, setAppointmentStatus, addTimeOff, type Provider,
} from "@/lib/calendar/store";
import { localDateKey, addDaysToKey, weekdayOfKey, parseDateKey, zonedToUtc } from "@/lib/calendar/time";

/**
 * A demo appointment book, for showing ShearQuery to a prospective agency
 * partner in their own Claude.
 *
 * FILLS THE MEMBER'S OWN CALENDAR, marked is_demo. Every calendar tool already
 * acts on the signed-in member's calendar, so a demo needs no agency accounts:
 * the agency signs up, gets this, and their Claude runs the real tools on it.
 *
 * SAFETY, because this wipes and refills:
 *  - It refuses a member whose calendar is NOT a demo. A real book is never
 *    touched, whatever flag is passed.
 *  - Clients get 555-01xx numbers, the range reserved for fiction, and pro-side
 *    bookings never text anyone. Demo calendars are hidden from client search.
 *  - Bookings go through the same store functions and overlap guard as real
 *    ones, so the demo shows exactly what the product does.
 */

const DEMO_NAME = "ShearQuery Demo Barbershop";
const TZ = "America/Chicago";

const SERVICES = [
  { name: "Haircut", duration_minutes: 45, price_cents: 3500, buffer_minutes: 10 },
  { name: "Fade", duration_minutes: 45, price_cents: 4000, buffer_minutes: 10 },
  { name: "Haircut + Beard", duration_minutes: 60, price_cents: 5500, buffer_minutes: 10 },
  { name: "Beard Trim", duration_minutes: 20, price_cents: 2000, buffer_minutes: 5 },
  { name: "Line Up", duration_minutes: 15, price_cents: 1500, buffer_minutes: 5 },
  { name: "Kids Cut", duration_minutes: 30, price_cents: 2500, buffer_minutes: 5 },
];

const CLIENTS = [
  { name: "Marcus Hill", phone: "+17135550101", notes: "Skin fade, #2 on top. Likes a hard part." },
  { name: "Dee Johnson", phone: "+17135550102", notes: "Beard sensitive — no hot towel." },
  { name: "Tony Ramirez", phone: "+17135550103", notes: "Runs late; text a reminder." },
  { name: "Jaylen Brooks", phone: "+17135550104", notes: null },
  { name: "Chris Nguyen", phone: "+17135550105", notes: "Brings his son for a kids cut." },
  { name: "Andre Williams", phone: "+17135550106", notes: "Every two weeks, Fridays." },
  { name: "Sam Patel", phone: "+17135550107", notes: null },
  { name: "Rico Davis", phone: "+17135550108", notes: "No-showed once in August." },
];

// Tue–Fri 9–7 with a lunch break, Sat 8–4, closed Sun/Mon.
const HOURS = [2, 3, 4, 5].map((weekday) => ({ weekday, ranges: [{ start: 540, end: 780 }, { start: 840, end: 1140 }] }))
  .concat([{ weekday: 6, ranges: [{ start: 480, end: 960 }] }, { weekday: 0, ranges: [] }, { weekday: 1, ranges: [] }]);

// [day offset from today, service, client index, status] — past days build visit history.
const PLAN: [number, string, number, "booked" | "completed" | "no_show"][] = [
  [-13, "Fade", 0, "completed"], [-12, "Haircut + Beard", 5, "completed"], [-10, "Beard Trim", 1, "completed"],
  [-9, "Haircut", 7, "no_show"], [-6, "Kids Cut", 4, "completed"], [-5, "Fade", 3, "completed"],
  [-3, "Haircut", 6, "completed"], [-2, "Haircut + Beard", 5, "completed"],
  [0, "Fade", 0, "booked"], [0, "Beard Trim", 1, "booked"], [1, "Haircut", 2, "booked"], [1, "Line Up", 3, "booked"],
  [2, "Kids Cut", 4, "booked"], [2, "Haircut + Beard", 5, "booked"], [3, "Fade", 6, "booked"],
  [4, "Haircut", 7, "booked"], [6, "Fade", 3, "booked"], [8, "Haircut + Beard", 5, "booked"], [9, "Fade", 0, "booked"],
];

export interface SeedResult { providerId: string; services: number; clients: number; appointments: number; skipped: number }

export async function seedDemoCalendar(memberId: string): Promise<SeedResult> {
  const db = createAdminClient() as any;
  let provider: Provider | null = await getProvider(memberId);

  if (provider && !provider.is_demo) {
    throw new Error("This member already has a REAL calendar. The demo seeder never touches a real book.");
  }

  if (!provider) {
    const { data, error } = await db
      .from("calendar_providers")
      .insert({ community_member_id: memberId, display_name: DEMO_NAME, timezone: TZ, is_demo: true, slot_step_minutes: 15, min_notice_minutes: 60 })
      .select("*")
      .single();
    if (error) throw new Error(`could not create the demo calendar: ${error.message}`);
    provider = data as Provider;
  } else {
    // Refresh: clear the old made-up data. Safe only because is_demo was checked above.
    const pid = provider.id;
    await db.from("calendar_appointments").delete().eq("provider_id", pid);
    await db.from("calendar_clients").delete().eq("provider_id", pid);
    await db.from("calendar_services").delete().eq("provider_id", pid);
    await db.from("calendar_time_off").delete().eq("provider_id", pid);
    await db.from("calendar_providers").update({ display_name: DEMO_NAME, timezone: TZ, updated_at: new Date().toISOString() }).eq("id", pid);
    provider = (await getProvider(memberId))!;
  }
  const p = provider!;

  await setHoursForDays(p.id, HOURS);
  for (const s of SERVICES) await upsertService(p.id, s);
  const clients = [];
  for (const c of CLIENTS) clients.push(await upsertClient(p.id, c));

  // A dentist appointment next week, to show time off.
  const today = localDateKey(new Date(), TZ);
  const offKey = nextOpenDay(addDaysToKey(today, 7));
  const off = parseDateKey(offKey)!;
  await addTimeOff(p.id, zonedToUtc(off.year, off.month, off.day, 13 * 60, TZ), zonedToUtc(off.year, off.month, off.day, 15 * 60, TZ), "Dentist");

  let appointments = 0, skipped = 0;
  const used = new Set<string>();
  for (const [offset, serviceName, ci, status] of PLAN) {
    const key = nextOpenDay(addDaysToKey(today, offset), offset < 0 ? -1 : 1);
    const service = (await findService(p.id, serviceName))!;
    // Past days: offer every slot (forClient false still floors at "now", so
    // compute past slots directly from hours by booking at a fixed time).
    const start = offset < 0
      ? pastStart(key, used)
      : (await findOpenTimes({ provider: p, service, fromKey: key, toKey: key, forClient: false, limit: 40 })).find((d) => !used.has(d.toISOString()));
    if (!start) { skipped++; continue; }
    const res = await bookAppointment({ provider: p, service, start, client: clients[ci], source: "claude", allowOutsideHours: offset < 0 });
    if (!res.ok) { skipped++; continue; }
    used.add(start.toISOString());
    appointments++;
    if (status !== "booked") await setAppointmentStatus({ providerId: p.id, id: res.appointment.id, status });
  }

  return { providerId: p.id, services: SERVICES.length, clients: clients.length, appointments, skipped };
}

/** Skip Sunday/Monday, the demo shop's closed days. */
function nextOpenDay(key: string, direction = 1): string {
  let k = key;
  while ([0, 1].includes(weekdayOfKey(k))) k = addDaysToKey(k, direction);
  return k;
}

/** Past appointments at 10am, 11am, 2pm… on their day, never twice at one time. */
function pastStart(key: string, used: Set<string>): Date | undefined {
  const d = parseDateKey(key)!;
  for (const minute of [600, 660, 840, 900, 960]) {
    const t = zonedToUtc(d.year, d.month, d.day, minute, TZ);
    if (!used.has(t.toISOString())) return t;
  }
  return undefined;
}
