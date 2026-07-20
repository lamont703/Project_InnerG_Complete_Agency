import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { LeaderboardTable } from "./leaderboard-table";
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

// Cosmetology Operator exam stats live in dedicated cosmetology_* columns
// (see the migration that added them) so they never collide with a
// dual-licensed school's separate Barber-exam stats above.
const COSMETOLOGY_EXAM_COLUMNS = [
  "cosmetology_written_pass_rate_2026",
  "cosmetology_written_test_takers_2026",
  "cosmetology_practical_pass_rate_2026",
  "cosmetology_practical_test_takers_2026",
  "cosmetology_written_first_attempt_pass_rate_2026",
  "cosmetology_written_avg_attempts_to_pass_2026",
  "cosmetology_school_leaderboard_score_2026",
];

export interface LeaderboardSchool {
  id: string;
  slug: string;
  school_name: string;
  city: string | null;
  rating: string | null;
  google_review_count: number | null;
  accreditation_status: string | null;
  annual_tuition: number | null;
  written_pass_rate_2026: number | null;
  written_test_takers_2026: number | null;
  practical_pass_rate_2026: number | null;
  practical_test_takers_2026: number | null;
  written_first_attempt_pass_rate_2026: number | null;
  written_avg_attempts_to_pass_2026: number | null;
  school_leaderboard_score_2026: number | null;
  license_type: "barber" | "cosmetology";
}

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

async function getLeaderboardData() {
  // The "Barber" and "Cosmetology" tabs are about which EXAM's outcomes are
  // being shown, not which school table a row lives in — a dual-licensed
  // school (e.g. a cosmetology school that also runs a Barber program) can
  // legitimately appear on both tabs with its own real outcomes for each.
  const [
    { data: barberFromBarberTable },
    { data: barberFromCosmetTable },
    { data: cosmetFromCosmetTable },
    { data: cosmetFromBarberTable },
  ] = await Promise.all([
    supabase.from("agent_barber_school_leads").select([...SHARED_COLUMNS, ...BARBER_EXAM_COLUMNS].join(", ")).not("written_test_takers_2026", "is", null),
    supabase.from("agent_cosmetology_school_leads").select([...SHARED_COLUMNS, ...BARBER_EXAM_COLUMNS].join(", ")).not("written_test_takers_2026", "is", null),
    supabase.from("agent_cosmetology_school_leads").select([...SHARED_COLUMNS, ...COSMETOLOGY_EXAM_COLUMNS].join(", ")).not("cosmetology_written_test_takers_2026", "is", null),
    supabase.from("agent_barber_school_leads").select([...SHARED_COLUMNS, ...COSMETOLOGY_EXAM_COLUMNS].join(", ")).not("cosmetology_written_test_takers_2026", "is", null),
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

export const metadata: Metadata = {
  title: "Texas Barber & Cosmetology School Leaderboard (2026) — Inner G Complete",
  description: "Compare Texas barber and cosmetology schools by real 2026 Class A licensing exam outcomes — pass rates, first-attempt success, and retest burden. Data not available on Google.",
  keywords: [
    "texas barber school leaderboard",
    "best barber schools in texas",
    "best cosmetology schools in texas",
    "texas barber school pass rates",
    "texas cosmetology school pass rates",
    "compare barber schools texas",
  ],
  openGraph: {
    title: "Texas Barber & Cosmetology School Leaderboard (2026)",
    description: "Compare Texas barber and cosmetology schools by real 2026 Class A licensing exam outcomes — data not available on Google.",
    url: "https://agency.innergcomplete.com/texas-school-leaderboard",
    type: "website",
  },
  alternates: { canonical: "https://agency.innergcomplete.com/texas-school-leaderboard" },
};

export default async function SchoolLeaderboardPage() {
  const { barber, cosmetology } = await getLeaderboardData();

  // Real top-ranked schools already fetched above — ItemList only needs a
  // representative top slice per schema.org convention, not every row.
  const topRanked = [...barber, ...cosmetology]
    .filter((s) => s.school_leaderboard_score_2026 != null)
    .sort((a, b) => (b.school_leaderboard_score_2026 || 0) - (a.school_leaderboard_score_2026 || 0))
    .slice(0, 10);
  const leaderboardJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Texas Barber & Cosmetology School Leaderboard",
    itemListElement: topRanked.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "EducationalOrganization",
        name: s.school_name,
        url: `https://agency.innergcomplete.com/schools/${s.slug}`,
        ...(s.city ? { address: { "@type": "PostalAddress", addressLocality: s.city, addressRegion: "TX" } } : {}),
      },
    })),
  };

  return (
    <div className="min-h-screen light bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(leaderboardJsonLd) }} />
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-10">

        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            Texas Barber &amp; Cosmetology School Leaderboard
          </h1>
          <p className="text-slate-600">
            Ranked using real 2026 Texas Class A licensing exam outcomes — not just a pass rate, but how well each
            school prepares students to pass on their <em>first</em> try. This data isn&apos;t available on Google.
          </p>
        </div>

        <LeaderboardTable barberSchools={barber} cosmetologySchools={cosmetology} />
      </div>
    </div>
  );
}
