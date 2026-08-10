import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { TrendingUp, CheckCircle2, GraduationCap, ArrowRight, MapPin, BookOpen } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, ref, webPageNode } from "@/lib/schema-graph";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const MIN_SAMPLE = 5;
const PERIOD = "Q1 2026";
const AUTHORITY = "California Board of Barbering & Cosmetology";

type Variant = "barber" | "cosmetology";

interface StatRow {
  source_school_name: string;
  source_city: string | null;
  pass_count: number | null;
  test_takers: number | null;
  pass_rate: number | null;
  school_id: string | null;
  school_type: string | null;
}

async function fetchCaStats(variant: Variant) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  let rows: StatRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("school_exam_stats")
      .select("source_school_name, source_city, pass_count, test_takers, pass_rate, school_id, school_type")
      .eq("state", "CA")
      .eq("program_path", "school")
      .eq("license_type", variant)
      .range(from, from + 999);
    if (error || !data) break;
    rows = rows.concat(data as StatRow[]);
    if (data.length < 1000) break;
    from += 1000;
  }

  const takers = rows.reduce((s, r) => s + (r.test_takers ?? 0), 0);
  const pass = rows.reduce((s, r) => s + (r.pass_count ?? 0), 0);
  const statewideRate = takers > 0 ? pass / takers : null;

  const ranked = rows
    .filter((r) => (r.test_takers ?? 0) >= MIN_SAMPLE && r.pass_rate != null)
    .sort((a, b) => (b.pass_rate ?? 0) - (a.pass_rate ?? 0) || (b.test_takers ?? 0) - (a.test_takers ?? 0));

  // Slugs for any ranked school already linked to an entity → link to profile.
  const linkedType = variant === "barber" ? "barber" : "cosmetology";
  const ids = [...new Set(ranked.filter((r) => r.school_id && r.school_type === linkedType).map((r) => r.school_id!))];
  const slugById = new Map<string, string>();
  if (ids.length) {
    const table = variant === "barber" ? "agent_barber_school_leads" : "agent_cosmetology_school_leads";
    const { data } = await supabase.from(table).select("id, slug").in("id", ids);
    (data || []).forEach((s: any) => slugById.set(s.id, s.slug));
  }

  return { schoolCount: rows.length, takers, statewideRate, top: ranked.slice(0, 5), slugById };
}

function pct(v: number | null) {
  return v != null ? `${Math.round(v * 100)}%` : "—";
}
function titleCase(s: string) {
  return (s || "").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function CaliforniaExamPrep({ variant }: { variant: Variant }) {
  const { schoolCount, takers, statewideRate, top, slugById } = await fetchCaStats(variant);
  const licenseLabel = variant === "barber" ? "Barber" : "Cosmetology";
  const examWord = variant === "barber" ? "barber" : "cosmetology";

  const faqs = [
    {
      q: `What is the first-time pass rate for the California ${examWord} written exam?`,
      a: statewideRate != null
        ? `Across the ${schoolCount} California ${examWord} schools we track, the first-time written pass rate is ${pct(statewideRate)}, based on ${takers.toLocaleString()} first-time test-takers reported by the ${AUTHORITY} in ${PERIOD}.`
        : `The ${AUTHORITY} reports first-time written pass rates by school each quarter; see the California ${licenseLabel} leaderboard for the latest.`,
    },
    {
      q: `Who administers the California ${examWord} licensing exam?`,
      a: `The ${AUTHORITY} (BBC) sets and reports the California ${examWord} state board exam — a different regulator and a different exam than Texas, so Texas benchmarks don't transfer.`,
    },
    {
      q: `Where can I see how my California ${examWord} school ranks?`,
      a: `Our California ${licenseLabel} School Pass-Rate Leaderboard ranks schools by their real first-time written pass rate — data that isn't available on Google.`,
    },
  ];

  // The route this variant renders on. Passed nowhere — it is derivable from
  // the variant, and the two call sites are the only two that exist.
  const path = `/california-${variant}-exam-intelligence-prep`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      webPageNode({
        path,
        name: `California ${licenseLabel} Exam Intelligence Prep`,
        primaryEntityId: `${SITE_URL}${path}#dataset`,
      }),
      {
        "@type": "Dataset",
        "@id": `${SITE_URL}${path}#dataset`,
        isPartOf: ref(WEBSITE_ID),
        publisher: ref(ORG_ID),
        name: `California ${licenseLabel} School First-Time Written Pass Rates (${PERIOD})`,
        description: `First-time written state board pass rates for California ${examWord} schools, from the ${AUTHORITY}.`,
        creator: { "@type": "Organization", name: AUTHORITY },
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}${path}#faq`,
        isPartOf: ref(WEBSITE_ID),
        about: { "@id": `${SITE_URL}${path}#dataset` },
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen light bg-slate-50">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 pt-28 pb-16 lg:pt-32 lg:pb-24 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-400/20 rounded-full px-3 py-1 mb-5">
            <MapPin className="w-3 h-3" />
            Real CA BBC Data — {PERIOD}
          </span>
          <h1 className="text-4xl sm:text-6xl font-black leading-[0.95] tracking-tighter uppercase italic text-white mb-5">
            California {licenseLabel}<br />Exam Intelligence Prep
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-8">
            Real 2026 first-time written pass rates from the {AUTHORITY}, ranked by school — so California{" "}
            {examWord} students know exactly where they stand before exam day. Not available on Google.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/california-school-leaderboard"
              data-ig-click="exam_prep_cta"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm uppercase tracking-wider px-6 py-3.5 transition-colors shadow-lg shadow-indigo-600/30"
            >
              <TrendingUp className="w-4 h-4" />
              See the California {licenseLabel} Leaderboard
            </Link>
            <Link
              href={variant === "barber" ? "/directory/barber-schools" : "/directory/cosmetology-schools"}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-900 font-bold text-sm uppercase tracking-wider px-6 py-3.5 transition-colors"
            >
              Browse Schools
            </Link>
          </div>
        </div>
      </section>

      {/* Stat band */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl sm:text-4xl font-black text-red-600">{pct(statewideRate)}</div>
            <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 mt-1">
              First-Time Written Pass Rate
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black text-slate-900">{schoolCount.toLocaleString()}</div>
            <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 mt-1">
              CA {licenseLabel} Schools Tracked
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black text-slate-900">{takers.toLocaleString()}</div>
            <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 mt-1">
              First-Time Test-Takers
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 space-y-14">
        {/* The gap */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-slate-950 mb-4">
            The first-time written exam is where California {examWord} students lose time
          </h2>
          <p className="text-slate-600 leading-relaxed">
            {statewideRate != null ? (
              <>
                Only <strong>{pct(statewideRate)}</strong> of California {examWord} candidates pass the {AUTHORITY}{" "}
                written exam on their first attempt ({takers.toLocaleString()} first-time test-takers, {PERIOD}). Every
                retake is more time and money before licensure — and the gap varies enormously by school. We surface the
                real per-school numbers so students and schools can act on them instead of guessing.
              </>
            ) : (
              <>
                The {AUTHORITY} reports first-time written pass rates by school. We normalize them into a ranked,
                per-school view so California {examWord} students and schools can see exactly where they stand.
              </>
            )}
          </p>
        </section>

        {/* Top schools preview */}
        {top.length > 0 && (
          <section>
            <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-slate-950 mb-1">
              Top California {licenseLabel} Schools by First-Time Written Pass Rate
            </h2>
            <p className="text-xs text-slate-400 font-medium mb-5">
              Schools with at least {MIN_SAMPLE} first-time written test-takers in {PERIOD}.
            </p>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100 overflow-hidden">
              {top.map((s, i) => {
                const slug = s.school_id ? slugById.get(s.school_id) : null;
                const name = titleCase(s.source_school_name);
                const city = titleCase(s.source_city || "");
                return (
                  <div key={`${s.source_school_name}-${s.source_city}`} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-xs font-black text-slate-300 w-6 tabular-nums">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      {slug ? (
                        <Link href={`/schools/${slug}`} className="font-bold text-slate-900 text-sm hover:text-indigo-600">{name}</Link>
                      ) : (
                        <span className="font-bold text-slate-900 text-sm">{name}</span>
                      )}
                      {city && <span className="text-slate-400 font-medium text-xs"> — {city}</span>}
                    </div>
                    <span className="font-black text-green-600 text-sm tabular-nums">{pct(s.pass_rate)}</span>
                  </div>
                );
              })}
            </div>
            <Link
              href="/california-school-leaderboard"
              className="inline-flex items-center gap-1 mt-4 text-sm font-bold text-indigo-600 hover:text-indigo-800"
            >
              See the full California {licenseLabel} leaderboard <ArrowRight className="w-4 h-4" />
            </Link>
          </section>
        )}

        {/* What the CA exam is */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-black text-slate-950 flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            California is a different exam than Texas
          </h2>
          <p className="text-slate-600 leading-relaxed text-sm">
            The {AUTHORITY} (BBC) administers and reports California&apos;s {examWord} licensing exam — a different
            regulator, format, and passing standard than the Texas TDLR exam. That&apos;s why we built California its own
            pass-rate intelligence instead of reusing Texas benchmarks. The numbers here are the BBC&apos;s own
            first-time written results for {PERIOD}.
          </p>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-950 mb-5">FAQ</h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <p className="font-black text-slate-900 mb-1.5">{f.q}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="text-center bg-slate-950 rounded-2xl px-6 py-12">
          <GraduationCap className="w-8 h-8 text-indigo-400 mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-white mb-3">
            Know your school&apos;s real pass rate
          </h2>
          <p className="text-slate-300 text-sm max-w-xl mx-auto mb-6">
            See where every California {examWord} school ranks on first-time written pass rate — then find the right
            program in our directory.
          </p>
          <Link
            href="/california-school-leaderboard"
            data-ig-click="exam_prep_cta"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm uppercase tracking-wider px-6 py-3.5 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            Open the California {licenseLabel} Leaderboard
          </Link>
        </section>

        <div className="flex items-center gap-2 justify-center text-xs text-slate-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          Pass-rate data from the {AUTHORITY}, {PERIOD}
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
