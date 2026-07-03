import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { LeaderboardTable } from "./leaderboard-table";

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const COLUMNS = [
  "id",
  "school_name",
  "city",
  "rating",
  "google_review_count",
  "accreditation_status",
  "annual_tuition",
  "written_pass_rate_2026",
  "written_test_takers_2026",
  "practical_pass_rate_2026",
  "practical_test_takers_2026",
  "written_first_attempt_pass_rate_2026",
  "written_avg_attempts_to_pass_2026",
  "school_leaderboard_score_2026",
].join(", ");

export interface LeaderboardSchool {
  id: string;
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

async function getLeaderboardData() {
  const [{ data: barberSchools }, { data: cosmetSchools }] = await Promise.all([
    supabase
      .from("agent_barber_school_leads")
      .select(COLUMNS)
      .not("written_test_takers_2026", "is", null),
    supabase
      .from("agent_cosmetology_school_leads")
      .select(COLUMNS)
      .not("written_test_takers_2026", "is", null),
  ]);

  const barber: LeaderboardSchool[] = (barberSchools || []).map((s: any) => ({ ...s, license_type: "barber" }));
  const cosmetology: LeaderboardSchool[] = (cosmetSchools || []).map((s: any) => ({ ...s, license_type: "cosmetology" }));

  return { barber, cosmetology };
}

export const metadata: Metadata = {
  title: "Texas Barber & Cosmetology School Leaderboard (2026) — Inner G Complete",
  description: "Compare Texas barber and cosmetology schools by real 2026 Class A licensing exam outcomes — pass rates, first-attempt success, and retest burden. Data not available on Google.",
};

export default async function SchoolLeaderboardPage() {
  const { barber, cosmetology } = await getLeaderboardData();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
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
