import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookableProvider, type BookablePro } from "@/lib/calendar/client-booking";
import { getAppointment } from "@/lib/calendar/store";
import { sendReminder } from "@/lib/calendar/notify";

/**
 * Day-before reminders for client bookings, and releasing unpaid holds. Hourly.
 *
 * Window: appointments starting 22–26 hours from now that have not been
 * reminded. Hourly runs overlap that window on purpose, so a skipped run is
 * covered by the next one; sendReminder claims the row before texting, so the
 * overlap cannot send twice.
 *
 * ONLY APPOINTMENTS CLIENTS BOOKED THEMSELVES (web or their Claude). Those
 * clients gave and verified their number to be texted about this booking. A
 * client the pro typed in has not agreed to texts from us.
 *
 * Only calendars still bookable (owner allowlisted) are reminded.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Also let go of any time held for a client who never paid (lib/calendar/payments.ts).
  // Each pro's holds are released when their times are next looked at; this
  // sweep covers calendars nobody is looking at.
  const { releaseExpiredHolds } = await import("@/lib/calendar/payments");
  await releaseExpiredHolds().catch((e) => console.error("[cron] hold release failed:", e?.message));

  const now = Date.now();
  const { data: due } = await (createAdminClient().from("calendar_appointments") as any)
    .select("id, provider_id")
    .in("status", ["booked", "confirmed"])
    .in("source", ["web", "client_claude"])
    .is("reminder_sent_at", null)
    .gte("starts_at", new Date(now + 22 * 3600_000).toISOString())
    .lt("starts_at", new Date(now + 26 * 3600_000).toISOString())
    .limit(200);

  const pros = new Map<string, BookablePro | null>();
  let sent = 0, skipped = 0;
  for (const row of due || []) {
    if (!pros.has(row.provider_id)) pros.set(row.provider_id, await bookableProvider(row.provider_id));
    const pro = pros.get(row.provider_id);
    const appt = pro ? await getAppointment(row.provider_id, row.id) : null;
    if (!pro || !appt) { skipped++; continue; }
    if (await sendReminder({ pro, appointment: appt })) sent++;
    else skipped++;
  }
  return NextResponse.json({ ok: true, due: (due || []).length, sent, skipped });
}
