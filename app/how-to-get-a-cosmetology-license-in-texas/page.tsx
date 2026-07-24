import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { CheckCircle2, GraduationCap, FileText, RefreshCw, ArrowRight, Star, TrendingUp } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ExamPrepCTA } from "@/components/shared/exam-prep-cta";

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const MIN_SAMPLE_SIZE = 5; // same bar the full leaderboard uses
const TOP_N = 8;

// Cosmetology pass-rate columns (the cosmetology_* set) — populated on real
// cosmetology programs. Mirrors the how-to-get-a-barber-license page's data
// shape, just pointed at the cosmetology operator exam outcomes.
const SCHOOL_COLUMNS = [
  "slug",
  "school_name",
  "city",
  "rating",
  "google_review_count",
  "cosmetology_written_pass_rate_2026",
  "cosmetology_written_first_attempt_pass_rate_2026",
  "cosmetology_written_test_takers_2026",
  "cosmetology_school_leaderboard_score_2026",
];

interface TopSchool {
  slug: string;
  school_name: string;
  city: string | null;
  rating: string | null;
  google_review_count: number | null;
  cosmetology_written_pass_rate_2026: number | null;
  cosmetology_written_first_attempt_pass_rate_2026: number | null;
  cosmetology_written_test_takers_2026: number | null;
  cosmetology_school_leaderboard_score_2026: number | null;
}

// Union both school tables (a barber-table school can also run a cosmetology
// program with its own operator-exam outcomes) — kept in sync with the
// leaderboard rather than imported across route folders, matching this
// codebase's convention of duplicating small per-page data logic.
async function getTopCosmetologySchools(): Promise<TopSchool[]> {
  const [{ data: fromCosmetTable }, { data: fromBarberTable }] = await Promise.all([
    supabase.from("agent_cosmetology_school_leads").select(SCHOOL_COLUMNS.join(", ")).not("cosmetology_written_test_takers_2026", "is", null),
    supabase.from("agent_barber_school_leads").select(SCHOOL_COLUMNS.join(", ")).not("cosmetology_written_test_takers_2026", "is", null),
  ]);

  const all = [...(fromCosmetTable || []), ...(fromBarberTable || [])] as unknown as TopSchool[];
  return all
    .filter((s) => (s.cosmetology_written_test_takers_2026 ?? 0) >= MIN_SAMPLE_SIZE)
    .sort((a, b) => (b.cosmetology_school_leaderboard_score_2026 ?? 0) - (a.cosmetology_school_leaderboard_score_2026 ?? 0))
    .slice(0, TOP_N);
}

function formatPercent(val: number | null) {
  return val != null ? `${Math.round(val * 100)}%` : "—";
}

const STEPS = [
  {
    title: "Complete a TDLR-approved cosmetology operator program",
    text: "Enroll in a Texas Department of Licensing and Regulation (TDLR) approved cosmetology school and complete the required operator training hours. Program quality and exam outcomes vary a lot by school — see the real 2026 pass rates below before choosing one.",
  },
  {
    title: "Pass the written and practical operator exam",
    text: "Both exams are administered by PSI on TDLR's behalf. The written (state board) exam covers Texas cosmetology law, infection control, and theory; the practical exam tests hands-on services. This is the step where most candidates struggle — take our free Cosmetology State Board Practice Test and see our Cosmetology Exam Intelligence Prep for exam-specific study.",
  },
  {
    title: "Apply for your license through TDLR",
    text: "Submit your operator license application with proof of completed training hours and passed exams. TDLR publishes the current application steps, fees, and lawful-presence requirements directly — see our full license requirements guide for that exact breakdown.",
  },
  {
    title: "Renew on TDLR's 2-year cycle",
    text: "A Texas cosmetology operator license runs on a 2-year renewal cycle with its own continuing-education requirements. Our continuing-education portal covers the current TDLR-approved CE topics you'll need each cycle.",
  },
];

const FAQS = [
  {
    q: "How long does it take to get a cosmetology license in Texas?",
    a: "It depends mainly on how long your school's operator program runs and how quickly you pass both the written and practical exam — the required training hours are set by TDLR and enforced by your school, so timelines vary by program. Compare real first-attempt pass rates by school below before enrolling, since a lower pass rate usually means more retest time added to your timeline.",
  },
  {
    q: "Is a 'cosmetology certification' the same as a cosmetology license in Texas?",
    a: "Yes — TDLR's official term is a 'license,' not a 'certification,' but people use them interchangeably. You cannot legally provide cosmetology services in Texas, or use the operator title, without this TDLR-issued license.",
  },
  {
    q: "How much does a cosmetology license cost in Texas?",
    a: "There are two separate cost buckets: school tuition (varies widely by program — see real tuition by school on the full Texas School Leaderboard) and TDLR's own application, exam, and renewal fees, broken down in full in our license requirements guide.",
  },
  {
    q: "What's on the Texas cosmetology state board written exam?",
    a: "The written (state board) exam, administered by PSI, covers Texas cosmetology law and rules, infection control and safety, and cosmetology theory. Statewide first-attempt pass rates are lower than most candidates expect — run through our free Cosmetology State Board Practice Test to see where you stand before test day.",
  },
  {
    q: "Which Texas cosmetology schools have the best pass rates?",
    a: "Real, ranked 2026 outcomes for every Texas cosmetology school — written pass rate, first-attempt pass rate, and retest burden — are on the Texas Barber & Cosmetology School Leaderboard, ranked by real operator exam results, not by ratings alone.",
  },
];

export default async function HowToGetCosmetologyLicenseTexasPage() {
  const topSchools = await getTopCosmetologySchools();

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Get a Cosmetology License in Texas",
    description:
      "The real steps to getting a Texas cosmetology license: TDLR-approved operator training, the PSI written and practical exam, application, and renewal.",
    step: STEPS.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.text,
    })),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name: "How to Get a Cosmetology License in Texas — FAQ",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <div className="min-h-screen light bg-slate-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-10 sm:pb-16">

        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
            <GraduationCap className="w-3 h-3" />
            Real 2026 TDLR Data
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-3">
            How to Get a Cosmetology License in Texas
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            The real path to a Texas cosmetology operator license — training, the written &amp; practical state
            board exam, application, and renewal — plus which schools actually get students licensed, backed by
            real 2026 exam data.
          </p>
        </div>

        <div className="space-y-4 mb-16">
          {STEPS.map((step, i) => (
            <div key={step.title} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center">
                {i + 1}
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 mb-1">{step.title}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{step.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-16">
          <ExamPrepCTA variant="cosmetology" />
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-16">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-indigo-700" />
            <h2 className="text-sm font-black uppercase tracking-wider text-indigo-900">
              "Cosmetology Certification" vs. "Cosmetology License" in Texas
            </h2>
          </div>
          <p className="text-sm text-indigo-950 leading-relaxed">
            People searching for "cosmetology certification in Texas" and "cosmetology license in Texas" are
            looking for the same thing — TDLR's official term is a <strong>license</strong>, issued after you
            complete an approved operator program and pass the written and practical exam. There&apos;s no
            separate, lesser "certification" track; the license is the credential you need to legally provide
            cosmetology services and use the operator title in Texas.
          </p>
        </div>

        {topSchools.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Top Texas Cosmetology Schools by 2026 Pass Rate
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-medium mb-4">
              Ranked by real 2026 cosmetology operator written exam outcomes — schools with fewer than{" "}
              {MIN_SAMPLE_SIZE} reported test-takers aren&apos;t ranked here. See the{" "}
              <Link href="/texas-school-leaderboard" className="text-indigo-600 font-bold hover:underline">
                full Texas Barber &amp; Cosmetology School Leaderboard
              </Link>{" "}
              for every school, including those not yet meeting this sample size.
            </p>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-4 py-3 font-bold">School</th>
                    <th className="px-4 py-3 font-bold text-right">Written Pass Rate</th>
                    <th className="px-4 py-3 font-bold text-right">1st-Attempt Pass Rate</th>
                    <th className="px-4 py-3 font-bold text-right">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {topSchools.map((s) => (
                    <tr key={s.slug} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/schools/${s.slug}`} className="font-bold text-slate-900 hover:text-indigo-600">
                          {s.school_name}
                        </Link>
                        {s.city && <span className="text-slate-400 font-medium"> — {s.city}</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">
                        {formatPercent(s.cosmetology_written_pass_rate_2026)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {formatPercent(s.cosmetology_written_first_attempt_pass_rate_2026)}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-600 font-bold">
                        {s.rating ? (
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-500" /> {s.rating}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="prose prose-sm max-w-none text-slate-600 space-y-8 mb-16">
          <h2 className="text-lg font-black text-slate-900 not-prose mb-3">Common Questions</h2>
          {FAQS.map((faq) => (
            <div key={faq.q}>
              <h3 className="text-base font-black text-slate-900 not-prose mb-2">{faq.q}</h3>
              <p>{faq.a}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-10">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-4">Go Deeper</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Link
              href="/texas-cosmetology-exam-intelligence-prep"
              className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
            >
              <span className="text-sm font-bold text-slate-900">Texas Cosmetology Exam Intelligence Prep</span>
              <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0" />
            </Link>
            <Link
              href="/tools/texas-cosmetology-exam-practice-deck"
              className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
            >
              <span className="text-sm font-bold text-slate-900">Free Cosmetology State Board Practice Test</span>
              <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0" />
            </Link>
            <Link
              href="/insights/texas-barber-cosmetology-license-requirements"
              className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
            >
              <span className="text-sm font-bold text-slate-900">Full TDLR application, fees &amp; renewal guide</span>
              <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0" />
            </Link>
            <Link
              href="/texas-cosmetology-practical-exam-kit-list"
              className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
            >
              <span className="text-sm font-bold text-slate-900">Texas Cosmetology Practical Exam Kit List</span>
              <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0" />
            </Link>
            <Link
              href="/texas-school-leaderboard"
              className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
            >
              <span className="text-sm font-bold text-slate-900">Full Texas School Leaderboard</span>
              <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0" />
            </Link>
            <Link
              href="/cosmetology-schools-houston"
              className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
            >
              <span className="text-sm font-bold text-slate-900">Houston Cosmetology &amp; Barber Schools</span>
              <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0" />
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-center mt-16 text-xs text-slate-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          Pass-rate data pulled directly from real 2026 TDLR cosmetology operator exam results
          <RefreshCw className="w-3.5 h-3.5 text-slate-300" />
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </div>
  );
}
