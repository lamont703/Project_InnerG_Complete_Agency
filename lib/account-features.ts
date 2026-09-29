import { AUDIENCES, membershipPath, type AudienceId } from "@/lib/audiences";

/**
 * WHAT EACH ACCOUNT TYPE GETS, AND WHAT IS ACTUALLY OPEN — for agencies
 * pitching ShearQuery, and for anyone asking Claude what an account does.
 *
 * Two halves, neither restated from somewhere else:
 *  - On the website: each type's benefits from lib/audiences.ts, the same copy
 *    its /membership page shows.
 *  - In Claude: the features below, each naming the MCP tools that back it
 *    (account-features.test.ts fails if a tool is renamed or removed).
 *
 * STATUS IS READ FROM THE SAME SWITCHES THE TOOLS OBEY, not written by hand.
 * An agency repeating this to a barber is making our promise for us, so a
 * feature open only to our test account must never read as available — and
 * one we open must not keep reading as "testing" either.
 *
 * Pricing is stated once, here, and the audiences' "Free, Always" benefit is
 * left out of the guide: paid tiers are decided (2026-09-28), so an agency
 * must not promise free forever, and no price is set to quote instead.
 */

export type FeatureStatus = "live" | "testing";

export interface ClaudeFeature {
  id: string;
  title: string;
  what: string;
  types: AudienceId[];
  /** Said with the feature wherever it's shown, e.g. what the owner has to do first. */
  needs?: string;
  status: () => FeatureStatus;
  tools: string[];
}

const live = (): FeatureStatus => "live";
const calendarStatus = (): FeatureStatus => (process.env.CALENDAR_OPEN === "true" ? "live" : "testing");
const instagramStatus = (): FeatureStatus => (process.env.INSTAGRAM_MEMBER_CONNECT_OPEN === "true" ? "live" : "testing");

const PROS: AudienceId[] = ["barber", "cosmetologist", "barbershop", "salon"];
const EVERYONE: AudienceId[] = ["client", "student", "barber", "cosmetologist", "barbershop", "salon", "school", "supply_store"];

export const CLAUDE_FEATURES: ClaudeFeature[] = [
  {
    id: "industry_data",
    title: "Industry data in Claude",
    what: "Booth rent by city, shop and salon comparisons, school exam pass rates, Texas licensee counts, a license check, and a Google profile audit of any listed business. No account needed.",
    types: EVERYONE,
    status: live,
    tools: ["booth_rent_for_city", "compare_barbershops_salons", "compare_barber_cosmetology_schools", "texas_licensee_counts", "verify_texas_license", "audit_google_business_profile"],
  },
  {
    id: "google_profile",
    title: "Run their Google Business Profile from Claude",
    what: "A full audit of their profile, their reviews, photos and posts, and changes to hours, description, categories, services, contact details and booking link. Claude drafts a change, the owner approves it in the chat, and it goes live on Google — every change can be undone, and every publish is emailed to them. Photos can be uploaded straight into the chat.",
    types: ["barbershop", "salon", "school", "supply_store", "barber", "cosmetologist"],
    needs: "A Google Business Profile they own, connected once on shearquery.com. For a barber or cosmetologist, only if they have their own profile — booth renters often do.",
    status: live,
    tools: ["my_google_profile_audit", "my_google_profile", "my_reviews", "my_photos", "my_posts", "my_photo_coverage", "propose_regular_hours", "propose_description", "propose_review_reply", "propose_post", "upload_photo", "publish_change", "undo_change", "my_changes"],
  },
  {
    id: "calendar",
    title: "An appointment book run from Claude",
    what: "Working hours, services and prices, booking, moving and cancelling appointments, time off, and looking up a client — by talking to Claude. Clients get text confirmations and a reminder the day before.",
    types: PROS,
    needs: "Texts to clients also wait on carrier registration before they run at volume.",
    status: calendarStatus,
    tools: ["my_calendar", "my_schedule", "set_calendar_hours", "save_calendar_service", "book_appointment", "move_appointment", "cancel_appointment", "block_time_off", "find_client"],
  },
  {
    id: "client_booking",
    title: "Clients book in Claude",
    what: "A client asks Claude for a barber or stylist, sees open times, confirms their phone number and books — no app or website.",
    types: ["client"],
    needs: "Only pros using the ShearQuery calendar can be booked this way.",
    status: calendarStatus,
    tools: ["find_pros_to_book", "pro_open_times", "book_with_pro", "my_bookings", "cancel_my_booking"],
  },
  {
    id: "instagram",
    title: "Instagram insights in Claude",
    what: "Their Instagram account's reach and followers, how each post did, and which posts brought people through to book.",
    types: PROS,
    needs: "Waiting on Meta's approval before anyone but ShearQuery's test account can connect.",
    status: instagramStatus,
    tools: ["my_instagram_account", "my_instagram_insights", "my_instagram_posts", "my_instagram_conversions"],
  },
];

/** The types an agency would sign up, in pitch order. Agency itself is left out. */
export const GUIDE_TYPES: AudienceId[] = ["barbershop", "salon", "barber", "cosmetologist", "school", "supply_store", "student", "client"];

export const PRICING_NOTE =
  "Free today. Paid tiers are planned and not priced yet — don't promise it stays free, and don't quote a price.";

export const STATUS_LABEL: Record<FeatureStatus, string> = {
  live: "Available now",
  testing: "In testing — not open to their clients yet",
};

/** Benefits that are pricing claims, which PRICING_NOTE replaces. */
const PRICING_BENEFITS = new Set(["Free, Always"]);

export interface TypeGuide {
  id: AudienceId;
  label: string;
  who: string;
  website: { title: string; body: string }[];
  claude: { title: string; what: string; needs?: string; status: FeatureStatus }[];
  signupPath: string | null;
}

export function typeGuide(id: AudienceId): TypeGuide {
  const a = AUDIENCES[id];
  return {
    id,
    label: a.label,
    who: a.who,
    website: a.benefits.filter((b) => !PRICING_BENEFITS.has(b.title)).map((b) => ({ title: b.title, body: b.body })),
    claude: CLAUDE_FEATURES.filter((f) => f.types.includes(id)).map((f) => ({ title: f.title, what: f.what, needs: f.needs, status: f.status() })),
    // A client account is made by booking, not by a signup page.
    signupPath: id === "client" || a.status !== "live" ? null : membershipPath(id),
  };
}

export function featureGuide(): TypeGuide[] {
  return GUIDE_TYPES.filter((id) => AUDIENCES[id].status === "live").map(typeGuide);
}
