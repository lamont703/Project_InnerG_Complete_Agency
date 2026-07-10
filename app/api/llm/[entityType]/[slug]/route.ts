import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  BARBER_PUBLIC_COLUMNS,
  COSMETOLOGIST_PUBLIC_COLUMNS,
  SALON_PUBLIC_COLUMNS,
  STORE_PUBLIC_COLUMNS,
  SCHOOL_PUBLIC_COLUMNS,
  COSMETOLOGY_SCHOOL_EXTRA_COLUMNS,
  EVENT_PUBLIC_COLUMNS,
  SHOP_PUBLIC_COLUMNS,
} from "@/lib/public-columns";

// Reached only via middleware's rewrite of a `.md` request (e.g.
// /barbers/{slug}.md -> /api/llm/barbers/{slug}) — a real visitor never
// requests this path directly. Returns the same facts as the entity's
// JSON-LD/HTML page, reformatted as plain Markdown for AI crawlers that
// prefer prose over structured data. Every SELECT here uses the exact same
// PUBLIC_COLUMNS allowlist as the corresponding [slug]/page.tsx (imported
// from lib/public-columns.ts, not redefined) — these are live CRM/outreach
// leads tables with private fields (owner contact history, outreach
// status, embeddings, census income data) that must never reach this
// public, unauthenticated endpoint.
export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Mirrors the same host-derivation pattern used in app/layout.tsx and
// app/robots.ts — the production host is agency.innergcomplete.com, not
// the bare innergcomplete.com apex, and this endpoint should never
// hardcode a domain that drifts from whatever the request actually came
// in on (also correctly resolves to localhost while testing).
function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get("host") || "agency.innergcomplete.com";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

function notFoundResponse() {
  return new NextResponse("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

function markdownResponse(body: string) {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

// `- **Label:** value`, or nothing if the value is missing — keeps every
// formatter below honest about what data actually exists per row instead
// of printing empty/placeholder bullets.
function bullet(label: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value) && value.length === 0) return null;
  // Placeholder sentinel some scraped fields use in place of a real null —
  // conveys no information, so it's skipped like a null would be.
  if (typeof value === "string" && value.trim().toLowerCase() === "unknown") return null;
  const rendered = typeof value === "boolean" ? (value ? "Yes" : "No") : Array.isArray(value) ? value.join(", ") : String(value);
  return `- **${label}:** ${rendered}`;
}

function section(title: string, lines: (string | null)[]): string | null {
  const present = lines.filter((l): l is string => l !== null);
  if (present.length === 0) return null;
  return `## ${title}\n${present.join("\n")}`;
}

// Booksy-style service lists are objects ({name, price, currency}), not
// strings — the generic `bullet()` array-join would otherwise print
// "[object Object]" for each entry.
function formatServiceList(services: unknown): string | null {
  if (!Array.isArray(services) || services.length === 0) return null;
  return services
    .map((s: any) => (s?.name ? `${s.name}${s.price ? ` ($${s.price}${s.currency ? ` ${s.currency}` : ""})` : ""}` : null))
    .filter(Boolean)
    .join(", ");
}

function buildDocument(title: string, canonicalUrl: string, sections: (string | null)[]): string {
  const present = sections.filter((s): s is string => s !== null);
  const header = [`# ${title}`, `Canonical profile: ${canonicalUrl}`, "> Machine-readable summary compiled from Inner G Complete's live intelligence database. For the full profile, photos, and interactive tools, see the canonical page above."].join(
    "\n"
  );
  return [header, ...present].join("\n\n");
}

async function fetchBySlugOrId(table: string, columns: string, param: string) {
  const { data: bySlug } = await supabase.from(table).select(columns).eq("slug", param).single();
  if (bySlug) return bySlug as any;
  if (!UUID_RE.test(param)) return null;
  const { data: byId } = await supabase.from(table).select(columns).eq("id", param).single();
  return (byId as any) ?? null;
}

function formatBarber(b: any, baseUrl: string): string {
  return buildDocument(b.name, `${baseUrl}/barbers/${b.slug}`, [
    section("Overview", [
      bullet("Specialty", b.specialty_type),
      bullet("Metro area", b.metro_area),
      bullet("Actively looking for a chair", b.is_actively_looking ? "Yes" : null),
      bullet("Placement pathway", b.placement_pathway),
      bullet("Desired specialties", b.desired_specialties),
    ]),
    section("Licensure & Education", [
      bullet("School", b.school_name),
      bullet("School district", b.school_district_name),
      bullet("Licensure status", b.licensure_status),
      bullet("Completed school hours", b.completed_school_hours),
    ]),
    section("Location", [bullet("Address", b.address), bullet("Coordinates", b.latitude && b.longitude ? `${b.latitude}, ${b.longitude}` : null)]),
    section("Ratings & Services (Booksy)", [
      bullet("Rating", b.booksy_rating ? `${b.booksy_rating} (${b.booksy_review_count ?? 0} reviews)` : null),
      bullet("Price range", b.booksy_price_range),
      bullet("Services", formatServiceList(b.booksy_services)),
    ]),
    section("Social & Web", [
      bullet("Website", b.website_url),
      bullet("Instagram", b.instagram_handle),
      bullet("TikTok", b.tiktok_handle),
      bullet("YouTube", b.youtube_channel),
    ]),
  ]);
}

function formatCosmetologist(c: any, baseUrl: string): string {
  return buildDocument(c.name, `${baseUrl}/cosmetologists/${c.slug}`, [
    section("Overview", [
      bullet("Specialty", c.specialty_type),
      bullet("Metro area", c.metro_area),
      bullet("Desired specialties", c.desired_specialties),
      bullet("School district", c.school_district_name),
    ]),
    section("Location", [bullet("Address", c.address), bullet("Coordinates", c.latitude && c.longitude ? `${c.latitude}, ${c.longitude}` : null)]),
    section("Ratings & Services (Booksy)", [
      bullet("Rating", c.booksy_rating ? `${c.booksy_rating} (${c.booksy_review_count ?? 0} reviews)` : null),
      bullet("Price range", c.booksy_price_range),
      bullet("Services", formatServiceList(c.booksy_services)),
    ]),
    section("Social & Web", [
      bullet("Website", c.website_url),
      bullet("Instagram", c.instagram_handle),
      bullet("TikTok", c.tiktok_handle),
      bullet("YouTube", c.youtube_channel),
    ]),
  ]);
}

function formatSalon(s: any, baseUrl: string): string {
  return buildDocument(s.shop_name, `${baseUrl}/salons/${s.slug}`, [
    section("Overview", [
      bullet("City", s.city),
      bullet("Business status", s.business_status),
      bullet("Category", Array.isArray(s.place_types) ? s.place_types.join(", ") : s.place_types),
    ]),
    section("Location & Contact", [
      bullet("Address", s.formatted_address),
      bullet("Coordinates", s.latitude && s.longitude ? `${s.latitude}, ${s.longitude}` : null),
      bullet("Phone", s.phone),
      bullet("Website", s.website),
    ]),
    section("Ratings", [bullet("Rating", s.rating ? `${s.rating} (${s.total_reviews ?? 0} reviews)` : null)]),
  ]);
}

function formatStore(s: any, storeType: "barber_supply" | "beauty_supply", baseUrl: string): string {
  const label = storeType === "beauty_supply" ? "Beauty Supply Store" : "Barber Supply Store";
  return buildDocument(s.name, `${baseUrl}/stores/${s.slug}`, [
    section("Overview", [
      bullet("Category", label),
      bullet("City", s.city),
      bullet("Business status", s.business_status),
      bullet("Price level", s.price_level),
    ]),
    section("Location & Contact", [
      bullet("Address", s.formatted_address),
      bullet("Coordinates", s.latitude && s.longitude ? `${s.latitude}, ${s.longitude}` : null),
      bullet("Phone", s.phone),
      bullet("Website", s.website),
      bullet("Hours", s.hours),
    ]),
    section("Ratings", [bullet("Rating", s.rating ? `${s.rating} (${s.total_reviews ?? 0} reviews)` : null)]),
  ]);
}

function formatSchool(s: any, category: string, baseUrl: string): string {
  return buildDocument(s.school_name, `${baseUrl}/schools/${s.slug}`, [
    section("Overview", [
      bullet("Category", category),
      bullet("City", s.city),
      bullet("Accreditation status", s.accreditation_status),
      bullet("Accreditor", s.accreditor_name),
      bullet("Student body size", s.student_body_size),
    ]),
    section("Location & Contact", [
      bullet("Address", s.formatted_address),
      bullet("Coordinates", s.latitude && s.longitude ? `${s.latitude}, ${s.longitude}` : null),
      bullet("Phone", s.phone),
      bullet("Website", s.website),
    ]),
    section("Cost & Financial Aid", [
      bullet("Annual tuition", s.annual_tuition ? `$${s.annual_tuition}` : null),
      bullet("Pell Grant participation rate", s.pell_grant_rate),
      bullet("Federal loan participation rate", s.federal_loan_rate),
      bullet("Median student debt", s.median_student_debt ? `$${s.median_student_debt}` : null),
      bullet("Completion rate", s.completion_rate),
      bullet("Median earnings post-completion", s.median_earnings ? `$${s.median_earnings}` : null),
      bullet("Loan default rate", s.default_rate),
    ]),
    section("2026 TDLR Exam Pass Rates", [
      bullet("Barber written pass rate", s.written_pass_rate_2026 != null ? `${Math.round(s.written_pass_rate_2026 * 100)}% (${s.written_test_takers_2026 ?? 0} test takers)` : null),
      bullet("Barber practical pass rate", s.practical_pass_rate_2026 != null ? `${Math.round(s.practical_pass_rate_2026 * 100)}% (${s.practical_test_takers_2026 ?? 0} test takers)` : null),
      bullet(
        "Cosmetology written pass rate",
        s.cosmetology_written_pass_rate_2026 != null
          ? `${Math.round(s.cosmetology_written_pass_rate_2026 * 100)}% (${s.cosmetology_written_test_takers_2026 ?? 0} test takers)`
          : null
      ),
      bullet(
        "Cosmetology practical pass rate",
        s.cosmetology_practical_pass_rate_2026 != null
          ? `${Math.round(s.cosmetology_practical_pass_rate_2026 * 100)}% (${s.cosmetology_practical_test_takers_2026 ?? 0} test takers)`
          : null
      ),
      bullet("State board pass rate (self-reported)", s.state_pass_rate),
    ]),
    section("Ratings", [bullet("Google rating", s.rating ? `${s.rating} (${s.google_review_count ?? 0} reviews)` : null)]),
  ]);
}

function formatEvent(e: any, isPast: boolean, baseUrl: string): string {
  return buildDocument(e.title, `${baseUrl}/events/${e.slug}`, [
    section("Overview", [
      bullet("Status", isPast ? "Past event" : "Upcoming"),
      bullet("Category", e.category),
      bullet("Date", e.end_date && e.end_date !== e.event_date ? `${e.event_date} – ${e.end_date}` : e.event_date),
      bullet("Time", e.start_time ? `${e.start_time}${e.end_time ? ` – ${e.end_time}` : ""}` : null),
      bullet("Organizer", e.organizer_name),
    ]),
    section("Venue", [
      bullet("Venue", e.venue_name),
      bullet("Address", e.address),
      bullet("City", e.city),
      bullet("Coordinates", e.latitude && e.longitude ? `${e.latitude}, ${e.longitude}` : null),
    ]),
    section("Tickets", [bullet("Ticket URL", e.ticket_url), bullet("Price", e.price_info)]),
    section("Description", [e.description ? e.description : null]),
    section("Data", [bullet("First indexed", e.created_at ? String(e.created_at).slice(0, 10) : null)]),
  ]);
}

function formatShop(s: any, baseUrl: string): string {
  return buildDocument(s.shop_name, `${baseUrl}/shop/${s.slug}`, [
    section("Overview", [
      bullet("City", s.city),
      bullet("Owner", s.owner_name && s.owner_name !== "Unknown Owner" ? s.owner_name : "Unclaimed"),
      bullet("Category", Array.isArray(s.place_types) ? s.place_types.join(", ") : s.place_types),
    ]),
    section("Hiring & Booth Rent", [
      bullet("Hiring", s.hiring_need),
      bullet("Rent type", s.rent_type),
      bullet("Weekly rent", s.rent_rate ? `$${s.rent_rate}/week` : null),
      bullet("Chairs available", s.booth_count_available),
      bullet("Specialty desired", s.specialty_desired),
    ]),
    section("Location & Contact", [
      bullet("Address", s.formatted_address),
      bullet("Coordinates", s.latitude && s.longitude ? `${s.latitude}, ${s.longitude}` : null),
      bullet("Phone", s.phone),
      bullet("Email", s.email),
    ]),
    section("Ratings", [bullet("Rating", s.rating ? `${s.rating} (${s.total_reviews ?? 0} reviews)` : null)]),
  ]);
}

export async function GET(request: NextRequest, props: { params: Promise<{ entityType: string; slug: string }> }) {
  const { entityType, slug } = await props.params;
  const baseUrl = getBaseUrl(request);

  switch (entityType) {
    case "barbers": {
      const row = await fetchBySlugOrId("agent_barber_leads", BARBER_PUBLIC_COLUMNS.join(", "), slug);
      if (!row) return notFoundResponse();
      return markdownResponse(formatBarber(row, baseUrl));
    }
    case "cosmetologists": {
      const row = await fetchBySlugOrId("agent_cosmetologist_leads", COSMETOLOGIST_PUBLIC_COLUMNS.join(", "), slug);
      if (!row) return notFoundResponse();
      return markdownResponse(formatCosmetologist(row, baseUrl));
    }
    case "salons": {
      const row = await fetchBySlugOrId("agent_salon_leads", SALON_PUBLIC_COLUMNS.join(", "), slug);
      if (!row) return notFoundResponse();
      return markdownResponse(formatSalon(row, baseUrl));
    }
    case "stores": {
      const barberRow = await fetchBySlugOrId("agent_barber_supply_store_leads", STORE_PUBLIC_COLUMNS.join(", "), slug);
      if (barberRow) return markdownResponse(formatStore(barberRow, "barber_supply", baseUrl));
      const beautyRow = await fetchBySlugOrId("agent_beauty_supply_store_leads", STORE_PUBLIC_COLUMNS.join(", "), slug);
      if (beautyRow) return markdownResponse(formatStore(beautyRow, "beauty_supply", baseUrl));
      return notFoundResponse();
    }
    case "schools": {
      const barberRow = await fetchBySlugOrId("agent_barber_school_leads", SCHOOL_PUBLIC_COLUMNS.join(", "), slug);
      if (barberRow) return markdownResponse(formatSchool(barberRow, "Barber School", baseUrl));
      const cosmetColumns = [...SCHOOL_PUBLIC_COLUMNS, ...COSMETOLOGY_SCHOOL_EXTRA_COLUMNS].join(", ");
      const cosmetRow = await fetchBySlugOrId("agent_cosmetology_school_leads", cosmetColumns, slug);
      if (cosmetRow) return markdownResponse(formatSchool(cosmetRow, cosmetRow.license_type || "Cosmetology School", baseUrl));
      return notFoundResponse();
    }
    case "events": {
      const row = await fetchBySlugOrId("events", EVENT_PUBLIC_COLUMNS.join(", "), slug);
      if (!row) return notFoundResponse();
      const isPast = row.event_date < new Date().toISOString().slice(0, 10);
      return markdownResponse(formatEvent(row, isPast, baseUrl));
    }
    case "shop": {
      const row = await fetchBySlugOrId("agent_barbershop_leads", SHOP_PUBLIC_COLUMNS.join(", "), slug);
      if (!row) return notFoundResponse();
      return markdownResponse(formatShop(row, baseUrl));
    }
    default:
      return notFoundResponse();
  }
}
