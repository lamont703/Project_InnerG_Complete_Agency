"use server";

import { createClient } from "@supabase/supabase-js";
import { sendMetaConversionEvent, hashData, hashPhone } from "@/lib/meta-capi";
import { requestShopDay } from "@/app/shop-day-matches/actions";
import { geocode } from "@/lib/geocoding";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export type PayPreference = "Booth Rent" | "Commission" | "any";

export interface HiringShopMatch {
  id: string;
  shop_name: string;
  formatted_address: string | null;
  city: string | null;
  rating: number | null;
  total_reviews: number | null;
  rent_type: string | null;
  rent_rate: string | null;
  booth_count_available: number | null;
  google_images: string[] | null;
  distance_miles: number;
  pay_preference_match: boolean;
}

// The precomputed `barber_matched_shops` view (used by /shop-day-matches) is
// keyed to an EXISTING agent_barber_leads row and is distance-only — it
// can't be queried ad hoc for an anonymous quiz-taker who has no lead row
// yet, and it has no pay-structure filter at all. This does the same
// distance computation live, directly against agent_barbershop_leads, with
// a soft (not hard) pay-structure preference so we still surface real
// results when a neighborhood + pay type combination is thin — with only
// ~45 confirmed-hiring shops across all of Houston, a hard filter on both
// axes would frequently return zero.
export async function findHiringShopsNearby(
  neighborhoodOrAddress: string,
  payPreference: PayPreference
): Promise<
  | { success: true; matches: HiringShopMatch[]; searchRadiusMiles: number; widened: boolean; centerLabel: string }
  | { success: false; error: string }
> {
  const trimmed = neighborhoodOrAddress.trim();
  if (!trimmed) return { success: false, error: "Enter a Houston neighborhood, ZIP code, or address to search." };

  const center = await geocode(trimmed);
  if (!center) {
    return {
      success: false,
      error: "Couldn't find that location. Try a Houston ZIP code or a more specific neighborhood/address.",
    };
  }

  const { data: shops, error } = await supabase
    .from("agent_barbershop_leads")
    .select(
      "id, shop_name, formatted_address, city, rating, total_reviews, rent_type, rent_rate, booth_count_available, google_images, latitude, longitude"
    )
    .eq("hiring_need", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .ilike("city", "%houston%");

  if (error) {
    console.error("findHiringShopsNearby query error:", error);
    return { success: false, error: "Something went wrong searching for shops. Please try again." };
  }

  if (!shops || shops.length === 0) {
    return { success: true, matches: [], searchRadiusMiles: 0, widened: false, centerLabel: trimmed };
  }

  const withDistance = shops.map((s: any) => ({
    ...s,
    distance_miles: haversineMiles(center.lat, center.lng, Number(s.latitude), Number(s.longitude)),
    pay_preference_match: payPreference === "any" || s.rent_type === payPreference,
  }));

  // Progressive radius widening so a thin neighborhood still gets a
  // best-effort answer instead of a dead end.
  const RADII = [10, 25, 50, Infinity];
  let radiusUsed = RADII[0];
  let candidates = withDistance.filter((s) => s.distance_miles <= radiusUsed);

  for (const radius of RADII) {
    candidates = withDistance.filter((s) => s.distance_miles <= radius);
    radiusUsed = radius;
    if (candidates.length >= 3) break;
  }

  candidates.sort((a, b) => {
    if (a.pay_preference_match !== b.pay_preference_match) return a.pay_preference_match ? -1 : 1;
    return a.distance_miles - b.distance_miles;
  });

  const top3 = candidates.slice(0, 3).map((s) => ({
    id: s.id,
    shop_name: s.shop_name,
    formatted_address: s.formatted_address,
    city: s.city,
    rating: s.rating,
    total_reviews: s.total_reviews,
    rent_type: s.rent_type,
    rent_rate: s.rent_rate,
    booth_count_available: s.booth_count_available,
    google_images: s.google_images,
    distance_miles: Math.round(s.distance_miles * 10) / 10,
    pay_preference_match: s.pay_preference_match,
  }));

  return {
    success: true,
    matches: top3,
    searchRadiusMiles: radiusUsed === Infinity ? -1 : radiusUsed,
    widened: radiusUsed > RADII[0],
    centerLabel: trimmed,
  };
}

// Lightweight lead capture purpose-built for the quiz — intentionally does
// NOT reuse submitCareerPassport's full Career Passport payload (school
// name, licensure status, social handles, etc.). A quiz-taker asking "who's
// hiring near me" shouldn't have to fill out a full profile just to request
// one intro; they can complete their full Career Passport later from
// /barber-beauty-network if they want broader matching.
export async function requestShopIntro(payload: {
  name: string;
  phone: string;
  email?: string;
  neighborhood: string;
  desiredPayStructure: PayPreference;
  shopId: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const digits = payload.phone.replace(/\D/g, "").slice(-10);
    if (digits.length < 10) return { success: false, error: "Enter a valid 10-digit phone number." };

    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const likePattern = "%" + digits.split("").join("%") + "%";
    const { data: existing } = await supabaseAdmin
      .from("agent_barber_leads")
      .select("id, phone")
      .ilike("phone", likePattern);

    let barberId: string | null = null;
    if (existing && existing.length > 0) {
      const exact = existing.find((r: any) => r.phone?.replace(/\D/g, "").slice(-10) === digits);
      barberId = (exact || existing[0]).id;
    }

    const center = await geocode(payload.neighborhood);
    const rowPayload: Record<string, any> = {
      name: payload.name,
      phone: payload.phone,
      email: payload.email || null,
      address: payload.neighborhood,
      metro_area: `Houston ${payload.neighborhood}`.trim(),
      desired_pay_structure: payload.desiredPayStructure === "any" ? null : payload.desiredPayStructure,
      status: "interested_in_placement",
      is_actively_looking: true,
      source: "Barbershop Apprentice Jobs Quiz",
      latitude: center ? center.lat.toString() : null,
      longitude: center ? center.lng.toString() : null,
    };

    let resultData: any;
    if (barberId) {
      const { data, error } = await supabaseAdmin
        .from("agent_barber_leads")
        .update(rowPayload)
        .eq("id", barberId)
        .select()
        .single();
      if (error) throw error;
      resultData = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from("agent_barber_leads")
        .insert([rowPayload])
        .select()
        .single();
      if (error) throw error;
      resultData = data;
    }

    const shopDayResult = await requestShopDay(resultData.id, payload.shopId);
    if ("error" in shopDayResult) {
      console.error("requestShopDay failed after quiz lead creation:", shopDayResult.error);
      // Lead was still created — don't fail the whole request over the request-day step.
    }

    await sendMetaConversionEvent({
      event_name: "Lead",
      user_data: {
        ph: hashPhone(payload.phone),
        fn: hashData(payload.name?.split(" ")[0]),
        ln: hashData(payload.name?.split(" ").slice(1).join(" ")),
        st: hashData("tx"),
      },
      custom_data: { content_name: "Barbershop Apprentice Jobs Quiz", content_category: "Professional" },
    });

    return { success: true };
  } catch (err: any) {
    console.error("Error in requestShopIntro:", err);
    return { success: false, error: err.message || "Something went wrong. Please try again." };
  }
}

// Honest fallback for the cosmetology/salon persona — no salon has ever
// been confirmed as hiring via outreach (agent_salon_leads.hiring_need is
// 0/1,469 in Houston today), so this never pretends to show matches. It
// only captures interest so these leads are primed the moment salon
// outreach actually starts populating real hiring signals.
export async function submitSalonWaitlist(payload: {
  name: string;
  phone: string;
  email?: string;
  neighborhood: string;
  desiredPayStructure: PayPreference;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const digits = payload.phone.replace(/\D/g, "").slice(-10);
    if (digits.length < 10) return { success: false, error: "Enter a valid 10-digit phone number." };

    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { error } = await supabaseAdmin.from("agent_cosmetologist_leads").insert([
      {
        name: payload.name,
        phone: payload.phone,
        email: payload.email || null,
        address: payload.neighborhood,
        metro_area: `Houston ${payload.neighborhood}`.trim(),
        desired_pay_structure: payload.desiredPayStructure === "any" ? null : payload.desiredPayStructure,
        status: "interested_in_placement",
        is_actively_looking: true,
        source: "Barbershop Apprentice Jobs Quiz — Salon Waitlist",
      },
    ]);

    if (error) throw error;

    await sendMetaConversionEvent({
      event_name: "Lead",
      user_data: {
        ph: hashPhone(payload.phone),
        fn: hashData(payload.name?.split(" ")[0]),
        ln: hashData(payload.name?.split(" ").slice(1).join(" ")),
        st: hashData("tx"),
      },
      custom_data: { content_name: "Salon Waitlist", content_category: "Professional" },
    });

    return { success: true };
  } catch (err: any) {
    console.error("Error in submitSalonWaitlist:", err);
    return { success: false, error: err.message || "Something went wrong. Please try again." };
  }
}
