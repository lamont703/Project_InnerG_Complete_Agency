import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { LeaderboardTable } from "@/app/texas-school-leaderboard/leaderboard-table";
import type { LeaderboardSchool } from "@/app/texas-school-leaderboard/page";
import { EzoicAd } from "@/components/shared/ezoic-ad";
import { Navbar } from "@/components/layout/navbar";

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const SHARED_COLUMNS = ["id", "slug", "school_name", "city", "rating", "google_review_count", "accreditation_status", "annual_tuition"];
const BARBER_EXAM_COLUMNS = [
  "written_pass_rate_2026",
  "written_test_takers_2026",
  "practical_pass_rate_2026",
  "practical_test_takers_2026",
  "written_first_attempt_pass_rate_2026",
  "written_avg_attempts_to_pass_2026",
  "school_leaderboard_score_2026",
];
const COSMETOLOGY_EXAM_COLUMNS = [
  "cosmetology_written_pass_rate_2026",
  "cosmetology_written_test_takers_2026",
  "cosmetology_practical_pass_rate_2026",
  "cosmetology_practical_test_takers_2026",
  "cosmetology_written_first_attempt_pass_rate_2026",
  "cosmetology_written_avg_attempts_to_pass_2026",
  "cosmetology_school_leaderboard_score_2026",
];

function mapCosmetologyColumns(row: any): LeaderboardSchool {
  return {
    id: row.id,
    slug: row.slug,
    school_name: row.school_name,
    city: row.city,
    rating: row.rating,
    google_review_count: row.google_review_count,
    accreditation_status: row.accreditation_status,
    annual_tuition: row.annual_tuition,
    written_pass_rate_2026: row.cosmetology_written_pass_rate_2026,
    written_test_takers_2026: row.cosmetology_written_test_takers_2026,
    practical_pass_rate_2026: row.cosmetology_practical_pass_rate_2026,
    practical_test_takers_2026: row.cosmetology_practical_test_takers_2026,
    written_first_attempt_pass_rate_2026: row.cosmetology_written_first_attempt_pass_rate_2026,
    written_avg_attempts_to_pass_2026: row.cosmetology_written_avg_attempts_to_pass_2026,
    school_leaderboard_score_2026: row.cosmetology_school_leaderboard_score_2026,
    license_type: "cosmetology",
  };
}

// Same dual-table logic as /texas-school-leaderboard (a school can
// legitimately run both a Barber and a Cosmetology program with separate
// real outcomes for each), just scoped to Houston with .ilike("city", ...)
// on every query instead of the full statewide set.
async function getHoustonSchoolData() {
  const [
    { data: barberFromBarberTable },
    { data: barberFromCosmetTable },
    { data: cosmetFromCosmetTable },
    { data: cosmetFromBarberTable },
  ] = await Promise.all([
    supabase.from("agent_barber_school_leads").select([...SHARED_COLUMNS, ...BARBER_EXAM_COLUMNS].join(", ")).ilike("city", "%houston%").not("written_test_takers_2026", "is", null),
    supabase.from("agent_cosmetology_school_leads").select([...SHARED_COLUMNS, ...BARBER_EXAM_COLUMNS].join(", ")).ilike("city", "%houston%").not("written_test_takers_2026", "is", null),
    supabase.from("agent_cosmetology_school_leads").select([...SHARED_COLUMNS, ...COSMETOLOGY_EXAM_COLUMNS].join(", ")).ilike("city", "%houston%").not("cosmetology_written_test_takers_2026", "is", null),
    supabase.from("agent_barber_school_leads").select([...SHARED_COLUMNS, ...COSMETOLOGY_EXAM_COLUMNS].join(", ")).ilike("city", "%houston%").not("cosmetology_written_test_takers_2026", "is", null),
  ]);

  const barber: LeaderboardSchool[] = [
    ...(barberFromBarberTable || []).map((s: any) => ({ ...s, license_type: "barber" as const })),
    ...(barberFromCosmetTable || []).map((s: any) => ({ ...s, license_type: "barber" as const })),
  ];
  const cosmetology: LeaderboardSchool[] = [
    ...(cosmetFromCosmetTable || []).map(mapCosmetologyColumns),
    ...(cosmetFromBarberTable || []).map(mapCosmetologyColumns),
  ];

  return { barber, cosmetology };
}

const MIN_SAMPLE = 15;

function avgPassRate(schools: LeaderboardSchool[]): number | null {
  const qualifying = schools.filter((s) => (s.written_test_takers_2026 ?? 0) >= MIN_SAMPLE && s.written_pass_rate_2026 != null);
  if (qualifying.length === 0) return null;
  return qualifying.reduce((sum, s) => sum + (s.written_pass_rate_2026 || 0), 0) / qualifying.length;
}

export default async function CosmetologySchoolsHoustonPage() {
  const { barber, cosmetology } = await getHoustonSchoolData();

  const cosmetAvg = avgPassRate(cosmetology);
  const barberAvg = avgPassRate(barber);
  const cosmetQualifyingCount = cosmetology.filter((s) => (s.written_test_takers_2026 ?? 0) >= MIN_SAMPLE).length;
  const barberQualifyingCount = barber.filter((s) => (s.written_test_takers_2026 ?? 0) >= MIN_SAMPLE).length;

  const faqs = [
    {
      q: "How many cosmetology schools are in Houston?",
      a: `Real, currently-tracked count: ${cosmetology.length} cosmetology schools in the Houston area, ${cosmetQualifyingCount} with enough 2026 test-takers (15+) for a reliable pass-rate ranking.`,
    },
    {
      q: "What is the average cosmetology written exam pass rate in Houston?",
      a: cosmetAvg
        ? `Based on real 2026 TDLR data across Houston schools with 15+ test-takers, the average written exam pass rate is ${Math.round(cosmetAvg * 100)}%. See the full ranked list below for school-by-school numbers.`
        : "See the full ranked list below for school-by-school numbers.",
    },
    {
      q: "How many barber schools are in Houston?",
      a: `Real, currently-tracked count: ${barber.length} barber schools in the Houston area, ${barberQualifyingCount} with enough 2026 test-takers (15+) for a reliable pass-rate ranking.`,
    },
    {
      q: "What is the average barber written exam pass rate in Houston?",
      a: barberAvg
        ? `Based on real 2026 TDLR data across Houston schools with 15+ test-takers, the average written exam pass rate is ${Math.round(barberAvg * 100)}%. See the full ranked list below for school-by-school numbers.`
        : "See the full ranked list below for school-by-school numbers.",
    },
    {
      q: "Is this the same as the statewide Texas school leaderboard?",
      a: "No — this page is filtered to Houston-area schools only. See the Texas Barber & Cosmetology School Leaderboard for the full statewide ranking.",
    },
  ];

  return (
    <div className="min-h-screen light bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: faq.a },
            })),
          }),
        }}
      />
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-10">
        <EzoicAd className="mb-8" />

        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
            Real 2026 TDLR Data
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            Cosmetology &amp; Barber Schools in Houston, TX
          </h1>
          <p className="text-slate-600">
            {cosmetology.length} cosmetology schools and {barber.length} barber schools in the Houston area,
            ranked by real 2026 Texas licensing exam outcomes — not just a pass rate, but how well each
            school prepares students to pass on their <em>first</em> try.
          </p>
        </div>

        <LeaderboardTable barberSchools={barber} cosmetologySchools={cosmetology} />

        <div className="max-w-3xl mx-auto mt-16 pt-10 border-t border-slate-200">
          <h2 className="text-lg font-black text-slate-900 mb-6 text-center">Common Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <h3 className="text-sm font-black text-slate-900 mb-1.5">{faq.q}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-center mt-8">
            Looking for the full state?{" "}
            <Link href="/texas-school-leaderboard" className="text-indigo-600 font-bold hover:underline">
              Texas Barber &amp; Cosmetology School Leaderboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
