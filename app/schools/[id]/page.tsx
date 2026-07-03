import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
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
} from "lucide-react";
import { BackToSearchLink } from "@/components/shared/back-to-search-link";

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const PUBLIC_COLUMNS = [
  "id",
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
].join(", ");

// Barber schools and cosmetology schools live in separate tables (agent_barber_school_leads /
// agent_cosmetology_school_leads); the unified search Schools tab returns ids from either, so
// this route checks both. UUIDs are generated independently per table and won't collide.
async function getSchool(id: string) {
  const { data: barberRow, error: barberErr } = await supabase
    .from("agent_barber_school_leads")
    .select(PUBLIC_COLUMNS)
    .eq("id", id)
    .single();

  if (!barberErr && barberRow) return { ...(barberRow as any), school_category: "Barber School", _matchType: "barber" as const };

  const { data: cosmetRow, error: cosmetErr } = await supabase
    .from("agent_cosmetology_school_leads")
    .select(`${PUBLIC_COLUMNS}, license_type`)
    .eq("id", id)
    .single();

  if (cosmetErr || !cosmetRow) return null;
  const cosmet = cosmetRow as any;
  return { ...cosmet, school_category: cosmet.license_type || "Cosmetology School", _matchType: "cosmetology" as const };
}

// 2026 TDLR exam cohort summary for this school. Aggregate-only by design —
// individual student names/scores aren't surfaced on the public profile.
async function getStudentCohortStats(schoolId: string, schoolType: "barber" | "cosmetology") {
  const { data, error } = await supabase
    .from("agent_barber_student_leads")
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

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const school = await getSchool(id);
  if (!school) return { title: "School Not Found" };

  const title = `${school.school_name}${school.city ? ` — ${school.school_category} in ${school.city}` : ""}`;
  const description = `${school.school_category}${school.city ? ` in ${school.city}` : ""}.${
    school.annual_tuition ? ` Tuition ~$${Number(school.annual_tuition).toLocaleString()}.` : ""
  }${school.state_pass_rate ? ` State board pass rate: ${school.state_pass_rate}.` : ""}`;
  const heroImage = Array.isArray(school.google_photos) ? school.google_photos[0] : null;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: heroImage ? [heroImage] : undefined,
    },
  };
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

export default async function SchoolProfilePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const school = await getSchool(id);

  if (!school) notFound();

  const cohortStats = await getStudentCohortStats(school.id, school._matchType);

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

  const websiteHref = school.website
    ? school.website.startsWith("http")
      ? school.website
      : `https://${school.website}`
    : null;

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
      label: `2026 Written Pass Rate${school.written_test_takers_2026 ? ` (${school.written_test_takers_2026} students)` : ''}`,
      value: formatPercent(school.written_pass_rate_2026),
      Icon: Award,
    },
    school.practical_pass_rate_2026 != null && {
      label: `2026 Practical Pass Rate${school.practical_test_takers_2026 ? ` (${school.practical_test_takers_2026} students)` : ''}`,
      value: formatPercent(school.practical_pass_rate_2026),
      Icon: Award,
    },
    school.written_pass_rate_2026 == null && school.practical_pass_rate_2026 == null && school.state_pass_rate && {
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Photo Gallery */}
            {heroPhoto ? (
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                <a href={heroPhoto} target="_blank" rel="noopener noreferrer" className="block w-full aspect-[16/10] bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={heroPhoto} alt={school.school_name} className="w-full h-full object-cover" />
                </a>
                {thumbnails.length > 0 && (
                  <div className="grid grid-cols-4 gap-0.5 p-0.5 bg-slate-100">
                    {thumbnails.map((url, i) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="relative aspect-square overflow-hidden bg-slate-200 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`${school.school_name} photo ${i + 2}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-600 to-slate-800 aspect-[16/7] flex items-center justify-center">
                <GraduationCap className="w-16 h-16 text-white/40" />
              </div>
            )}

            {/* Header Block */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5">
                  {school.school_category}
                </span>
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

            {/* 2026 Student Cohort */}
            {cohortStats && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
                <h2 className="text-lg font-black text-slate-900 mb-1">2026 Student Cohort</h2>
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
            )}
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
