import { NextResponse } from "next/server";
import { bookableForEntity } from "@/lib/calendar/client-booking";

/**
 * Does this listing take real bookings? The Book button asks on open: a yes
 * switches it from the request form to the calendar, a no leaves it alone.
 * Public; returns nothing about the pro beyond what the booking screen shows.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const type = u.searchParams.get("entity_type") || "";
  const id = u.searchParams.get("entity_id") || "";
  if (!type || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ bookable: false });
  const pro = await bookableForEntity(type, id);
  if (!pro) return NextResponse.json({ bookable: false }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(
    {
      bookable: true,
      providerId: pro.provider.id,
      name: pro.provider.display_name,
      listing: pro.listing,
      timezone: pro.provider.timezone,
      windowDays: pro.provider.booking_window_days,
      services: pro.services.map((s) => ({ id: s.id, name: s.name, minutes: s.duration_minutes, priceCents: s.price_cents })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
