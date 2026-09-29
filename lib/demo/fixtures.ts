import { SITE_URL } from "@/lib/site";
import type { DemoType } from "@/lib/demo/session";

/**
 * The made-up businesses, as Google and Instagram would hold them.
 *
 * Written to DEMONSTRATE, so each one has gaps an audit will find — a missing
 * photo category, unanswered reviews, no recent post — because a demo where
 * everything is already perfect shows an agency nothing to sell.
 *
 * Every name says "Demo", every phone number is 555-01xx (fiction), and every
 * link is example.com, so none can be mistaken for, or collide with, a real
 * business. Photos are the site's own images.
 */

export const DEMO_ACCOUNT = "accounts/1000000001";

const LOCATION_IDS: Record<DemoType, string> = {
  barbershop: "9000000001", salon: "9000000002", barber: "9000000003",
  cosmetologist: "9000000004", school: "9000000005", supply_store: "9000000006",
};
export const demoLocationName = (t: DemoType) => `locations/${LOCATION_IDS[t]}`;

// ── Google's category list, the slice the demo needs ────────────────────────

export interface DemoCategory { name: string; displayName: string; serviceTypes: { serviceTypeId: string; displayName: string }[] }

const svc = (id: string, displayName: string) => ({ serviceTypeId: `job_type_id:${id}`, displayName });

export const CATEGORY_CATALOG: DemoCategory[] = [
  { name: "categories/gcid:barber_shop", displayName: "Barber shop", serviceTypes: [svc("haircut", "Haircut"), svc("beard_trimming", "Beard trimming"), svc("hot_towel_shave", "Hot towel shave"), svc("kids_haircut", "Kids haircut"), svc("line_up", "Line up"), svc("hair_coloring", "Hair coloring")] },
  { name: "categories/gcid:hair_salon", displayName: "Hair salon", serviceTypes: [svc("haircut", "Haircut"), svc("hair_coloring", "Hair coloring"), svc("highlights", "Highlights"), svc("blowout", "Blowout"), svc("silk_press", "Silk press"), svc("braiding", "Braiding"), svc("keratin_treatment", "Keratin treatment")] },
  { name: "categories/gcid:beauty_salon", displayName: "Beauty salon", serviceTypes: [svc("eyebrow_shaping", "Eyebrow shaping"), svc("waxing", "Waxing"), svc("makeup", "Makeup")] },
  { name: "categories/gcid:hairdresser", displayName: "Hairdresser", serviceTypes: [svc("haircut", "Haircut"), svc("blowout", "Blowout"), svc("silk_press", "Silk press")] },
  { name: "categories/gcid:nail_salon", displayName: "Nail salon", serviceTypes: [svc("manicure", "Manicure"), svc("pedicure", "Pedicure")] },
  { name: "categories/gcid:barber_school", displayName: "Barber school", serviceTypes: [] },
  { name: "categories/gcid:beauty_school", displayName: "Beauty school", serviceTypes: [] },
  { name: "categories/gcid:cosmetology_school", displayName: "Cosmetology school", serviceTypes: [] },
  { name: "categories/gcid:beauty_supply_store", displayName: "Beauty supply store", serviceTypes: [] },
  { name: "categories/gcid:barber_supply_store", displayName: "Barber supply store", serviceTypes: [] },
  { name: "categories/gcid:wig_shop", displayName: "Wig shop", serviceTypes: [] },
];

export const ATTRIBUTE_METADATA = [
  { parent: "attributes/has_wheelchair_accessible_entrance", displayName: "Wheelchair accessible entrance", groupDisplayName: "Accessibility", valueType: "BOOL", deprecated: false },
  { parent: "attributes/has_restroom", displayName: "Restroom", groupDisplayName: "Amenities", valueType: "BOOL", deprecated: false },
  { parent: "attributes/welcomes_children", displayName: "Good for kids", groupDisplayName: "Crowd", valueType: "BOOL", deprecated: false },
  { parent: "attributes/requires_appointments", displayName: "Appointment required", groupDisplayName: "Planning", valueType: "BOOL", deprecated: false },
  { parent: "attributes/has_onsite_parking", displayName: "On-site parking", groupDisplayName: "Parking", valueType: "BOOL", deprecated: false },
  { parent: "attributes/accepts_nfc_mobile_payments", displayName: "NFC mobile payments", groupDisplayName: "Payments", valueType: "BOOL", deprecated: false },
];

// ── one business per type ───────────────────────────────────────────────────

interface Spec {
  title: string;
  primary: string;
  additional: string[];
  description: string | null;
  services: string[];
  freeForm: string[];
  hours: [string, number, number][];
  keywords: string[];
  reviews: [number, string, string | null][];
  posts: string[];
  instagram: { username: string; followers: number; bio: string } | null;
}

const WEEKDAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const tueSat = (open: number, close: number, satClose: number): [string, number, number][] =>
  [...WEEKDAYS.slice(1, 5).map((d): [string, number, number] => [d, open, close]), ["SATURDAY", 8, satClose]];

const SPECS: Record<DemoType, Spec> = {
  barbershop: {
    title: "ShearQuery Demo Barbershop",
    primary: "categories/gcid:barber_shop",
    additional: [],
    description: "A neighborhood barbershop for fades, tapers and beard work. Walk-ins welcome most weekdays.",
    services: ["haircut", "beard_trimming", "kids_haircut"],
    freeForm: ["Fade"],
    hours: tueSat(9, 19, 16),
    keywords: ["barbershop near me", "fade haircut", "barber houston", "kids haircut near me", "beard trim"],
    reviews: [
      [5, "Best fade I've had in years. In and out in forty minutes.", "Thank you! See you in two weeks."],
      [5, "Clean shop, friendly barbers, fair prices.", null],
      [4, "Great cut, but the wait on Saturday was long.", null],
      [5, "My son loves coming here. Patient with kids.", "We love having him in the chair!"],
      [2, "Booked online and still waited 30 minutes.", null],
      [5, "Beard line-up was perfect.", null],
    ],
    posts: ["Saturday slots are filling fast — book ahead this week."],
    instagram: { username: "shearquery.demo.barbershop", followers: 2140, bio: "Fades, tapers & beard work · Houston · book at the link" },
  },
  salon: {
    title: "ShearQuery Demo Salon",
    primary: "categories/gcid:hair_salon",
    additional: ["categories/gcid:beauty_salon"],
    description: "Color, cuts and silk presses in a relaxed studio. Consultations are always free.",
    services: ["haircut", "hair_coloring", "silk_press"],
    freeForm: ["Gloss treatment"],
    hours: tueSat(10, 19, 17),
    keywords: ["hair salon near me", "silk press houston", "balayage near me", "hair color salon", "best salon houston"],
    reviews: [
      [5, "My color came out exactly like the picture I brought.", "So glad you love it!"],
      [5, "Silk press lasted two weeks. Worth every penny.", null],
      [3, "Nice stylist but they ran 20 minutes behind.", null],
      [5, "Finally a salon that listens.", null],
      [4, "Beautiful space, parking is tricky.", null],
    ],
    posts: [],
    instagram: { username: "shearquery.demo.salon", followers: 3870, bio: "Color · silk press · cuts · consultations free" },
  },
  barber: {
    title: "ShearQuery Demo Barber",
    primary: "categories/gcid:barber_shop",
    additional: [],
    description: null,
    services: ["haircut", "beard_trimming"],
    freeForm: [],
    hours: tueSat(10, 18, 15),
    keywords: ["barber near me", "fade near me", "taper haircut"],
    reviews: [
      [5, "Consistent every single time.", null],
      [5, "Books up fast for a reason.", null],
      [4, "Great cut, a little pricey.", null],
    ],
    posts: [],
    instagram: { username: "shearquery.demo.barber", followers: 980, bio: "Booth 3 · fades & tapers · DM or book at the link" },
  },
  cosmetologist: {
    title: "ShearQuery Demo Stylist",
    primary: "categories/gcid:hairdresser",
    additional: [],
    description: "Independent stylist in a private suite. Specializing in natural hair and silk presses.",
    services: ["silk_press", "blowout"],
    freeForm: [],
    hours: tueSat(9, 17, 14),
    keywords: ["silk press near me", "natural hair stylist", "hair stylist houston"],
    reviews: [
      [5, "Healthiest my hair has ever been.", "Thank you for trusting me with it!"],
      [5, "Private suite, no rush, amazing results.", null],
    ],
    posts: ["Two openings left this Friday."],
    instagram: { username: "shearquery.demo.stylist", followers: 1520, bio: "Natural hair & silk press · private suite · by appointment" },
  },
  school: {
    title: "ShearQuery Demo Barber Academy",
    primary: "categories/gcid:barber_school",
    additional: ["categories/gcid:beauty_school"],
    description: null,
    services: [],
    freeForm: [],
    hours: [...WEEKDAYS.slice(0, 5).map((d): [string, number, number] => [d, 8, 17])],
    keywords: ["barber school near me", "barber school houston", "cosmetology school near me", "barber license texas"],
    reviews: [
      [5, "Instructors really prepare you for the state exam.", null],
      [4, "Good program, wish there were more evening classes.", null],
      [5, "Passed my practical on the first try.", "Congratulations — proud of you!"],
      [3, "Financial aid office was slow to respond.", null],
    ],
    posts: [],
    instagram: null,
  },
  supply_store: {
    title: "ShearQuery Demo Beauty Supply",
    primary: "categories/gcid:beauty_supply_store",
    additional: ["categories/gcid:barber_supply_store"],
    description: "Clippers, trimmers, shears and color for pros and students. Licensed pros get trade pricing.",
    services: [],
    freeForm: [],
    hours: [...WEEKDAYS.slice(0, 6).map((d): [string, number, number] => [d, 9, 20])],
    keywords: ["beauty supply near me", "barber supply store", "clippers near me"],
    reviews: [
      [5, "Everything I needed for my state board kit.", null],
      [4, "Good prices on clippers.", null],
      [2, "Out of stock on the guards I needed.", null],
    ],
    posts: [],
    instagram: null,
  },
};

const REVIEWERS = ["Jordan M.", "Alexis R.", "Chris T.", "Dana W.", "Sam K.", "Taylor B.", "Morgan L.", "Riley P."];
const STARS = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE"];
const PHOTOS: [string, string][] = [
  ["COVER", "/shop-interior.png"], ["INTERIOR", "/default_shop_image.png"], ["AT_WORK", "/service-fade.png"],
  ["ADDITIONAL", "/service-haircut.png"], ["ADDITIONAL", "/service-beard.png"],
];

const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000).toISOString();

/** The fake Google profile for one demo business, fresh. */
export function initialGbpState(type: DemoType) {
  const s = SPECS[type];
  const loc = demoLocationName(type);
  const parent = `${DEMO_ACCOUNT}/${loc}`;
  const cat = (name: string) => ({ name, displayName: CATEGORY_CATALOG.find((c) => c.name === name)?.displayName ?? name });
  const holiday = new Date(Date.now() + 30 * 86400_000);
  const ymd = { year: holiday.getUTCFullYear(), month: holiday.getUTCMonth() + 1, day: holiday.getUTCDate() };

  const location = {
    name: loc,
    title: s.title,
    phoneNumbers: { primaryPhone: `(713) 555-01${LOCATION_IDS[type].slice(-2)}` },
    websiteUri: "https://example.com/",
    storefrontAddress: { regionCode: "US", addressLines: ["100 Demo Street"], locality: "Houston", administrativeArea: "TX", postalCode: "77002" },
    regularHours: { periods: s.hours.map(([d, o, c]) => ({ openDay: d, openTime: { hours: o }, closeDay: d, closeTime: { hours: c } })) },
    specialHours: { specialHourPeriods: [{ startDate: ymd, endDate: ymd, closed: true }] },
    profile: s.description ? { description: s.description } : {},
    categories: { primaryCategory: cat(s.primary), additionalCategories: s.additional.map(cat) },
    serviceItems: [
      ...s.services.map((id) => ({ structuredServiceItem: { serviceTypeId: `job_type_id:${id}` } })),
      ...s.freeForm.map((displayName) => ({ freeFormServiceItem: { label: { displayName, languageCode: "en" } } })),
    ],
    openInfo: { status: "OPEN" },
    metadata: { placeId: `demo-${type}`, mapsUri: "https://example.com/maps" },
    latlng: { latitude: 29.7604, longitude: -95.3698 },
  };

  return {
    location,
    attributes: [{ name: "attributes/has_wheelchair_accessible_entrance", valueType: "BOOL", values: [true] }],
    place_actions: type === "school" || type === "supply_store" ? [] : [
      { name: `${loc}/placeActionLinks/1`, uri: "https://example.com/book", placeActionType: "APPOINTMENT", providerType: "MERCHANT", isEditable: true, isPreferred: true },
    ],
    reviews: s.reviews.map(([stars, comment, reply], i) => ({
      name: `${parent}/reviews/r${i + 1}`,
      reviewId: `r${i + 1}`,
      reviewer: { displayName: REVIEWERS[i % REVIEWERS.length] },
      starRating: STARS[stars],
      comment,
      createTime: daysAgo(3 + i * 9),
      updateTime: daysAgo(3 + i * 9),
      ...(reply ? { reviewReply: { comment: reply, updateTime: daysAgo(2 + i * 9) } } : {}),
    })),
    posts: s.posts.map((summary, i) => ({
      name: `${parent}/localPosts/p${i + 1}`,
      summary, topicType: "STANDARD", state: "LIVE", languageCode: "en-US",
      createTime: daysAgo(24 + i * 20),
    })),
    media: PHOTOS.slice(0, type === "barber" ? 2 : type === "supply_store" ? 3 : 5).map(([category, path], i) => ({
      name: `${parent}/media/m${i + 1}`,
      mediaFormat: "PHOTO",
      locationAssociation: { category },
      googleUrl: `${SITE_URL}${path}`,
      thumbnailUrl: `${SITE_URL}${path}`,
      dimensions: { widthPixels: 1200, heightPixels: 800 },
      createTime: daysAgo(40 + i * 15),
    })),
  };
}

export const searchKeywords = (type: DemoType) => SPECS[type].keywords;
export const instagramProfile = (type: DemoType) => SPECS[type].instagram;
export const demoTitle = (type: DemoType) => SPECS[type].title;
