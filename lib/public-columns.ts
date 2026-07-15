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
  "booksy_services",
  "booksy_price_range",
  "booksy_rating",
  "booksy_review_count",
  "school_district_name",
];

export const SALON_PUBLIC_COLUMNS = [
  "id",
  "slug",
  "shop_name",
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
  "google_images",
  "site_config",
  "school_district_name",
  "nearby_areas",
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
  "city",
  "latitude",
  "longitude",
  "phone",
  "email",
  "owner_name",
  "rating",
  "total_reviews",
  "place_types",
  "hiring_need",
  "rent_type",
  "rent_rate",
  "booth_count_available",
  "specialty_desired",
  "shop_image_url",
  "google_images",
  "school_district_name",
  "claimed_at",
  "nearby_areas",
];
