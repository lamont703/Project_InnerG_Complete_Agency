import { NextResponse } from "next/server";
import { bookableProvider, clientOpenTimes } from "@/lib/calendar/client-booking";
import { parseDateKey, formatLocal } from "@/lib/calendar/time";

/** Open times for one service on one day, with the client rules (notice, window). Public. */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const pro = await bookableProvider(u.searchParams.get("provider") || "");
  if (!pro) return NextResponse.json({ error: "This calendar isn't taking bookings." }, { status: 404 });
  const service = pro.services.find((s) => s.id === u.searchParams.get("service"));
  if (!service) return NextResponse.json({ error: "Pick a service." }, { status: 400 });
  const date = u.searchParams.get("date") || "";
  if (!parseDateKey(date)) return NextResponse.json({ error: "Pick a date." }, { status: 400 });
  const slots = await clientOpenTimes(pro, service, date, date, 100);
  return NextResponse.json(
    { slots: slots.map((d) => ({ iso: d.toISOString(), label: formatLocal(d, pro.provider.timezone, false) })) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
