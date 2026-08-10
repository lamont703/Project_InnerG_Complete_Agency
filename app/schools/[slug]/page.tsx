import { createClient } from "@supabase/supabase-js";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import {
  cityNode, entityId, faqId, faqNode, graphJson, identifiers, pageId, ref,
  regulatorFor, topics, webPageNode,
} from "@/lib/schema-graph";
import { buildEntityBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import Link from "next/link";
import {
  MapPin,
  Star,
  CheckCircle2,
  GraduationCap,
  Globe,
  Phone,
  Clock,
  Navigation,
  DollarSign,
  TrendingUp,
  Award,
  Users,
  BookOpen,
  Scissors,
  Store,
} from "lucide-react";
import { BackToSearchLink } from "@/components/shared/back-to-search-link";
import { DynamicBackButton } from "@/components/shared/dynamic-back-button";
import { Navbar } from "@/components/layout/navbar";
import Image from "next/image";
import { EntityPhotoGallery } from "@/components/shared/entity-photo-gallery";
import { NearbyEntitiesSection } from "@/components/shared/nearby-entities-section";
import { fetchNearbyEntities } from "@/lib/nearby-entities";
import { deriveExamState, examPrepInfo } from "@/lib/exam-prep";
import { SCHOOL_PUBLIC_COLUMNS } from "@/lib/public-columns";
import { SearchVisibilityCard } from "@/components/shared/search-visibility-card";
import { ClaimShopButton } from "@/components/shared/claim-shop-button";
import { isEntityClaimed } from "@/lib/entity-claim";
import { ReviewsSection } from "@/components/shared/reviews-section";
import { GoogleReviews } from "@/components/shared/google-reviews";
import { GooglePosts } from "@/components/shared/google-posts";
import { WriteReviewButton } from "@/components/shared/write-review-button";
import { getApprovedReviews, computeReviewStats } from "@/lib/reviews";
import { composeDescription, ratingClause, streetClause, percentClause } from "@/lib/seo-description";
import { PassRateAlert } from "@/components/schools/pass-rate-alert";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const PUBLIC_COLUMNS = SCHOOL_PUBLIC_COLUMNS.join(", ");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Known-dead slugs whose underlying row was hard-deleted as part of a real
// duplicate-row cleanup (the same real business survives under a
// different slug/city label) — confirmed live case:
// /schools/colour-beauty-school-katy-b752a038 404'd because that row was
// removed as a duplicate of the same school already published as
// colour-beauty-school-houston-bd9ab3b1 (same phone, same real single
// Clay Rd location, just entered under two different city labels). Add an
// entry here whenever a live URL is confirmed dead for this same reason,
// so the old link 301s to the real survivor instead of 404ing.
const DEAD_SLUG_REDIRECTS: Record<string, string> = {
  "colour-beauty-school-katy-b752a038": "colour-beauty-school-houston-bd9ab3b1",
};

// Barber schools and cosmetology schools live in separate tables (agent_barber_school_leads /
// agent_cosmetology_school_leads); the unified search Schools tab returns ids from either, so
// this route checks both. UUIDs are generated independently per table and won't collide.
//
// Lookup is slug-primary with a legacy-UUID fallback: old /schools/{uuid} links (from
// before the slug migration) still resolve, tagged with _resolvedByLegacyId so the page
// component can 308-redirect to the canonical slug URL instead of silently dual-serving it.
// A known-dead-slug fallback (DEAD_SLUG_REDIRECTS above) uses the same flag/redirect path.
async function getSchool(param: string): Promise<any> {
  const { data: barberBySlug, error: barberSlugErr } = await supabase
    .from("agent_barber_school_leads")
    .select(PUBLIC_COLUMNS)
    .eq("slug", param)
    .single();
  if (!barberSlugErr && barberBySlug) return { ...(barberBySlug as any), school_category: "Barber School", _matchType: "barber" as const };

  const { data: cosmetBySlug, error: cosmetSlugErr } = await supabase
    .from("agent_cosmetology_school_leads")
    .select(`${PUBLIC_COLUMNS}, license_type`)
    .eq("slug", param)
    .single();
  if (!cosmetSlugErr && cosmetBySlug) {
    const cosmet = cosmetBySlug as any;
    return { ...cosmet, school_category: cosmet.license_type || "Cosmetology School", _matchType: "cosmetology" as const };
  }

  if (UUID_RE.test(param)) {
    const { data: barberById, error: barberIdErr } = await supabase
      .from("agent_barber_school_leads")
      .select(PUBLIC_COLUMNS)
      .eq("id", param)
      .single();
    if (!barberIdErr && barberById) return { ...(barberById as any), school_category: "Barber School", _matchType: "barber" as const, _resolvedByLegacyId: true };

    const { data: cosmetById, error: cosmetIdErr } = await supabase
      .from("agent_cosmetology_school_leads")
      .select(`${PUBLIC_COLUMNS}, license_type`)
      .eq("id", param)
      .single();
    if (!cosmetIdErr && cosmetById) {
      const cosmet = cosmetById as any;
      return { ...cosmet, school_category: cosmet.license_type || "Cosmetology School", _matchType: "cosmetology" as const, _resolvedByLegacyId: true };
    }
    return null;
  }

  const redirectSlug = DEAD_SLUG_REDIRECTS[param];
  if (!redirectSlug) return null;
  const target = await getSchool(redirectSlug);
  return target ? { ...target, _resolvedByLegacyId: true } : null;
}

// Searchers use "cosmetology school," "beauty school," and "hair school"
// interchangeably (confirmed via autocomplete: "beauty schools in houston",
// "hair schools in houston" both surface for a "cosmetology schools" seed
// query) — cosmetology listings should carry all three terms in their
// title/description so they match regardless of which word someone typed.
function synonymSuffix(matchType: "barber" | "cosmetology") {
  return matchType === "cosmetology" ? " (Beauty & Hair School)" : "";
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const school = await getSchool(slug);
  if (!school) return { title: "School Not Found" };

  const title = `${school.school_name}${synonymSuffix(school._matchType)}${school.city ? ` — ${school.school_category} in ${school.city}` : ""}`;
  // This description previously opened with the CATEGORY, not the school — so
  // every cosmetology school in a city shared the identical string. Non-unique
  // is the real defect; the length Bing complained about was a symptom.
  //
  // 2026 exam outcomes lead where we have them. They're the one fact here no
  // competitor's snippet can carry, and they're already the basis of
  // /compare-schools — the legacy state_pass_rate is kept only as a fallback.
  const cosmet = school._matchType === "cosmetology";
  const writtenRate = cosmet ? school.cosmetology_written_pass_rate_2026 : school.written_pass_rate_2026;
  const writtenTakers = cosmet ? school.cosmetology_written_test_takers_2026 : school.written_test_takers_2026;
  const practicalRate = cosmet ? school.cosmetology_practical_pass_rate_2026 : school.practical_pass_rate_2026;

  const description = composeDescription([
    `${school.school_name} — ${school.school_category}${cosmet ? " (beauty & hair school)" : ""}${school.city ? ` in ${school.city}` : ""}`,
    percentClause(writtenRate, "2026 written exam pass rate", writtenTakers),
    percentClause(practicalRate, "practical"),
    !writtenRate && school.state_pass_rate ? `State board pass rate ${school.state_pass_rate}` : null,
    school.accreditation_status === "Accredited"
      ? `Accredited${school.accreditor_name ? ` by ${school.accreditor_name}` : ""}`
      : null,
    school.annual_tuition ? `Tuition ~$${Number(school.annual_tuition).toLocaleString()}/yr` : null,
    school.pell_grant_rate != null ? `${Math.round(Number(school.pell_grant_rate) * 100)}% receive financial aid` : null,
    ratingClause(school.rating, school.google_review_count),
    streetClause(school.formatted_address, school.city),
  ]);
  const heroImage = Array.isArray(school.google_photos) ? school.google_photos[0] : null;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/schools/${slug}` },
    openGraph: {
      title,
      description,
      images: heroImage ? [heroImage] : undefined,
    },
  };
}

// Builds schema.org JSON-LD for the school (EducationalOrganization) and an
// FAQPage covering exactly the questions autocomplete data shows people ask
// at this decision point — financial aid, cost, pass rate, accreditation.
// Two audiences benefit from the same markup: search engines get eligible
// for rich results, and LLM/AI-answer crawlers (which increasingly read
// JSON-LD directly rather than parsing rendered UI) get clean, unambiguous
// facts instead of having to infer numbers from a stat-card grid.
// Every FAQ entry is conditional on real data being present — no entry is
// ever emitted with a guessed or placeholder answer.
function buildSchoolJsonLd(school: any, websiteHref: string | null) {
  const examState = deriveExamState(school.formatted_address);
  const stateName = examState === "CA" ? "California" : "Texas";
  const address = school.formatted_address
    ? { "@type": "PostalAddress", streetAddress: school.formatted_address, addressRegion: examState, addressCountry: "US" }
    : undefined;

  const path = `/schools/${school.slug}`;
  const org: Record<string, any> = {
    "@type": "EducationalOrganization",
    "@id": entityId(path),
    mainEntityOfPage: ref(pageId(path)),
    name: school.school_name,
    description: `${school.school_category}${school._matchType === "cosmetology" ? " / beauty school / hair school" : ""}${
      school.city ? ` in ${school.city}, ${stateName}` : ""
    }`,
  };
  if (address) org.address = address;
  if (websiteHref) org.url = websiteHref;
  if (school.phone) org.telephone = school.phone;
  if (school.latitude && school.longitude) org.geo = { "@type": "GeoCoordinates", latitude: school.latitude, longitude: school.longitude };
  const heroImg = Array.isArray(school.google_photos) ? school.google_photos[0] : null;
  if (heroImg) org.image = heroImg;
  if (school.rating && school.google_review_count) {
    org.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(school.rating),
      reviewCount: Number(school.google_review_count),
      bestRating: 5,
      worstRating: 1,
    };
  }

  const additionalProperty: { "@type": "PropertyValue"; name: string; value: string | number }[] = [];
  if (school.annual_tuition != null) additionalProperty.push({ "@type": "PropertyValue", name: "Annual Tuition (USD)", value: Number(school.annual_tuition) });
  if (school.pell_grant_rate != null) additionalProperty.push({ "@type": "PropertyValue", name: "Pell Grant Recipient Rate", value: `${Math.round(school.pell_grant_rate * 100)}%` });
  if (school.federal_loan_rate != null) additionalProperty.push({ "@type": "PropertyValue", name: "Federal Loan Rate", value: `${Math.round(school.federal_loan_rate * 100)}%` });
  if (school.completion_rate != null) additionalProperty.push({ "@type": "PropertyValue", name: "Completion Rate", value: `${Math.round(school.completion_rate * 100)}%` });
  if (school.written_pass_rate_2026 != null) additionalProperty.push({ "@type": "PropertyValue", name: "2026 Written Exam Pass Rate", value: `${Math.round(school.written_pass_rate_2026 * 100)}%` });
  if (school.practical_pass_rate_2026 != null) additionalProperty.push({ "@type": "PropertyValue", name: "2026 Practical Exam Pass Rate", value: `${Math.round(school.practical_pass_rate_2026 * 100)}%` });
  if (additionalProperty.length > 0) org.additionalProperty = additionalProperty;

  /**
   * The identifiers, and why a school gets two where a shop gets one.
   *
   * The TDLR licence number is the strongest handle a school has: it survives a
   * rename and a relocation, neither of which the name or the address does. It
   * is NULL on every barber-school row by design — migration 20260804140000
   * excludes those because all 132 Barber School licences are expired and would
   * fail the moment anyone checked one — and `identifiers()` drops what is
   * absent, so those rows simply carry the Place ID alone.
   */
  const ids = identifiers({
    licenseNumber: school.license_number,
    licenseAuthority: "TDLR",
    googlePlaceId: school.place_id,
  });
  if (ids) org.identifier = ids;

  const place = cityNode(school.city, examState);
  if (place) org.containedInPlace = place;

  /**
   * Accreditation as an edge rather than a sentence.
   *
   * `accreditor_name` has been rendered as prose on these pages all along. As
   * an `accreditationStatus` + named organization it becomes answerable: "which
   * schools does NACCAS accredit" is a graph query, not a text search.
   */
  if (school.accreditation_status) {
    org.accreditationStatus = school.accreditation_status;
    if (school.accreditor_name) {
      org.accreditedBy = { "@type": "Organization", name: school.accreditor_name };
    }
  }

  /**
   * What the school actually teaches, as its own nodes tied to the credential
   * each programme leads to. This is the edge a prospective student's question
   * runs along — "which schools near me run a barber program" — and it
   * previously existed only inside the free-text school_category string.
   *
   * TOP-LEVEL NODES, joined to the school by `provider`, rather than nested
   * under a property of the school. schema.org gives EducationalOccupationalProgram
   * a documented `provider`; it does not give EducationalOrganization a
   * documented inverse, and inventing one would produce markup that validates
   * as JSON and means nothing.
   *
   * Emitted only where the pass-rate columns prove the programme is real: a row
   * with cosmetology test-takers ran a cosmetology programme. Inferring from
   * the school's name would put programmes on schools that do not offer them.
   */
  const programs: Record<string, any>[] = [];
  const addProgram = (key: string, name: string, credential: string) => {
    programs.push({
      "@type": "EducationalOccupationalProgram",
      "@id": `${SITE_URL}${path}#${key}-program`,
      name,
      programType: "Vocational",
      provider: ref(entityId(path)),
      occupationalCredentialAwarded: credential,
      educationalCredentialAwarded: credential,
    });
  };
  if (school.written_test_takers_2026 || school.practical_test_takers_2026) {
    addProgram("barber", "Barber program", `${stateName} barber license`);
  }
  if (school.cosmetology_written_test_takers_2026 || school.cosmetology_practical_test_takers_2026) {
    addProgram("cosmetology", "Cosmetology program", `${stateName} cosmetology operator license`);
  }

  org.knowsAbout = topics("barbering", "cosmetology");
  org.audience = { "@type": "EducationalAudience", educationalRole: "student" };

  const faqEntries: { q: string; a: string }[] = [];
  if (school.pell_grant_rate != null || school.federal_loan_rate != null) {
    faqEntries.push({
      q: `Does ${school.school_name} accept financial aid?`,
      a: [
        school.pell_grant_rate != null ? `${Math.round(school.pell_grant_rate * 100)}% of students receive Pell Grants.` : null,
        school.federal_loan_rate != null ? `${Math.round(school.federal_loan_rate * 100)}% of students take federal student loans.` : null,
      ]
        .filter(Boolean)
        .join(" "),
    });
  }
  if (school.annual_tuition != null) {
    faqEntries.push({
      q: `How much does ${school.school_name} cost?`,
      a: `Annual tuition is approximately $${Number(school.annual_tuition).toLocaleString()}${
        school.median_student_debt != null ? `, with a median student debt of $${Number(school.median_student_debt).toLocaleString()} among borrowers who complete the program.` : "."
      }`,
    });
  }
  if (school.written_pass_rate_2026 != null || school.state_pass_rate) {
    const rate = school.written_pass_rate_2026 != null ? `${Math.round(school.written_pass_rate_2026 * 100)}%` : school.state_pass_rate;
    faqEntries.push({
      q: `What is the exam pass rate at ${school.school_name}?`,
      a: `${rate} of students who tested in 2026 passed their licensing exam${school.written_test_takers_2026 ? ` (based on ${school.written_test_takers_2026} test-takers)` : ""}, per Texas Department of Licensing & Regulation records.`,
    });
  }
  if (school.accreditation_status) {
    faqEntries.push({
      q: `Is ${school.school_name} accredited?`,
      a: `${school.school_name} is ${school.accreditation_status.toLowerCase()}${school.accreditor_name ? ` by ${school.accreditor_name}` : ""}.`,
    });
  }

  const faqPage = faqNode(path, faqEntries, entityId(path));
  if (faqPage) org.subjectOf = ref(faqId(path));

  return { org, faqPage, programs, path, examState };
}

function formatPercent(val: number | null) {
  if (val === null || val === undefined) return null;
  return `${Math.round(val * 100)}%`;
}

function formatCurrency(val: number | null) {
  if (val === null || val === undefined) return null;
  return `$${Number(val).toLocaleString()}`;
}

const TODAY_INDEX = (new Date().getDay() + 6) % 7; // 0 = Monday, matches Google's weekdayDescriptions order

export default async function SchoolProfilePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const school = await getSchool(slug);

  if (!school) notFound();
  if (school._resolvedByLegacyId) permanentRedirect(`/schools/${school.slug}`);

  const claimEntityType = school._matchType === "cosmetology" ? "cosmetology_school" : "barber_school";
  const isClaimed = await isEntityClaimed(claimEntityType, school.id);

  const gallery: string[] = Array.isArray(school.google_photos) ? school.google_photos : [];
  const heroPhoto = gallery[0] || null;
  const thumbnails = gallery.slice(1, 5);

  const isAccredited = school.accreditation_status === "Accredited";
  const isStateLicensed = school.accreditation_status === "State Licensed";
  const hours: string[] = Array.isArray(school.google_hours) ? school.google_hours : [];
  const isClosed = school.google_business_status === "CLOSED_PERMANENTLY";

  const directionsHref =
    school.latitude && school.longitude
      ? `https://www.google.com/maps?q=${school.latitude},${school.longitude}`
      : school.formatted_address
      ? `https://www.google.com/maps?q=${encodeURIComponent(school.formatted_address)}`
      : null;

  const schoolCenter =
    school.latitude && school.longitude ? { lat: Number(school.latitude), lng: Number(school.longitude) } : null;
  const [nearbyShops, nearbySupplyStores] = schoolCenter
    ? await Promise.all([
        fetchNearbyEntities(supabase, "shops", schoolCenter, { limit: 5 }),
        fetchNearbyEntities(supabase, "barberSupplyStores", schoolCenter, { limit: 5 }),
      ])
    : [[], []];

  const websiteHref = school.website
    ? school.website.startsWith("http")
      ? school.website
      : `https://${school.website}`
    : null;

  const { org: schoolJsonLd, faqPage: faqJsonLd, programs: schoolPrograms, path: schoolPath, examState: schoolExamState } = buildSchoolJsonLd(school, websiteHref);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: searchPerfRows } = await supabase.rpc('get_search_performance_by_entity', {
    p_entity_id: school.id,
    p_result_type: 'school',
    p_cutoff: thirtyDaysAgo,
  });
  const searchPerformance = (searchPerfRows && searchPerfRows[0]) || null;

  // Reviews use the "school" entity type, which the /api/reviews route maps
  // across both the barber- and cosmetology-school tables — same shape and
  // placement as the shop/salon pages.
  const reviews = await getApprovedReviews("school", school.id);
  const { averageRating } = computeReviewStats(reviews);

  // A dual-licensed school can have real 2026 pass-rate data for both exams
  // — when both are present, prefix each label with the exam name so they
  // aren't mistaken for the same number.
  const hasBothExamTypes =
    (school.written_pass_rate_2026 != null || school.practical_pass_rate_2026 != null) &&
    (school.cosmetology_written_pass_rate_2026 != null || school.cosmetology_practical_pass_rate_2026 != null);
  const barberPrefix = hasBothExamTypes ? "Barber " : "";
  const cosmetPrefix = hasBothExamTypes ? "Cosmetology " : "";

  const stats = [
    school.annual_tuition != null && {
      label: "Annual Tuition",
      value: formatCurrency(school.annual_tuition),
      Icon: DollarSign,
    },
    school.completion_rate != null && {
      label: "Completion Rate",
      value: formatPercent(school.completion_rate),
      Icon: TrendingUp,
    },
    school.median_earnings != null && {
      label: "1-Yr Median Earnings",
      value: formatCurrency(school.median_earnings),
      Icon: DollarSign,
    },
    school.student_body_size != null && {
      label: "Student Body Size",
      value: String(school.student_body_size),
      Icon: Users,
    },
  ].filter(Boolean) as { label: string; value: string; Icon: any }[];

  // 2026 licensing exam results — sourced directly from the precomputed
  // *_pass_rate_2026 / *_test_takers_2026 columns on the school row, which
  // are the exact ever-passed rate (distinct students who passed ÷ distinct
  // students tested) computed from the raw TDLR exam records. Confirmed
  // against the raw agent_barber_student_leads records that these columns
  // match the underlying data exactly. Just the two numbers the user needs:
  // the pass rate and how many students it's based on. barberPrefix/
  // cosmetPrefix disambiguate a dual-licensed school's two exam programs.
  const examResults = [
    school.written_pass_rate_2026 != null && {
      label: `${barberPrefix}Written`,
      value: formatPercent(school.written_pass_rate_2026),
      students: school.written_test_takers_2026 ?? null,
    },
    school.practical_pass_rate_2026 != null && {
      label: `${barberPrefix}Practical`,
      value: formatPercent(school.practical_pass_rate_2026),
      students: school.practical_test_takers_2026 ?? null,
    },
    school.cosmetology_written_pass_rate_2026 != null && {
      label: `${cosmetPrefix}Written`,
      value: formatPercent(school.cosmetology_written_pass_rate_2026),
      students: school.cosmetology_written_test_takers_2026 ?? null,
    },
    school.cosmetology_practical_pass_rate_2026 != null && {
      label: `${cosmetPrefix}Practical`,
      value: formatPercent(school.cosmetology_practical_pass_rate_2026),
      students: school.cosmetology_practical_test_takers_2026 ?? null,
    },
  ].filter(Boolean) as { label: string; value: string; students: number | null }[];

  return (
    <div className="min-h-screen light bg-slate-50">
      {/* Structured data: EducationalOrganization facts + FAQPage, read by
          both search engines (rich results) and LLM/AI-answer crawlers
          (direct fact extraction) — every value here also renders visibly
          in the page below, this just makes it machine-parseable too. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: graphJson(
            webPageNode({
              path: schoolPath,
              type: "ProfilePage",
              name: school.school_name,
              primaryEntityId: entityId(schoolPath),
              breadcrumb: true,
              about: topics("barbering", "cosmetology"),
            }),
            buildEntityBreadcrumbJsonLd("Schools", "/schools", school.school_name, school.slug),
            schoolJsonLd,
            faqJsonLd,
            regulatorFor(schoolExamState),
            ...schoolPrograms,
          ),
        }}
      />
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-6">
        <DynamicBackButton fallbackHref="/tools/barbershop-search" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Photo Gallery */}
            <EntityPhotoGallery
              heroPhoto={heroPhoto}
              thumbnails={thumbnails}
              name={school.school_name}
              gridCols={4}
              accentFrom="from-indigo-600"
              fallbackIcon="school"
            />

            {/* Header Block */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5">
                  {school.school_category}
                </span>
                {school._matchType === "cosmetology" && (
                  <span className="text-xs font-medium text-slate-400">also called a beauty school or hair school</span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{school.school_name}</h1>
              {isClaimed ? (
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-lg font-bold text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                  </span>
                </div>
              ) : (
                <ClaimShopButton entityType={claimEntityType} entityId={school.id} entityName={school.school_name} noun="school" />
              )}
              {(school.formatted_address || directionsHref) && (
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 mt-1 text-sm text-slate-500 font-medium">
                  {school.formatted_address && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {school.formatted_address}
                    </span>
                  )}
                  {directionsHref && (
                    <a
                      href={directionsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-ig-click="outbound_lead"
                      className="inline-flex items-center gap-1.5 font-bold text-indigo-600 hover:underline"
                    >
                      <Navigation className="w-4 h-4" />
                      Get Directions
                    </a>
                  )}
                </div>
              )}

              {/* Call / Website — same top-of-page placement as the shop/salon
                  pages (moved up out of the sidebar). */}
              {(school.phone || websiteHref) && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {school.phone && (
                    <a
                      href={`tel:${school.phone.replace(/[^0-9+]/g, "")}`}
                      data-ig-click="outbound_lead"
                      className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl transition-colors border border-slate-200 shadow-sm px-6 py-3"
                    >
                      <Phone className="w-4 h-4 text-slate-500" />
                      Call
                    </a>
                  )}
                  {websiteHref && (
                    <a
                      href={websiteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-ig-click="outbound_lead"
                      className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl transition-colors border border-slate-200 shadow-sm px-6 py-3"
                    >
                      <Globe className="w-4 h-4 text-slate-500" />
                      Website
                    </a>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {school.rating && (
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-900">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    {Number(school.rating).toFixed(1)}
                    {school.google_review_count ? (
                      <span className="text-slate-500 font-medium underline decoration-slate-300 underline-offset-2">
                        {school.google_review_count} reviews
                      </span>
                    ) : null}
                  </span>
                )}
                {(isAccredited || isStateLicensed) && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isAccredited ? "Accredited" : "State Licensed"}
                  </span>
                )}
                {isClosed && (
                  <span className="inline-flex items-center text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
                    Permanently Closed
                  </span>
                )}
              </div>

              {school.accreditor_name && (
                <p className="text-sm text-slate-600 font-medium mt-3 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 shrink-0" />
                  Accredited by {school.accreditor_name}
                </p>
              )}
            </div>

            {/* By the Numbers */}
            {stats.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
                <h2 className="text-lg font-black text-slate-900 mb-4">By the Numbers</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {stats.map(({ label, value, Icon }) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <Icon className="w-4 h-4 text-indigo-600 mb-2" />
                      <p className="text-lg font-black text-slate-900">{value}</p>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                {(school.pell_grant_rate != null || school.federal_loan_rate != null || school.median_student_debt != null) && (
                  <p className="text-xs text-slate-400 font-medium mt-4">
                    {[
                      school.pell_grant_rate != null ? `${formatPercent(school.pell_grant_rate)} of students receive Pell Grants` : null,
                      school.federal_loan_rate != null ? `${formatPercent(school.federal_loan_rate)} take federal loans` : null,
                      school.median_student_debt != null ? `median debt ${formatCurrency(school.median_student_debt)}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            )}

            {/* 2026 Licensing Exam Results — the school's current 2026 written
                and practical pass rates, each with the number of students the
                rate is based on. Pulled straight from the school row's
                precomputed columns (which match the raw TDLR records). */}
            {examResults.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
                <h2 className="text-lg font-black text-slate-900 mb-1">2026 Licensing Exam Results</h2>
                <p className="text-xs text-slate-500 font-medium mb-4">
                  Share of this school&apos;s 2026 students who passed the Texas licensing exam, per Texas Department
                  of Licensing &amp; Regulation records — with the number of students each rate is based on.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {examResults.map((r) => (
                    <div key={r.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <Award className="w-4 h-4 text-indigo-600 mb-2" />
                      <p className="text-lg font-black text-slate-900">{r.value}</p>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        2026 {r.label} Pass Rate
                        {r.students != null ? (
                          <span className="block text-slate-400 font-medium">Based on {r.students} student{r.students === 1 ? "" : "s"}</span>
                        ) : null}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : school.state_pass_rate ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
                <h2 className="text-lg font-black text-slate-900 mb-1">Licensing Exam Results</h2>
                <p className="text-xs text-slate-500 font-medium mb-4">
                  This school&apos;s 2026 written/practical breakdown isn&apos;t in our records yet. Its reported
                  state board pass rate is shown below.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <Award className="w-4 h-4 text-indigo-600 mb-2" />
                    <p className="text-lg font-black text-slate-900">{school.state_pass_rate}</p>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">State Board Pass Rate</p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Exam-prep CTA — placed directly below the 2026 exam results and
                matched to the school type: cosmetology schools get the
                cosmetology prep, barber schools the barber prep. */}
            {(() => {
              const examState = deriveExamState(school.formatted_address);
              const { href: prepHref, label: prepLabel } = examPrepInfo(
                examState,
                school._matchType === "cosmetology" ? "cosmetology" : "barber"
              );
              return (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                    A student here?
                  </p>
                  <Link
                    href={prepHref}
                    data-ig-click="exam_prep_cta"
                    className="w-full inline-flex flex-col items-center justify-center gap-1 px-5 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-md shadow-indigo-600/20"
                  >
                    <span className="inline-flex items-center gap-2 font-extrabold text-sm uppercase tracking-wider">
                      <BookOpen className="w-4 h-4" />
                      {prepLabel}
                    </span>
                    <span className="text-xs font-medium text-white/70">Get ready to pass your licensing exam</span>
                  </Link>
                </div>
              );
            })()}

            {/* ShearQuery Reviews — same section and placement (bottom of the
                main content column) as the shop/salon pages, wrapped as a
                card to match this page's main-column styling. */}
            <ReviewsSection
              reviews={reviews}
              averageRating={averageRating}
              entityName={school.school_name}
              containerClassName="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5"
              action={<WriteReviewButton entityType="school" entityId={school.id} entityName={school.school_name} />}
            />

            {/* Live Google content for a school whose owner connected their
                Business Profile. claimEntityType distinguishes the two school
                tables, which share this route. */}
            <GooglePosts entityType={claimEntityType} entityId={school.id} />
            <GoogleReviews entityType={claimEntityType} entityId={school.id} />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Website/Call moved up to the header (top of page, next to the
                address) to match the shop/salon layout — the standalone
                sidebar contact card was removed. */}
            <SearchVisibilityCard searchPerformance={searchPerformance} isClaimed={isClaimed} entityLabel="school" />

            {/* Exam-prep CTA moved up into the main column, directly below the
                2026 exam results, and made type-aware (barber vs cosmetology). */}

            {/* Location/Get Directions moved up next to the address at the top
                of the page (shop/salon layout) — sidebar Location card removed. */}
            <NearbyEntitiesSection title="Nearby Shops" icon={Scissors} entities={nearbyShops} />
            <NearbyEntitiesSection title="Nearby Supply Stores" icon={Store} entities={nearbySupplyStores} />

            {hours.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Hours
                </h3>
                <ul className="space-y-1.5">
                  {hours.map((line, i) => {
                    const [day, ...rest] = line.split(":");
                    return (
                      <li
                        key={line}
                        className={`flex items-start justify-between gap-3 text-xs font-medium ${
                          i === TODAY_INDEX ? "text-slate-900 font-bold" : "text-slate-500"
                        }`}
                      >
                        <span>{day}</span>
                        <span className="text-right">{rest.join(":").trim()}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-8">
          <BackToSearchLink
            fallbackHref="/tools/barbershop-search"
            className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
          />
        </div>
      </div>

      {/* Fires only after an outbound click — see the component for why the
          capture sits behind the click rather than in front of it. examState
          is recomputed here because the other two call sites live in
          generateMetadata and an IIFE, neither in scope at this level. */}
      <PassRateAlert
        schoolId={school.id}
        schoolName={school.school_name}
        schoolSlug={school.slug}
        examState={deriveExamState(school.formatted_address)}
      />
    </div>
  );
}
