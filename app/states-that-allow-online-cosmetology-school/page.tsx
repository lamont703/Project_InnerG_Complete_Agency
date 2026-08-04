import Link from "next/link";
import { AlertTriangle, ExternalLink, CheckCircle2, XCircle, HelpCircle, Calendar, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import {
  STATE_RULES,
  VERIFIED_RULES,
  RULE_CHANGES,
  NACCAS_POLICY,
  US_STATE_COUNT,
  VERIFIED_ON,
  type StateDistanceRule,
} from "@/lib/distance-education-states";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";

/**
 * The state-by-state matrix — the hub of the distance-education cluster.
 *
 * SLUG CHOSEN FROM THE QUERY, NOT THE TOPIC. "which states allow online
 * cosmetology school" is how this gets asked; "distance education by state" is
 * how a regulator would file it. The URL takes the former.
 *
 * DELIBERATELY NOT FIFTY PAGES. A page per state is fifty near-identical
 * regulatory documents, which is the scaled-content pattern turned on
 * ourselves — the same reasoning that kept the reciprocity work to one TX↔CA
 * page instead of 2,450 state pairs. One matrix, spokes only where we hold real
 * market data.
 *
 * DELIBERATELY NOT FIFTY ROWS OF DATA EITHER. Every competing table states a
 * confident figure for all fifty states, and nobody has read fifty states'
 * regulations. Ours shows what has been verified, names the document, and marks
 * the rest unverified. That is the differentiator, not a limitation — it is
 * also the only version that holds up when a school owner checks.
 */

const TITLE = "Which States Allow Online Cosmetology & Barber School? (2026)";
const DESCRIPTION =
  "No US state lets you finish cosmetology or barber school online. Texas and Alabama cap distance education at 50%; California permits none at all. Verified against each regulator.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "which states allow online cosmetology school",
    "online cosmetology school by state",
    "states that allow distance learning cosmetology",
    "online barber school by state",
    "can you do cosmetology school online",
    "distance education cosmetology hours by state",
    "hybrid cosmetology school states",
    "online cosmetology hours transfer states",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: {
    canonical: "https://agency.innergcomplete.com/states-that-allow-online-cosmetology-school",
  },
};

const FAQS = [
  {
    q: "Which states allow online cosmetology school?",
    a: "No state allows a cosmetology programme to be completed entirely online, because the practical curriculum cannot be delivered at a distance anywhere we have verified. Among states we have read directly: Texas allows distance education for up to 50% of total course hours, Alabama allows up to 50% effective 15 May 2026, and Pennsylvania allows up to 650 hours but only for Career and Technical Center students. California allows none — its 164-page Act and Regulations contains no distance education provision at all.",
  },
  {
    q: "Can you get a cosmetology license entirely online?",
    a: "No. Every state we have verified requires the practical portion of the curriculum to be completed in person, and the state practical examination tests exactly that portion. Distance education covers theory only. Any school advertising a fully online cosmetology or barber licence is describing something no verified state regulator permits.",
  },
  {
    q: "Does California allow online cosmetology school?",
    a: "No. We searched the full text of the California Barbering and Cosmetology Act and Regulations, revised 2026 — 164 pages — and it contains zero mentions of distance learning, distance education, remote instruction or correspondence instruction. The only occurrence of the word \"online\" refers to the Board's own pre-apprentice training programme, which is not course hours toward a licence.",
  },
  {
    q: "Will my online cosmetology hours transfer to another state?",
    a: "Possibly not, and the accreditor requires schools to warn you about this before you enrol. NACCAS Policy VI.02 obliges an institution to give every student a signed, dated disclaimer that academic achievement earned via distance education may not be accepted for reciprocity or eligible for licensure in other states. Alabama's 2026 rule restates that requirement almost word for word. If you expect to move states, treat your distance hours as the part of your training most at risk.",
  },
  {
    q: "How many hours of cosmetology school can be done online in Texas?",
    a: "Up to 500 of the 1,000 hours for a Cosmetology Operator or Class A Barber course — 50% of total course hours, theory only, under 16 TAC §83.202(e)(1). The specialty courses scale identically: 375 of 750 for esthetician, 300 of 600 for manicurist, 160 of 320 for eyelash extension, 150 of 300 for hair weaving.",
  },
  {
    q: "Is there a national rule for online beauty school hours?",
    a: "Not for the percentage. NACCAS, the accreditor for most career beauty schools, sets requirements in Policy VI.02 — but that policy contains no percentage cap. It requires measurable instructor-validated participation, all GPA-bearing assessments taken physically on campus, attendance on campus at least once every 10 business days, distance hours identified separately on transcripts, and the signed reciprocity disclaimer. The percentage caps are set by each state independently, which is why they differ.",
  },
  {
    q: "Why do Texas and Alabama both use 50%?",
    a: "They arrived at it independently — neither rule cites the other, and the accreditor's policy does not specify a percentage. Alabama's 2026 amendment does require compliance with NACCAS Policy VI.02, so the accreditation standard is clearly propagating between states even though the number itself is set at state level.",
  },
];

function StatusCell({ rule }: { rule: StateDistanceRule }) {
  if (rule.verification === "unverified") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500">
        <HelpCircle className="h-3.5 w-3.5" />
        Not yet verified
      </span>
    );
  }
  if (rule.permitted === false) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-rose-700">
        <XCircle className="h-3.5 w-3.5" />
        Not permitted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-black text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {rule.percentCap !== null ? `${rule.percentCap}% of hours` : `${rule.hourCap?.toLocaleString()} hours`}
    </span>
  );
}

export default function StatesOnlineCosmetologySchoolPage() {
  const permitted = VERIFIED_RULES.filter((s) => s.permitted === true).length;
  const notPermitted = VERIFIED_RULES.filter((s) => s.permitted === false).length;

  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          Distance education &middot; State by state
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          Which States Allow Online Cosmetology &amp; Barber School?
        </h1>

        <ResearchByline verifiedOn={VERIFIED_ON} what="Researched and verified" />

        <p className="mb-8 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
          <strong className="text-slate-900">None of them, if you mean finishing a programme online.</strong>{" "}
          Every state we have verified permits distance education for theory only and requires the
          practical curriculum in person. What differs between states is how much of the theory can
          be remote &mdash; and in California, whether it is allowed at all.
        </p>

        {/* The honesty statement, above the table rather than buried under it. */}
        <div className="mb-10 rounded-2xl border border-slate-300 bg-slate-50 px-6 py-5">
          <p className="text-sm leading-relaxed text-slate-700">
            <strong className="text-slate-900">
              We publish {VERIFIED_RULES.length} of {US_STATE_COUNT} states, not {US_STATE_COUNT}.
            </strong>{" "}
            Every other table on this subject states a confident figure for all fifty. Nobody has
            read fifty state boards&apos; regulations, so most of those numbers are copied between
            sites and some are wrong. Each row below names the document it came from. Where we
            have not read a primary source, the row says so and shows no number.
          </p>
        </div>

        {/* ---- The matrix ---------------------------------------------------- */}
        <section className="mb-12">
          <div className="mb-5 flex flex-wrap gap-3">
            {[
              { n: permitted, label: "verified as permitting it", tone: "text-emerald-700" },
              { n: notPermitted, label: "verified as not permitting it", tone: "text-rose-700" },
              { n: US_STATE_COUNT - VERIFIED_RULES.length, label: "not yet verified", tone: "text-slate-500" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                <span className={`text-lg font-black tabular-nums ${s.tone}`}>{s.n}</span>
                <span className="ml-2 text-xs font-semibold text-slate-500">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[760px] border-collapse bg-white">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">State</th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Distance education allowed</th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Rule</th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">What we read</th>
                </tr>
              </thead>
              <tbody>
                {STATE_RULES.map((rule) => (
                  <tr key={rule.code} className="border-b border-slate-100 last:border-0 align-top">
                    <td className="px-5 py-4">
                      <span className="text-sm font-black text-slate-900">{rule.name}</span>
                      {rule.effective ? (
                        <span className="mt-0.5 block text-xs font-semibold text-indigo-600">
                          eff. {rule.effective}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      <StatusCell rule={rule} />
                    </td>
                    <td className="px-5 py-4 text-xs leading-relaxed text-slate-500">
                      {rule.citation || "—"}
                    </td>
                    <td className="px-5 py-4">
                      {rule.sourceUrl ? (
                        <a
                          href={rule.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-start gap-1 text-xs font-bold text-indigo-600 hover:underline"
                        >
                          {rule.sourceLabel}
                          <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">
                          no primary source read
                        </span>
                      )}
                      {rule.note ? (
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{rule.note}</p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- The reciprocity trap ------------------------------------------ */}
        <section className="mb-12 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-amber-900">
            <AlertTriangle className="h-4.5 w-4.5" />
            Your online hours are the part most likely not to transfer
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-amber-900/90">
            NACCAS requires a school to hand every student, before enrolment, a signed and dated
            disclaimer that &ldquo;academic achievement earned via distance education may not be
            accepted for reciprocity or eligible for licensure in other states.&rdquo; Alabama&apos;s
            2026 rule restates it almost word for word.
          </p>
          <p className="text-sm leading-relaxed text-amber-900/90">
            That matters most in exactly the direction people move. California recognises no distance
            education at all &mdash; so 500 remote Texas hours arrive in a state whose regulations do
            not contemplate them.{" "}
            <Link href="/texas-california-license-reciprocity" className="font-black underline">
              What actually happens moving between Texas and California
            </Link>
            .
          </p>
        </section>

        {/* ---- Rule change tracker ------------------------------------------- */}
        <section className="mb-12">
          <h2 className="mb-1 flex items-center gap-2 text-xl font-black text-slate-900">
            <Calendar className="h-4.5 w-4.5 text-indigo-600" />
            Rule changes we have logged
          </h2>
          <p className="mb-5 max-w-3xl text-sm font-medium text-slate-500">
            Only changes with a dated primary source are listed. The whole value of a change log is
            being right about the dates.
          </p>
          <div className="space-y-3">
            {RULE_CHANGES.map((c) => (
              <div key={`${c.state}-${c.date}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-1 flex flex-wrap items-baseline gap-3">
                  <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-black tabular-nums text-white">
                    {c.date}
                  </span>
                  <span className="text-sm font-black text-slate-900">{c.summary}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.detail}</p>
                <a
                  href={c.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                >
                  Source
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Spokes -------------------------------------------------------- */}
        <section className="mb-12">
          <h2 className="mb-1 text-xl font-black text-slate-900">Go deeper</h2>
          <p className="mb-5 max-w-3xl text-sm font-medium text-slate-500">
            State detail pages exist only where we hold real market data, rather than one page per
            state repeating the same paragraph.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                href: "/texas-online-barber-cosmetology-school-guide",
                label: "Texas: the full rules",
                why: "Max online hours for all six licence types, the five duties TDLR places on schools, and how to check a school's approval.",
              },
              {
                href: "/naccas-distance-education-requirements",
                label: "For school owners: NACCAS VI.02",
                why: "The five accreditation requirements in full, and what each one demands of your systems.",
              },
              {
                href: "/texas-california-license-reciprocity",
                label: "Texas ↔ California reciprocity",
                why: "Neither state grants it, and California recognises no distance hours at all.",
              },
              {
                href: "/texas-school-leaderboard",
                label: "Texas school leaderboard",
                why: "2026 written and practical pass rates — the outcome that matters more than delivery format.",
              },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">{l.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{l.why}</span>
                </span>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
              </Link>
            ))}
          </div>
        </section>

        <div className="mb-12 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          Sources read in full on {VERIFIED_ON}: each regulator&apos;s own rule text or official
          page, plus {NACCAS_POLICY.id} ({NACCAS_POLICY.version}). Rules change &mdash; Alabama&apos;s
          took effect three months before this was written &mdash; so confirm with the state board
          before relying on any figure here.
        </div>

        <div className="border-t border-slate-200 pt-10">
          <h2 className="mb-6 text-xl font-black text-slate-900">Common Questions</h2>
          <div className="space-y-6">
            {FAQS.map((faq) => (
              <div key={faq.q}>
                <h3 className="mb-1.5 text-sm font-black text-slate-900">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            author: authorSchema(),
            headline: TITLE,
            description: DESCRIPTION,
            dateModified: VERIFIED_ON,
            about: {
              "@type": "Thing",
              name: "Distance education rules for cosmetology and barbering licensure by US state",
            },
            citation: STATE_RULES.filter((s) => s.sourceUrl).map((s) => ({
              "@type": "CreativeWork",
              name: `${s.name} — ${s.sourceLabel}`,
              url: s.sourceUrl,
            })),
          }),
        }}
      />
    </div>
  );
}
