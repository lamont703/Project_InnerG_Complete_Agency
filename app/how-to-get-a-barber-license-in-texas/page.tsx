import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { CheckCircle2, GraduationCap, FileText, RefreshCw, ArrowRight, Star, TrendingUp } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const MIN_SAMPLE_SIZE = 5; // same bar the full leaderboard uses — see app/texas-school-leaderboard/leaderboard-table.tsx
const TOP_N = 8;

const SCHOOL_COLUMNS = [
  "slug",
  "school_name",
  "city",
  "rating",
  "google_review_count",
  "written_pass_rate_2026",
  "written_first_attempt_pass_rate_2026",
  "written_test_takers_2026",
  "school_leaderboard_score_2026",
];

interface TopSchool {
  slug: string;
  school_name: string;
  city: string | null;
  rating: string | null;
  google_review_count: number | null;
  written_pass_rate_2026: number | null;
  written_first_attempt_pass_rate_2026: number | null;
  written_test_takers_2026: number | null;
  school_leaderboard_score_2026: number | null;
}

// Same two-table union the full leaderboard does (a dual-licensed
// cosmetology school can still run a real Barber program with its own
// exam outcomes) — kept in sync with app/texas-school-leaderboard/page.tsx
// rather than importing across route folders, per this codebase's
// established convention of duplicating small per-page data logic.
async function getTopBarberSchools(): Promise<TopSchool[]> {
  const [{ data: fromBarberTable }, { data: fromCosmetTable }] = await Promise.all([
    supabase.from("agent_barber_school_leads").select(SCHOOL_COLUMNS.join(", ")).not("written_test_takers_2026", "is", null),
    supabase.from("agent_cosmetology_school_leads").select(SCHOOL_COLUMNS.join(", ")).not("written_test_takers_2026", "is", null),
  ]);

  const all = [...(fromBarberTable || []), ...(fromCosmetTable || [])] as unknown as TopSchool[];
  return all
    .filter((s) => (s.written_test_takers_2026 ?? 0) >= MIN_SAMPLE_SIZE)
    .sort((a, b) => (b.school_leaderboard_score_2026 ?? 0) - (a.school_leaderboard_score_2026 ?? 0))
    .slice(0, TOP_N);
}

function formatPercent(val: number | null) {
  return val != null ? `${Math.round(val * 100)}%` : "—";
}

const STEPS = [
  {
    title: "Complete a TDLR-approved barber training program",
    text: "Enroll in a Texas Department of Licensing and Regulation (TDLR) approved barber school and complete the required Class A curriculum hours. Pass rates and program quality vary a lot by school — see the real 2026 outcomes below before choosing one.",
  },
  {
    title: "Pass the Class A written and practical exam",
    text: "Both exams are administered by PSI on TDLR's behalf. The written exam covers Texas barbering law, sanitation, and theory; the practical exam tests hands-on technique. This is the step where most candidates statewide struggle — see our Texas Barber Exam Intelligence Prep for exam-specific prep.",
  },
  {
    title: "Apply for your license through TDLR",
    text: "Submit your license application with proof of completed training hours and passed exams. TDLR publishes the current application steps, fees, and lawful-presence requirements directly — see our full TDLR licensing guide for that exact breakdown.",
  },
  {
    title: "Renew on TDLR's 2-year cycle",
    text: "A Texas barber license runs on a 2-year renewal cycle with its own continuing-education requirements. Our TDLR licensing guide covers the current renewal fee, CE rules, and reciprocity from other states.",
  },
];

const FAQS = [
  {
    q: "How long does it take to get a barber license in Texas?",
    a: "It depends mainly on how long your school's training program runs and how quickly you pass both the written and practical Class A exam — the required training hours are set by TDLR and enforced by your school, so timelines vary by program. Compare real first-attempt pass rates by school below before enrolling, since a lower pass rate usually means more retest time added to your timeline.",
  },
  {
    q: "Is a 'barber certification' the same as a barber license in Texas?",
    a: "Yes — TDLR's official term is a 'license,' not a 'certification,' but they refer to the same credential. You cannot legally work as a barber in Texas, or use the title, without this TDLR-issued license.",
  },
  {
    q: "How much does a barber license cost in Texas?",
    a: "There are two separate cost buckets: school tuition (varies widely by program — see real tuition by school on the full Texas School Leaderboard) and TDLR's own application/exam/renewal fees, which we break down in full in our TDLR licensing guide.",
  },
  {
    q: "What's on the Texas barber written exam?",
    a: "The Class A written exam, administered by PSI, covers Texas barbering law, sanitation and safety, and barbering theory. Statewide first-attempt pass rates are lower than most candidates expect — see our Texas Barber Licensure Crisis report for the real numbers, and our Exam Intelligence Prep for exam-specific practice.",
  },
  {
    q: "Which Texas barber schools have the best pass rates?",
    a: "Real, ranked 2026 outcomes for every Texas barber school — written pass rate, first-attempt pass rate, and retest burden — are on the Texas Barber & Cosmetology School Leaderboard, ranked by real Class A exam results, not by ratings alone.",
  },
];

export default async function HowToGetBarberLicenseTexasPage() {
  const topSchools = await getTopBarberSchools();

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Get a Barber License in Texas",
    description:
      "The real steps to getting a Texas barber license (barber certification): TDLR-approved training, the Class A written and practical exam, application, and renewal.",
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
    name: "How to Get a Barber License in Texas — FAQ",
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
            How to Get a Barber License in Texas
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            The real path to Texas barber certification — training, the Class A exam, application, and renewal —
            plus which schools actually get students licensed, backed by real 2026 exam data.
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

        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-16">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-indigo-700" />
            <h2 className="text-sm font-black uppercase tracking-wider text-indigo-900">
              "Barber Certification" vs. "Barber License" in Texas
            </h2>
          </div>
          <p className="text-sm text-indigo-950 leading-relaxed">
            People searching for "barber certification in Texas" and "barber license in Texas" are looking for the
            same thing — TDLR's official term is a <strong>license</strong>, issued after you complete an approved
            training program and pass the Class A written and practical exam. There's no separate, lesser
            "certification" track; the license is the credential you need to legally work and use the title
            "barber" in Texas.
          </p>
        </div>

        {topSchools.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Top Texas Barber Schools by 2026 Pass Rate
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-medium mb-4">
              Ranked by real 2026 Class A written exam outcomes — schools with fewer than {MIN_SAMPLE_SIZE} reported
              test-takers aren&apos;t ranked here. See the{" "}
              <Link href="/texas-school-leaderboard" className="text-indigo-600 font-bold hover:underline">
                full Texas Barber &amp; Cosmetology School Leaderboard
              </Link>{" "}
              for every school, including cosmetology programs and schools not yet meeting this sample size.
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
                        {formatPercent(s.written_pass_rate_2026)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {formatPercent(s.written_first_attempt_pass_rate_2026)}
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
              href="/insights/texas-barber-cosmetology-license-requirements"
              className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
            >
              <span className="text-sm font-bold text-slate-900">
                Full TDLR application, fees &amp; renewal guide
              </span>
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
              href="/texas-barber-exam-intelligence-prep"
              className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
            >
              <span className="text-sm font-bold text-slate-900">Texas Barber Exam Intelligence Prep</span>
              <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0" />
            </Link>
            <Link
              href="/texas-barber-practical-exam-kit-list"
              className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
            >
              <span className="text-sm font-bold text-slate-900">Texas Barber Practical Exam Kit List</span>
              <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0" />
            </Link>
            <Link
              href="/cosmetology-schools-houston"
              className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
            >
              <span className="text-sm font-bold text-slate-900">Houston Barber &amp; Cosmetology Schools</span>
              <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0" />
            </Link>
            <Link
              href="/barbershop-apprentice-jobs-houston"
              className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
            >
              <span className="text-sm font-bold text-slate-900">Find a Shop Hiring After Licensure</span>
              <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0" />
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-center mt-16 text-xs text-slate-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          Pass-rate data pulled directly from real 2026 TDLR Class A exam results
          <RefreshCw className="w-3.5 h-3.5 text-slate-300" />
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </div>
  );
}
