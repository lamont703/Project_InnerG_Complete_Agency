import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { TrendingUp, CheckCircle2, RefreshCw, MapPin } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const MIN_SAMPLE_SIZE = 5; // don't rank a school on 1–4 first-time test-takers
const PERIOD = "Q1 2026";

// The four license programs the BBC's school file reports, in the order we
// surface them (barber + cosmetology are the site's core; esthetics +
// manicuring are bonus coverage Texas doesn't have).
const LICENSES: { key: string; label: string }[] = [
  { key: "cosmetology", label: "Cosmetology" },
  { key: "barber", label: "Barber" },
  { key: "esthetics", label: "Esthetics" },
  { key: "manicuring", label: "Manicuring" },
];

interface StatRow {
  source_school_name: string;
  source_city: string | null;
  license_type: string;
  pass_count: number | null;
  test_takers: number | null;
  pass_rate: number | null;
  school_id: string | null;
  school_type: string | null;
}

async function fetchAll(): Promise<StatRow[]> {
  let out: StatRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("school_exam_stats")
      .select("source_school_name, source_city, license_type, pass_count, test_takers, pass_rate, school_id, school_type")
      .eq("state", "CA")
      .eq("program_path", "school")
      .range(from, from + 999);
    if (error || !data) break;
    out = out.concat(data as StatRow[]);
    if (data.length < 1000) break;
    from += 1000;
  }
  return out;
}

// Slugs for the (few) rows already linked to a real entity, so those schools
// link to their profile page; the rest render as plain text until seeded.
async function fetchSlugs(rows: StatRow[]): Promise<Map<string, string>> {
  const barberIds = [...new Set(rows.filter((r) => r.school_id && r.school_type === "barber").map((r) => r.school_id!))];
  const cosmetIds = [...new Set(rows.filter((r) => r.school_id && r.school_type === "cosmetology").map((r) => r.school_id!))];
  const map = new Map<string, string>();
  const grab = async (table: string, ids: string[]) => {
    if (ids.length === 0) return;
    const { data } = await supabase.from(table).select("id, slug").in("id", ids);
    (data || []).forEach((s: any) => map.set(s.id, s.slug));
  };
  await Promise.all([grab("agent_barber_school_leads", barberIds), grab("agent_cosmetology_school_leads", cosmetIds)]);
  return map;
}

function pct(v: number | null) {
  return v != null ? `${Math.round(v * 100)}%` : "—";
}
function rateColor(v: number | null) {
  if (v == null) return "text-slate-500";
  if (v >= 0.85) return "text-green-600";
  if (v >= 0.7) return "text-amber-600";
  return "text-red-600";
}

export default async function CaliforniaSchoolLeaderboardPage() {
  const rows = await fetchAll();
  const slugById = await fetchSlugs(rows);

  const byLicense: Record<string, StatRow[]> = {};
  for (const r of rows) {
    if ((r.test_takers ?? 0) < MIN_SAMPLE_SIZE) continue;
    (byLicense[r.license_type] = byLicense[r.license_type] || []).push(r);
  }
  for (const k of Object.keys(byLicense)) {
    byLicense[k].sort((a, b) => (b.pass_rate ?? 0) - (a.pass_rate ?? 0) || (b.test_takers ?? 0) - (a.test_takers ?? 0));
  }

  const totalTakers = rows.reduce((s, r) => s + (r.test_takers ?? 0), 0);

  const jsonLd = graph(
            {
            "@type": "Dataset",
            "@id": `${SITE_URL}/california-school-leaderboard#dataset`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
    name: "California Cosmetology & Barber School Pass Rates (2026 State Board)",
    description:
      "First-time written state board exam pass rates by California school, from the California Board of Barbering & Cosmetology, Q1 2026.",
    creator: { "@type": "Organization", name: "California Board of Barbering & Cosmetology" },
  },
          );

  return (
    <div className="min-h-screen light bg-slate-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-10 sm:pb-16">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
            <MapPin className="w-3 h-3" />
            Real CA BBC Data — {PERIOD}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-3">
            California Cosmetology &amp; Barber School Pass Rates
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Real 2026 California state board outcomes, ranked by school — the share of each school&apos;s
            <strong> first-time written exam</strong> takers who passed, straight from the California Board of
            Barbering &amp; Cosmetology. Based on {totalTakers.toLocaleString()} test-takers in {PERIOD}. Not
            available on Google.
          </p>
        </div>

        {LICENSES.map(({ key, label }) => {
          const list = byLicense[key] || [];
          if (list.length === 0) return null;
          return (
            <div key={key} className="mb-12">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Top California {label} Schools by First-Time Written Pass Rate
              </h2>
              <p className="text-xs text-slate-400 font-medium mb-4">
                {list.length} schools with at least {MIN_SAMPLE_SIZE} first-time written test-takers in {PERIOD}.
              </p>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="px-4 py-3 font-bold">#</th>
                      <th className="px-4 py-3 font-bold">School</th>
                      <th className="px-4 py-3 font-bold text-right">Pass Rate</th>
                      <th className="px-4 py-3 font-bold text-right">Passed / Tested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.slice(0, 25).map((s, i) => {
                      const slug = s.school_id ? slugById.get(s.school_id) : null;
                      const name = (s.source_school_name || "").replace(/\b\w/g, (c) => c.toUpperCase());
                      const city = (s.source_city || "").replace(/\b\w/g, (c) => c.toUpperCase());
                      return (
                        <tr key={`${s.source_school_name}-${s.source_city}`} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-3 text-slate-400 font-bold">{i + 1}</td>
                          <td className="px-4 py-3">
                            {slug ? (
                              <Link href={`/schools/${slug}`} className="font-bold text-slate-900 hover:text-indigo-600">{name}</Link>
                            ) : (
                              <span className="font-bold text-slate-900">{name}</span>
                            )}
                            {city && <span className="text-slate-400 font-medium"> — {city}</span>}
                          </td>
                          <td className={`px-4 py-3 text-right font-black ${rateColor(s.pass_rate)}`}>{pct(s.pass_rate)}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{s.pass_count} / {s.test_takers}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        <div className="border-t border-slate-200 pt-8 text-sm text-slate-600 space-y-2">
          <p>
            <strong>What this measures:</strong> the first-time written state board pass rate — the share of a
            school&apos;s candidates who passed the California written exam on their first attempt, per the CA BBC&apos;s
            {" "}{PERIOD} report. It does not include the practical exam or retakes.
          </p>
          <p className="text-slate-400 text-xs">
            California is a different regulator and exam than Texas — these numbers are not directly comparable to
            our{" "}
            <Link href="/texas-school-leaderboard" className="text-indigo-600 font-bold hover:underline">Texas School Leaderboard</Link>.
          </p>
        </div>

        <div className="flex items-center gap-2 justify-center mt-12 text-xs text-slate-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          Pass-rate data from the California Board of Barbering &amp; Cosmetology, {PERIOD}
          <RefreshCw className="w-3.5 h-3.5 text-slate-300" />
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
