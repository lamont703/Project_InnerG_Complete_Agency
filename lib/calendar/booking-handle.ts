import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { makeBookingHandle, isBookingHandle } from "@/lib/calendar/booking-handle-rules";

/**
 * Each bookable calendar's public handle — /book/<handle>, and what a
 * client's AI assistant can be told ("book with marcus-cuts on ShearQuery").
 * Made from the calendar's name on first use, unique, and kept afterwards so
 * printed QR codes and shared links keep working.
 */

const db = () => createAdminClient() as any;

export async function ensureBookingHandle(providerId: string): Promise<string | null> {
  const { data: p } = await db().from("calendar_providers").select("booking_handle, display_name").eq("id", providerId).maybeSingle();
  if (!p) return null;
  if (p.booking_handle) return p.booking_handle;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: taken } = await db().from("calendar_providers").select("booking_handle").not("booking_handle", "is", null).ilike("booking_handle", `${makeBookingHandle(p.display_name, new Set())}%`);
    const handle = makeBookingHandle(p.display_name, new Set((taken || []).map((t: any) => t.booking_handle)));
    const { data: set } = await db().from("calendar_providers").update({ booking_handle: handle }).eq("id", providerId).is("booking_handle", null).select("booking_handle");
    if (set?.length) return handle;
    const { data: again } = await db().from("calendar_providers").select("booking_handle").eq("id", providerId).maybeSingle();
    if (again?.booking_handle) return again.booking_handle;
  }
  return null;
}

/** The calendar behind a handle, if any. */
export async function providerIdByHandle(handle: string): Promise<string | null> {
  const h = String(handle || "").trim().toLowerCase();
  if (!isBookingHandle(h)) return null;
  const { data } = await db().from("calendar_providers").select("id").eq("booking_handle", h).maybeSingle();
  return data?.id ?? null;
}
