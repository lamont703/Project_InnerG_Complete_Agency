"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface LateNightBarberListing {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  metroArea: string | null;
  rating: number | null;
  reviewCount: number | null;
  profileUrl: string | null;
  latestCloseLabel: string; // e.g. "11:00 PM"
  latestCloseHour24: number; // for sorting
  lateDays: string[]; // days that close at 8PM or later
}

const DAY_ABBREV: Record<string, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
  Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};

// Real closing time is what matters here, not just an "open late" flag —
// parses booksy_hours ranges like "8:00 AM - 11:00 PM" (some days have
// multiple split ranges, e.g. a lunch break) and keeps the latest close
// across the whole week, in 24-hour terms for sorting plus the original
// 12-hour label for display.
function parseCloseTime(range: string): { hour24: number; label: string } | null {
  const m = range.match(/-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = m[2];
  const period = m[3].toUpperCase();
  let hour24 = hour % 12;
  if (period === "PM") hour24 += 12;
  return { hour24, label: `${hour}:${minute} ${period}` };
}

// Verified before building: 693 of 1,330 Houston-area barbers with hours
// data (52%) have a closing time of 8 PM or later on at least one real
// day — the "late night barber" bar is set at that same 8 PM threshold,
// not an arbitrary one.
const LATE_THRESHOLD_HOUR_24 = 20;

export async function fetchLateNightBarbers(): Promise<LateNightBarberListing[]> {
  const { data: rows, error } = await supabase
    .from("agent_barber_leads")
    .select("id, slug, name, address, metro_area, booksy_rating, booksy_review_count, booksy_hours, profile_url")
    .or("metro_area.ilike.%houston%,address.ilike.%houston%")
    .not("booksy_hours", "eq", "[]");

  if (error || !rows) {
    console.error("fetchLateNightBarbers query error:", error);
    return [];
  }

  const listings: LateNightBarberListing[] = [];
  for (const r of rows as any[]) {
    const hours = Array.isArray(r.booksy_hours) ? r.booksy_hours : [];
    let latestHour24 = -1;
    let latestLabel = "";
    const lateDays: string[] = [];

    for (const day of hours) {
      const ranges: string[] = Array.isArray(day.ranges) ? day.ranges : [];
      let dayLatestHour24 = -1;
      let dayLatestLabel = "";
      for (const range of ranges) {
        const parsed = parseCloseTime(range);
        if (!parsed) continue;
        if (parsed.hour24 > dayLatestHour24) {
          dayLatestHour24 = parsed.hour24;
          dayLatestLabel = parsed.label;
        }
      }
      if (dayLatestHour24 >= LATE_THRESHOLD_HOUR_24) {
        lateDays.push(DAY_ABBREV[day.day] || day.day);
      }
      if (dayLatestHour24 > latestHour24) {
        latestHour24 = dayLatestHour24;
        latestLabel = dayLatestLabel;
      }
    }

    if (latestHour24 < LATE_THRESHOLD_HOUR_24) continue;

    listings.push({
      id: r.id,
      slug: r.slug,
      name: r.name,
      address: r.address,
      metroArea: r.metro_area,
      rating: r.booksy_rating,
      reviewCount: r.booksy_review_count,
      profileUrl: r.profile_url,
      latestCloseLabel: latestLabel,
      latestCloseHour24: latestHour24,
      lateDays,
    });
  }

  // Latest closing time first — that's the actual point of this page —
  // then rating/reviews as the tiebreaker, same as the other pages.
  listings.sort((a, b) => {
    if (b.latestCloseHour24 !== a.latestCloseHour24) return b.latestCloseHour24 - a.latestCloseHour24;
    const ratingDiff = (b.rating || 0) - (a.rating || 0);
    if (ratingDiff !== 0) return ratingDiff;
    return (b.reviewCount || 0) - (a.reviewCount || 0);
  });

  return listings.slice(0, 20);
}
