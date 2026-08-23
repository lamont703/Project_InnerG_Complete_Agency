// Single source of truth for which columns are safe to expose publicly per
// entity table. Every one of these tables is a live CRM/outreach leads
// table (owner_name, phone, email, contact_id, last_conversation_history,
// conversation_turns, outreach_status, census income data, embeddings,
// etc. all live alongside the public-facing fields) — this file is the one
// place each entity's public/private boundary is defined, imported by both
// the [slug]/page.tsx routes and the /api/llm/[entityType]/[slug] Markdown
// route, so the two can never silently drift out of sync.

export const BARBER_PUBLIC_COLUMNS = [
  "id",
  "slug",
  "name",
  "address",
  "latitude",
  "longitude",
  "specialty_type",
  "metro_area",
  "status",
  "is_actively_looking",
  "school_name",
  "licensure_status",
  // Read by isProIndexable (lib/indexable.ts) to decide whether this profile
  // may be indexed. A boolean flag only — passport_number stays private.
  "passport_submitted",
  "completed_school_hours",
  "instagram_handle",
  "tiktok_handle",
  "youtube_channel",
  "website_url",
  "placement_pathway",
  "desired_specialties",
  "profile_url",
  "passport_image_url",
  "booksy_photo_url",
  "booksy_cover_photo_url",
  "booksy_gallery_urls",
  "portfolio_images",
  "booksy_services",
  "booksy_price_range",
  "booksy_rating",
  "booksy_review_count",
  "booksy_hours",
  "school_district_name",
];

export const COSMETOLOGIST_PUBLIC_COLUMNS = [
  "id",
  "slug",
  "name",
  "address",
  "latitude",
  "longitude",
  "specialty_type",
  "metro_area",
  "instagram_handle",
  "tiktok_handle",
  "youtube_channel",
  "website_url",
  "desired_specialties",
  "profile_url",
  "booksy_photo_url",
  "booksy_cover_photo_url",
  "booksy_gallery_urls",
  "portfolio_images",
  // Both read by isProIndexable (lib/indexable.ts). licensure_status is already
  // public on barbers; passport_submitted is a boolean flag and NOT the number.
  "licensure_status",
  "passport_submitted",
  "booksy_services",
  "booksy_price_range",
  "booksy_rating",
  "booksy_review_count",
  "school_district_name",
];

// Mirrors SHOP_PUBLIC_COLUMNS' field set (the underlying agent_salon_leads
// table already has these columns — same schema as agent_barbershop_leads,
// see supabase/migrations/20260704120000_create_agent_salon_leads.sql —
// they're just mostly NULL for salons until a future backfill populates
// them). Selecting them now means the salon profile page's booth-rent/
// hiring UI (shared with shop pages) lights up automatically once that
// data lands, with no further code changes needed.
export const SALON_PUBLIC_COLUMNS = [
  "id",
  "slug",
  "shop_name",
  "formatted_address",
  "street_address",
  "address_city",
  "address_state",
  "address_zip",
  "city",
  "phone",
  "email",
  "owner_name",
  "owner_first_name",
  "owner_last_name",
  "website",
  "latitude",
  "longitude",
  "rating",
  "total_reviews",
  "place_types",
  "business_status",
  "hiring_need",
  "rent_type",
  "rent_rate",
  "booth_count_available",
  "specialty_desired",
  "ai_culture_summary",
  "custom_amenities",
  "shop_image_url",
  "google_images",
  "site_config",
  "school_district_name",
  "claimed_at",
  "nearby_areas",
  // Google Place ID. Public by construction — it is the identifier in every
  // Google Maps share URL — and it is the anchor that lets an outside index
  // reconcile this row with its own record for the same business, which is why
  // it is published in the entity graph as a typed `identifier`.
  "place_id",
  // The Google Maps business category, shown on the Maps listing itself and so
  // public by the same reasoning as place_id. Needed because it is what picks
  // the Book Appointment service list: this table holds 11 nail salons, 7 spas
  // and 4 med spas alongside the hair salons, and lib/booking-services.ts keys
  // off the category precisely so a nail salon is not offered a beard trim.
  "google_category",
];

export const STORE_PUBLIC_COLUMNS = [
  "id",
  "slug",
  "name",
  "formatted_address",
  "city",
  "phone",
  "website",
  "latitude",
  "longitude",
  "rating",
  "total_reviews",
  "place_types",
  "business_status",
  "price_level",
  "google_images",
  "hours",
  // Google Place ID. Public by construction — it is the identifier in every
  // Google Maps share URL — and it is the anchor that lets an outside index
  // reconcile this row with its own record for the same business, which is why
  // it is published in the entity graph as a typed `identifier`.
  "place_id",
];

export const SCHOOL_PUBLIC_COLUMNS = [
  "id",
  "slug",
  "school_name",
  "city",
  "formatted_address",
  "latitude",
  "longitude",
  "phone",
  "website",
  "rating",
  "google_review_count",
  "google_photos",
  "google_hours",
  "google_business_status",
  "accreditation_status",
  "accreditor_name",
  "student_body_size",
  "annual_tuition",
  "completion_rate",
  "median_earnings",
  "default_rate",
  "pell_grant_rate",
  "federal_loan_rate",
  "median_student_debt",
  "state_pass_rate",
  "written_pass_rate_2026",
  "written_test_takers_2026",
  "practical_pass_rate_2026",
  "practical_test_takers_2026",
  "cosmetology_written_pass_rate_2026",
  "cosmetology_written_test_takers_2026",
  "cosmetology_practical_pass_rate_2026",
  "cosmetology_practical_test_takers_2026",
  // Google Place ID. Public by construction — it is the identifier in every
  // Google Maps share URL — and it is the anchor that lets an outside index
  // reconcile this row with its own record for the same business, which is why
  // it is published in the entity graph as a typed `identifier`.
  "place_id",
  // TDLR licence facts. Public record, and the strongest identifier a school
  // has: it survives a rename and a relocation, neither of which the name or
  // the address does. NULL on every barber-school row on purpose — see
  // migration 20260804140000, which excludes those because all 132 Barber
  // School licences are expired and would fail the moment anyone checked one.
  "license_number",
  "license_state",
];

// agent_cosmetology_school_leads carries one extra column (license_type,
// used to label e.g. "Esthetics School" vs generic "Cosmetology School")
// that agent_barber_school_leads doesn't have — kept separate rather than
// added to the base list so a barber-school select doesn't request a
// column that table doesn't have.
export const COSMETOLOGY_SCHOOL_EXTRA_COLUMNS = ["license_type"];

export const EVENT_PUBLIC_COLUMNS = [
  "id",
  "slug",
  "title",
  "description",
  "event_date",
  "end_date",
  "start_time",
  "end_time",
  "venue_name",
  "address",
  "city",
  "latitude",
  "longitude",
  "category",
  "organizer_name",
  "ticket_url",
  "source_url",
  "image_url",
  "price_info",
  "created_at",
];

// agent_barbershop_leads has no PUBLIC_COLUMNS allowlist on its page today
// (that page fetches select=* via a raw PostgREST call and relies on only
// rendering safe fields in JSX) — this list is exactly the set of shop.*
// fields the shop page actually renders today, so the .md endpoint exposes
// nothing beyond what's already public on the live page. owner_name/phone/
// email are intentionally included: unlike the individual-professional
// leads tables, the shop page treats these as the business's own public
// contact info (Call Shop / Email Shop CTAs), not private lead data.
export const SHOP_PUBLIC_COLUMNS = [
  "id",
  "slug",
  "shop_name",
  "formatted_address",
  "street_address",
  "address_city",
  "address_state",
  "address_zip",
  "city",
  "latitude",
  "longitude",
  "phone",
  "email",
  "website",
  "owner_name",
  "owner_first_name",
  "owner_last_name",
  "rating",
  "total_reviews",
  "place_types",
  "hiring_need",
  "rent_type",
  "rent_rate",
  "booth_count_available",
  "specialty_desired",
  "ai_culture_summary",
  "custom_amenities",
  "shop_image_url",
  "google_images",
  "school_district_name",
  "claimed_at",
  "nearby_areas",
  // Google Place ID — see the note on SALON_PUBLIC_COLUMNS. Added here too so
  // the .md endpoint carries the same reconciliation anchor the HTML page's
  // JSON-LD now publishes; the two surfaces describing the same shop
  // differently is the drift this file exists to prevent.
  "place_id",
];
