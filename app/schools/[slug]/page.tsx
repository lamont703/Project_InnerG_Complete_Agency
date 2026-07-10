import { createClient } from "@supabase/supabase-js";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  MapPin,
  Star,
  CheckCircle2,
  GraduationCap,
  ExternalLink,
  Globe,
  Phone,
  Clock,
  Navigation,
  DollarSign,
  TrendingUp,
  Award,
  Users,
  AlertCircle,
  BookOpen,
  Scissors,
  Store,
} from "lucide-react";
import { BackToSearchLink } from "@/components/shared/back-to-search-link";
import { DynamicBackButton } from "@/components/shared/dynamic-back-button";
import Image from "next/image";
import { EntityPhotoGallery } from "@/components/shared/entity-photo-gallery";
import { NearbyEntitiesSection } from "@/components/shared/nearby-entities-section";
import { fetchNearbyEntities } from "@/lib/nearby-entities";
import { SCHOOL_PUBLIC_COLUMNS } from "@/lib/public-columns";

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const PUBLIC_COLUMNS = SCHOOL_PUBLIC_COLUMNS.join(", ");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Barber schools and cosmetology schools live in separate tables (agent_barber_school_leads /
// agent_cosmetology_school_leads); the unified search Schools tab returns ids from either, so
// this route checks both. UUIDs are generated independently per table and won't collide.
//
// Lookup is slug-primary with a legacy-UUID fallback: old /schools/{uuid} links (from
// before the slug migration) still resolve, tagged with _resolvedByLegacyId so the page
// component can 308-redirect to the canonical slug URL instead of silently dual-serving it.
async function getSchool(param: string) {
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

  if (!UUID_RE.test(param)) return null;

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
  if (cosmetIdErr || !cosmetById) return null;
  const cosmet = cosmetById as any;
  return { ...cosmet, school_category: cosmet.license_type || "Cosmetology School", _matchType: "cosmetology" as const, _resolvedByLegacyId: true };
}

type StudentTable = "agent_barber_student_leads" | "agent_cosmetology_student_leads";

// 2026 TDLR exam cohort summary for this school. A school can have students
// in both exam tables if it's dual-licensed (e.g. a cosmetology school that
// also runs a Barber program), so this is called once per table and each
// result is rendered as its own clearly-labeled section — never merged,
// since they're two different exams with two different licenses at stake.
async function getStudentCohortStats(table: StudentTable, schoolId: string, schoolType: "barber" | "cosmetology") {
  const { data, error } = await supabase
    .from(table)
    .select("student_key, test_type, attempt_number, result")
    .eq("matched_school_id", schoolId)
    .eq("matched_school_type", schoolType);

  if (error || !data || data.length === 0) return null;

  const distinctStudents = new Set(data.map((r) => r.student_key)).size;

  const firstAttemptStats = (testType: "Written" | "Practical") => {
    const rows = data.filter((r) => r.test_type === testType && r.attempt_number === 1);
    if (rows.length === 0) return null;
    const passed = rows.filter((r) => r.result === "PASS").length;
    return { total: rows.length, rate: passed / rows.length };
  };

  return {
    distinctStudents,
    writtenFirstAttempt: firstAttemptStats("Written"),
    practicalFirstAttempt: firstAttemptStats("Practical"),
  };
}

type ExamStatus = "passed" | "failed" | "not_attempted";

// Deliberately selects test_type/result (PASS or FAIL) but never score — the
// state board requires 70%+ on both written and practical to be licensed,
// and result already reflects that threshold, so we can show licensing
// status ("passed both parts" or not, across all attempts) without ever
// exposing an actual numeric score.
//
// Most students in a given year have only sat one of the two required exams
// so far (not both), which is normal — written is typically completed before
// practical. Tracking attempted-vs-passed separately (not just pass/fail)
// lets the UI tell "hasn't gotten to the other exam yet" apart from "tried
// and hasn't passed it," instead of lumping both into one alarming bucket.
async function getStudentNames(table: StudentTable, schoolId: string, schoolType: "barber" | "cosmetology") {
  const { data, error } = await supabase
    .from(table)
    .select("student_key, first_name, last_name, test_type, result")
    .eq("matched_school_id", schoolId)
    .eq("matched_school_type", schoolType);

  if (error || !data || data.length === 0) return [];

  const byStudent = new Map<string, { name: string; written: ExamStatus; practical: ExamStatus }>();
  for (const row of data) {
    if (!byStudent.has(row.student_key)) {
      byStudent.set(row.student_key, {
        name: `${row.first_name} ${row.last_name}`.trim(),
        written: "not_attempted",
        practical: "not_attempted",
      });
    }
    const student = byStudent.get(row.student_key)!;
    const field = row.test_type === "Written" ? "written" : "practical";
    if (row.result === "PASS") {
      student[field] = "passed";
    } else if (student[field] !== "passed") {
      student[field] = "failed";
    }
  }

  return Array.from(byStudent.values()).sort((a, b) => a.name.localeCompare(b.name));
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
  const description = `${school.school_category}${school._matchType === "cosmetology" ? " (also known as a beauty school or hair school)" : ""}${
    school.city ? ` in ${school.city}` : ""
  }.${school.annual_tuition ? ` Tuition ~$${Number(school.annual_tuition).toLocaleString()}.` : ""}${
    school.pell_grant_rate != null ? ` ${Math.round(school.pell_grant_rate * 100)}% of students receive financial aid.` : ""
  }${school.state_pass_rate ? ` State board pass rate: ${school.state_pass_rate}.` : ""}`;
  const heroImage = Array.isArray(school.google_photos) ? school.google_photos[0] : null;

  return {
    title,
    description,
    alternates: { canonical: `https://agency.innergcomplete.com/schools/${slug}` },
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
  const address = school.formatted_address
    ? { "@type": "PostalAddress", streetAddress: school.formatted_address, addressRegion: "TX", addressCountry: "US" }
    : undefined;

  const org: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: school.school_name,
    description: `${school.school_category}${school._matchType === "cosmetology" ? " / beauty school / hair school" : ""}${
      school.city ? ` in ${school.city}, Texas` : ""
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

  const faqPage =
    faqEntries.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqEntries.map(({ q, a }) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
          })),
        }
      : null;

  return { org, faqPage };
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

  const examConfigs = [
    { examLabel: "Barber", table: "agent_barber_student_leads" as const },
    { examLabel: "Cosmetology Operator", table: "agent_cosmetology_student_leads" as const },
  ];
  const examCohorts = (
    await Promise.all(
      examConfigs.map(async ({ examLabel, table }) => ({
        examLabel,
        cohortStats: await getStudentCohortStats(table, school.id, school._matchType),
        studentNames: await getStudentNames(table, school.id, school._matchType),
      }))
    )
  ).filter((c) => c.cohortStats);

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

  const { org: schoolJsonLd, faqPage: faqJsonLd } = buildSchoolJsonLd(school, websiteHref);

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
    school.written_pass_rate_2026 != null && {
      label: `2026 ${barberPrefix}Written Pass Rate${school.written_test_takers_2026 ? ` (${school.written_test_takers_2026} students)` : ''}`,
      value: formatPercent(school.written_pass_rate_2026),
      Icon: Award,
    },
    school.practical_pass_rate_2026 != null && {
      label: `2026 ${barberPrefix}Practical Pass Rate${school.practical_test_takers_2026 ? ` (${school.practical_test_takers_2026} students)` : ''}`,
      value: formatPercent(school.practical_pass_rate_2026),
      Icon: Award,
    },
    school.cosmetology_written_pass_rate_2026 != null && {
      label: `2026 ${cosmetPrefix}Written Pass Rate${school.cosmetology_written_test_takers_2026 ? ` (${school.cosmetology_written_test_takers_2026} students)` : ''}`,
      value: formatPercent(school.cosmetology_written_pass_rate_2026),
      Icon: Award,
    },
    school.cosmetology_practical_pass_rate_2026 != null && {
      label: `2026 ${cosmetPrefix}Practical Pass Rate${school.cosmetology_practical_test_takers_2026 ? ` (${school.cosmetology_practical_test_takers_2026} students)` : ''}`,
      value: formatPercent(school.cosmetology_practical_pass_rate_2026),
      Icon: Award,
    },
    school.written_pass_rate_2026 == null &&
      school.practical_pass_rate_2026 == null &&
      school.cosmetology_written_pass_rate_2026 == null &&
      school.cosmetology_practical_pass_rate_2026 == null &&
      school.state_pass_rate && {
        label: "State Board Pass Rate",
        value: school.state_pass_rate,
        Icon: Award,
      },
    school.student_body_size != null && {
      label: "Student Body Size",
      value: String(school.student_body_size),
      Icon: Users,
    },
  ].filter(Boolean) as { label: string; value: string; Icon: any }[];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Structured data: EducationalOrganization facts + FAQPage, read by
          both search engines (rich results) and LLM/AI-answer crawlers
          (direct fact extraction) — every value here also renders visibly
          in the page below, this just makes it machine-parseable too. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schoolJsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
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
              {school.formatted_address && (
                <p className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {school.formatted_address}
                </p>
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

            {/* 2026 Student Cohort + 2026 Students, once per exam type this school has data for */}
            {examCohorts.map(({ examLabel, cohortStats, studentNames }) => {
              if (!cohortStats) return null;
              const examNoun = examLabel === "Barber" ? "Class A Barber" : "Cosmetology Operator";

              const passedBoth = studentNames.filter((s) => s.written === "passed" && s.practical === "passed");
              const onlyNeedsPractical = studentNames.filter((s) => s.written === "passed" && s.practical === "not_attempted");
              const onlyNeedsWritten = studentNames.filter((s) => s.practical === "passed" && s.written === "not_attempted");
              const hasNotPassed = studentNames.filter((s) => s.written === "failed" || s.practical === "failed");

              const groups: { label: string; icon: typeof CheckCircle2; colorClass: string; students: typeof studentNames }[] = [
                { label: "Has Not Passed", icon: AlertCircle, colorClass: "text-red-700", students: hasNotPassed },
                { label: "Only Needs Practical Exam", icon: Clock, colorClass: "text-amber-700", students: onlyNeedsPractical },
                { label: "Only Needs Written Exam", icon: Clock, colorClass: "text-amber-700", students: onlyNeedsWritten },
                { label: "Passed Both Parts", icon: CheckCircle2, colorClass: "text-green-700", students: passedBoth },
              ];

              return (
                <div key={examLabel} className="space-y-4">
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
                    <h2 className="text-lg font-black text-slate-900 mb-1">2026 {examLabel} Student Cohort</h2>
                    <p className="text-xs text-slate-500 font-medium mb-4">
                      Aggregated from Texas Department of Licensing &amp; Regulation exam records — {cohortStats.distinctStudents} student{cohortStats.distinctStudents === 1 ? "" : "s"} tested in 2026.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <Users className="w-4 h-4 text-indigo-600 mb-2" />
                        <p className="text-lg font-black text-slate-900">{cohortStats.distinctStudents}</p>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">Students Tested</p>
                      </div>
                      {cohortStats.writtenFirstAttempt && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <Award className="w-4 h-4 text-indigo-600 mb-2" />
                          <p className="text-lg font-black text-slate-900">{formatPercent(cohortStats.writtenFirstAttempt.rate)}</p>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">
                            Written — Passed on 1st Try ({cohortStats.writtenFirstAttempt.total})
                          </p>
                        </div>
                      )}
                      {cohortStats.practicalFirstAttempt && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <Award className="w-4 h-4 text-indigo-600 mb-2" />
                          <p className="text-lg font-black text-slate-900">{formatPercent(cohortStats.practicalFirstAttempt.rate)}</p>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">
                            Practical — Passed on 1st Try ({cohortStats.practicalFirstAttempt.total})
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {studentNames.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
                      <h2 className="text-lg font-black text-slate-900 mb-1">2026 {examLabel} Student Exam Progress</h2>
                      <p className="text-xs text-slate-500 font-medium mb-4">
                        Breakdown of students who took the Texas {examNoun} licensing exam through this school in
                        2026, per public TDLR records. The state requires 70%+ on both the written and practical
                        exam to be licensed — individual student names and scores aren&apos;t shown, only aggregate
                        exam progress. Most students complete written before practical, so "only needs" one exam is
                        normal progress, not a concern.
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {groups.map(
                          (group) =>
                            group.students.length > 0 && (
                              <div key={group.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <group.icon className={`w-4 h-4 mb-2 ${group.colorClass}`} />
                                <p className="text-lg font-black text-slate-900">{group.students.length}</p>
                                <p className={`text-xs font-semibold mt-0.5 ${group.colorClass}`}>{group.label}</p>
                              </div>
                            )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {(websiteHref || school.phone) && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-3">
                {websiteHref && (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm uppercase tracking-wider transition-colors shadow-md shadow-indigo-600/20"
                  >
                    Visit Website
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                {school.phone && (
                  <a
                    href={`tel:${school.phone.replace(/[^0-9+]/g, "")}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    {school.phone}
                  </a>
                )}
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                A student here?
              </p>
              <Link
                href="/texas-barber-exam-intelligence-prep"
                className="w-full inline-flex flex-col items-center justify-center gap-1 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-md shadow-indigo-600/20"
              >
                <span className="inline-flex items-center gap-2 font-extrabold text-sm uppercase tracking-wider">
                  <BookOpen className="w-4 h-4" />
                  Texas Barber Exam Intelligence Prep
                </span>
                <span className="text-xs font-medium text-white/70">Get ready to pass your licensing exam</span>
              </Link>
            </div>

            {directionsHref && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">Location</h3>
                <p className="text-sm text-slate-600 font-medium mb-3">{school.formatted_address || school.city}</p>
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:underline"
                >
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </a>
              </div>
            )}

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
    </div>
  );
}
