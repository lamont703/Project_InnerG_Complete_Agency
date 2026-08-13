/**
 * The service list a visitor picks from in the Book Appointment modal.
 *
 * THE RULE THIS FILE ENFORCES: the services offered must match the business
 * they appear on. A nail salon must not offer a beard trim. That sounds
 * obvious and is easy to get wrong, because the four entity page types draw
 * from two completely different sources of truth:
 *
 *   barbers, cosmetologists -> booksy_services. REAL, per-person, priced.
 *                              1,429/1,429 barbers and 122/122 cosmetologists
 *                              carry it. Use it verbatim; never override a
 *                              real price list with a guessed one.
 *
 *   shops, salons           -> NOTHING. There is no services column on
 *                              agent_barbershop_leads or agent_salon_leads,
 *                              and custom_amenities is populated on 4 rows out
 *                              of 5,213 (a finding the shortlists migration
 *                              recorded independently). So the list is curated
 *                              here and keyed off google_category.
 *
 * WHY google_category AND NOT THE ENTITY TYPE. The tables are not clean
 * buckets. agent_salon_leads holds 11 nail salons, 7 spas, 4 eyelash salons,
 * 4 medical spas and 10 barber shops alongside the hair and beauty salons.
 * Keying off the table name would put "Beard Trim" on a nail salon and
 * "Balayage" on a med spa — exactly the misalignment this file exists to
 * prevent. The category is the most specific true thing we hold.
 *
 * PRICES ARE NEVER INVENTED. Curated entries carry no price. A real one comes
 * only from booksy_services. Showing a made-up "$35" against a business that
 * never agreed to it would be a false claim about a third party.
 */

export type BookingEntityType = "shop" | "salon" | "barber" | "cosmetologist";

export interface BookableService {
  name: string;
  /** Real prices only — populated from booksy_services, never from a curated list. */
  price?: number | null;
  duration?: string | null;
  currency?: string | null;
}

/**
 * Offered last on every list. A visitor who does not know what the service is
 * called is still a lead, and forcing them to guess loses them at the first
 * field. The business sorts it out on the call.
 */
export const UNSURE_SERVICE = "Something else / not sure yet";

/**
 * Categories where booking an appointment makes no sense. Returning null for
 * these suppresses the CTA entirely rather than offering a haircut at a
 * supply store.
 *
 * "reviews" and "saved" are not businesses at all — they are scrape artifacts
 * sitting in google_category on 4 barbershop rows, and they are here so those
 * pages fail closed instead of falling through to the barbershop default.
 */
const NON_BOOKABLE = new Set([
  "barber supply store",
  "beauty supply store",
  "cosmetics store",
  "wig shop",
  "reviews",
  "saved",
]);

const BARBER_SHOP = [
  "Haircut",
  "Haircut & Beard Trim",
  "Beard Trim",
  "Line-Up / Edge-Up",
  "Head Shave",
  "Hot Towel Shave",
  "Kids Haircut",
  "Senior Haircut",
  "Hair Design",
];

const HAIR_SALON = [
  "Haircut & Style",
  "Blowout",
  "Single Process Color",
  "Highlights",
  "Balayage",
  "Root Touch-Up",
  "Deep Conditioning Treatment",
  "Keratin / Smoothing Treatment",
  "Updo / Special Occasion Style",
];

const BEAUTY_SALON = [
  "Haircut & Style",
  "Blowout",
  "Color",
  "Highlights",
  "Manicure",
  "Pedicure",
  "Facial",
  "Waxing",
  "Makeup Application",
];

const NAIL_SALON = [
  "Manicure",
  "Gel Manicure",
  "Pedicure",
  "Spa Pedicure",
  "Full Set — Acrylic",
  "Full Set — Gel / Builder",
  "Fill",
  "Nail Art",
  "Polish Change",
  "Soak-Off / Removal",
];

const EYELASH = [
  "Classic Full Set",
  "Hybrid Full Set",
  "Volume Full Set",
  "Lash Fill — 2 Week",
  "Lash Fill — 3 Week",
  "Lash Lift & Tint",
  "Lash Removal",
  "Brow Lamination",
];

const SPA = [
  "Massage",
  "Facial",
  "Body Treatment",
  "Waxing",
  "Manicure",
  "Pedicure",
  "Brow Shaping",
];

/**
 * Deliberately conservative. Everything clinical is phrased as a consultation:
 * this site is not in a position to represent that a given med spa performs a
 * given procedure, and a booking request is not a medical appointment.
 */
const MEDICAL_SPA = [
  "Consultation",
  "Facial",
  "Chemical Peel",
  "Microneedling",
  "Laser Hair Removal — Consultation",
  "Injectables — Consultation",
  "Body Contouring — Consultation",
];

const EXTENSIONS = [
  "Extension Consultation",
  "Extension Install",
  "Extension Move-Up / Maintenance",
  "Extension Removal",
  "Haircut & Blend",
  "Color Match",
];

const BEAUTICIAN = [
  "Facial",
  "Waxing",
  "Brow Shaping",
  "Brow Tint",
  "Lash Tint",
  "Makeup Application",
];

const BRAIDING = [
  "Box Braids",
  "Knotless Braids",
  "Cornrows",
  "Twists",
  "Locs — Retwist",
  "Locs — Maintenance",
  "Braid Takedown",
  "Consultation",
];

const THREADING = ["Brow Threading", "Lip Threading", "Full Face Threading", "Brow Tint", "Waxing"];

const MASSAGE = ["Massage — 30 min", "Massage — 60 min", "Massage — 90 min", "Deep Tissue", "Hot Stone"];

/**
 * google_category -> curated list. Keys are lowercased at lookup, so the
 * casing Google returns ("Barber shop") does not have to be reproduced here.
 *
 * The long tail matters: agent_salon_leads carries 25 distinct categories.
 * Anything not listed falls back to the entity-type default, which is why the
 * fallback has to be the safest generic list rather than the most common one.
 */
const BY_CATEGORY: Record<string, string[]> = {
  "barber shop": BARBER_SHOP,
  barbershop: BARBER_SHOP,
  "hair salon": HAIR_SALON,
  hairdresser: HAIR_SALON,
  "hair stylist": HAIR_SALON,
  "hair care": HAIR_SALON,
  "beauty salon": BEAUTY_SALON,
  "hair removal service": BEAUTICIAN,
  "waxing hair removal service": BEAUTICIAN,
  beautician: BEAUTICIAN,
  "nail salon": NAIL_SALON,
  "manicurist": NAIL_SALON,
  "eyelash salon": EYELASH,
  "eyebrow bar": THREADING,
  "threading service": THREADING,
  spa: SPA,
  "day spa": SPA,
  "medical spa": MEDICAL_SPA,
  "skin care clinic": MEDICAL_SPA,
  "facial spa": BEAUTICIAN,
  "massage spa": MASSAGE,
  "massage therapist": MASSAGE,
  "hair extension technician": EXTENSIONS,
  "hair extensions supplier": EXTENSIONS,
  "braiding salon": BRAIDING,
  "hair braiding": BRAIDING,
  "african hair braiding": BRAIDING,
  "loc salon": BRAIDING,
  "make-up artist": ["Makeup Application", "Bridal Makeup", "Special Occasion Makeup", "Makeup Lesson", "Consultation"],
  "makeup artist": ["Makeup Application", "Bridal Makeup", "Special Occasion Makeup", "Makeup Lesson", "Consultation"],
  "tanning salon": ["Spray Tan", "Tanning Session", "Consultation"],
  "permanent make-up clinic": ["Consultation", "Microblading", "Powder Brows", "Lip Blush", "Touch-Up"],
};

/**
 * Used when google_category is absent or unrecognised. A barbershop row is
 * overwhelmingly a barbershop (971 of 1,000 sampled), so that default is safe.
 * A salon row is not — the table is split roughly evenly between beauty and
 * hair salons, so BEAUTY_SALON is chosen because it spans both.
 */
const FALLBACK: Record<BookingEntityType, string[]> = {
  shop: BARBER_SHOP,
  salon: BEAUTY_SALON,
  barber: BARBER_SHOP,
  cosmetologist: BEAUTY_SALON,
};

/** booksy_services rows are third-party scrape output; treat every field as untrusted. */
function normalizeBooksyServices(raw: unknown): BookableService[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: BookableService[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const name = String((item as any).name ?? "").trim();
    if (!name || name.length > 120) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    // A price of 0 is real in this data (consultations, "from" entries) but it
    // reads as broken next to priced siblings, so it is carried as null.
    const rawPrice = Number((item as any).price);
    const price = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : null;

    const duration = String((item as any).duration ?? "").trim() || null;
    const currency = String((item as any).currency ?? "").trim() || null;

    out.push({ name, price, duration, currency });
  }
  return out;
}

const curated = (names: string[]): BookableService[] =>
  names.map((name) => ({ name, price: null, duration: null, currency: null }));

export interface ServiceLookup {
  entityType: BookingEntityType;
  /** google_category on shops and salons. Absent on barbers and cosmetologists. */
  googleCategory?: string | null;
  /** booksy_services on barbers and cosmetologists. Absent on shops and salons. */
  booksyServices?: unknown;
}

/**
 * The services to offer on this entity's page.
 *
 * Returns null when the business is not something you book an appointment
 * with — the caller must then render no Book Appointment CTA at all. Null and
 * an empty array mean different things and the caller should not conflate
 * them: null is "never bookable", [] is unreachable by construction because
 * every branch either returns null or a non-empty list.
 */
export function servicesForEntity(input: ServiceLookup): BookableService[] | null {
  const category = (input.googleCategory ?? "").trim().toLowerCase();

  if (category && NON_BOOKABLE.has(category)) return null;

  // Real per-person service lists win over anything curated.
  if (input.entityType === "barber" || input.entityType === "cosmetologist") {
    const real = normalizeBooksyServices(input.booksyServices);
    if (real.length > 0) {
      return [...real, { name: UNSURE_SERVICE, price: null, duration: null, currency: null }];
    }
    // booksy_services is non-null on every row today, but it can be an empty
    // array — falling through to the curated default keeps the CTA working
    // rather than dropping it on a person whose scrape returned nothing.
  }

  const list = (category && BY_CATEGORY[category]) || FALLBACK[input.entityType];
  return [...curated(list), { name: UNSURE_SERVICE, price: null, duration: null, currency: null }];
}

/** Convenience for the page: should a Book Appointment CTA render at all? */
export function isBookable(input: ServiceLookup): boolean {
  return servicesForEntity(input) !== null;
}

/** "Haircut — $30" / "Hybrid set — $100 · 2 hr 0 min" / "Blowout" */
export function formatServiceLabel(s: BookableService): string {
  const bits: string[] = [];
  if (typeof s.price === "number" && s.price > 0) bits.push(`$${s.price}`);
  if (s.duration) bits.push(s.duration);
  return bits.length ? `${s.name} — ${bits.join(" · ")}` : s.name;
}
