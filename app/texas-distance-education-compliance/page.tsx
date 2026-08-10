import Link from "next/link";
import { AlertTriangle, ExternalLink, ArrowRight, ClipboardCheck, Building2, Monitor } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";
import { SHEARS, SHEARS_RULES, COURSE_CAPS, OBLIGATIONS, VERIFIED_ON } from "@/lib/tdlr-shears";
import { DistanceEducationCta } from "@/components/distance-education-cta";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";

/**
 * What distance education requires that in-person compliance software does not
 * cover — written for school owners and compliance directors, not students.
 *
 * WHY THIS PAGE EXISTS AND THE OTHERS DON'T COVER IT. Searching "texas online
 * barber school compliance system" returns TDLR's own pages, one school's blog
 * post, and two 2021-dated listicles that predate distance education being
 * legal. Google flags "Missing: online" on three results — it could not find
 * the word. The category has software (Prestige SIS, STARS) built for
 * traditional in-person operations; checking Prestige's own compliance page
 * turns up no mention of distance education, remote hours, hour separation or
 * the 10-business-day rule. Nobody has written this.
 *
 * THE FINDING THAT CARRIES IT. Every published account of the Texas cap says
 * "50% of course hours". The SHEARS manual splits that into 350 hours inside
 * the core 700 and 150 inside the specialty 300 — two ceilings, not one. A
 * school at exactly 50% overall can be in violation, and no percentage-based
 * tracker would notice. That is a fact with a licence attached to it, which is
 * why this doubles as a sales document.
 */

const TITLE = "Texas Distance Education Compliance for Barber & Cosmetology Schools";
const DESCRIPTION =
  "The 50% cap is really two caps — 350 core hours and 150 specialty. What SHEARS and NACCAS require of a school offering distance education, and why in-person systems miss it.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "texas distance education compliance",
    "shears distance education hours",
    "how to report distance education hours texas",
    "tdlr distance education reporting",
    "naccas distance education compliance",
    "cosmetology school compliance software distance education",
    "barber school compliance system texas",
    "shears manual distance learning",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: {
    canonical: `${SITE_URL}/texas-distance-education-compliance`,
  },
};

const FAQS = [
  {
    q: "How many distance education hours can a Texas school report?",
    a: "Not simply half the course. TDLR's SHEARS manual sets two separate ceilings for the 1,000-hour Class A Barber and Cosmetology Operator courses: no more than 350 distance hours inside the first 700 hours, which are assigned to the core permit, and no more than 150 inside the 300 specialty hours. They total 500 — the same as the 50% in 16 TAC §83.202(e)(1) — but they must each hold independently. A school running 500 distance hours entirely within the core 700 is at 50% overall and in violation.",
  },
  {
    q: "Can distance education hours be entered as classroom hours in SHEARS?",
    a: "No, and the manual capitalises the instruction: \"DO NOT ENTER DISTANCE EDUCATION HOURS UNDER CLASSROOM HOURS.\" Once filed as classroom hours the distinction is unrecoverable from the filing, which also makes the transcript NACCAS requires — distance component identified separately — impossible to produce accurately.",
  },
  {
    q: "How often must Texas schools report student hours?",
    a: "Monthly, for clock-hour schools. The manual states the system opens in the first week of each month for the previous month's hours. There is also a hard ceiling of 184 hours per student per month, which is what catches a school trying to back-fill a term's hours in one filing.",
  },
  {
    q: "Does my school's distance education limit come from the rule or from TDLR?",
    a: "From your certificate of approval. The manual says approved distance education hours can be found there, and that you cannot enter distance hours at all until approved. Approval is granted per course via a new curriculum course application. A school approved for 200 distance hours is capped at 200 regardless of what the statute permits — compliance is measured against the certificate, not the rule.",
  },
  {
    q: "What does NACCAS require beyond the Texas hour rules?",
    a: "Policy VI.02 adds five obligations that stack on top: instructor interaction validated by measurable participation, all GPA-bearing assessments taken physically on campus, the student on campus at least once every 10 business days for a full scheduled class day, distance hours identified on every transcript, and a signed dated disclaimer in each student file warning that distance hours may not transfer to another state. You meet the stricter of the two authorities on every dimension.",
  },
  {
    q: "Why doesn't our existing school management software handle this?",
    a: "Because it was built for schools where every hour is the same kind of hour. In-person systems have one hours field, one attendance method and one transcript format. Distance education splits the hour into two kinds with separate ceilings, adds a residency clock nobody computes, and requires an assessment location per graded item. Those aren't settings — they're a different data model.",
  },
];

export default function TexasDistanceEducationCompliancePage() {
  const dual = COURSE_CAPS.filter((c) => "core" in c && c.core);

  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          For school owners &amp; compliance directors
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          Texas Distance Education Compliance
        </h1>

        <ResearchByline verifiedOn={VERIFIED_ON} what="Read from TDLR's own manual and verified" />

        <p className="mb-8 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
          If you already run a compliant school, you already track hours, attendance and
          transcripts. Distance education does not add a setting to that &mdash; it adds{" "}
          <strong className="text-slate-900">eight obligations across two authorities</strong>, each
          evidenced per student, and the systems built for in-person schools do not carry them.
        </p>

        {/* ---- The finding ---------------------------------------------------- */}
        <div className="mb-12 rounded-2xl border border-amber-300 bg-amber-50 px-6 py-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-amber-900">
            <AlertTriangle className="h-4.5 w-4.5" />
            The 50% cap is really two caps, and that is where schools fail
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-amber-900/90">
            Every published account of the Texas limit &mdash; including the rule itself at 16 TAC
            &sect;83.202(e)(1) &mdash; states it as 50% of total course hours. TDLR&apos;s{" "}
            {SHEARS.manualVersion} SHEARS manual is stricter:
          </p>
          <div className="mb-4 space-y-2 rounded-xl bg-white/70 px-5 py-4 text-sm italic leading-relaxed text-amber-950">
            <p>
              &ldquo;A school may not not report more than <strong>350 hours of Distance
              Education</strong> or 70 hours of Field Trip within the first 700 hours of education,
              which are assigned to the CORE permit.&rdquo;
            </p>
            <p>
              &ldquo;The specialty permit may not have more than <strong>150 hours of Distance
              Education</strong> or 30 hours of Field Trip reported.&rdquo;
            </p>
          </div>
          <p className="text-sm leading-relaxed text-amber-900/90">
            350 + 150 = 500, so the totals agree. But they are{" "}
            <strong>two ceilings against two separate pools</strong>. A school running 500 distance
            hours entirely inside the core 700 sits at exactly 50% overall &mdash; and is in
            violation. Nothing that tracks a single percentage will catch it.
          </p>
        </div>

        {/* ---- Course caps ---------------------------------------------------- */}
        <section className="mb-12">
          <h2 className="mb-1 text-xl font-black text-slate-900">Your ceiling, by course</h2>
          <p className="mb-5 max-w-3xl text-sm font-medium text-slate-500">
            From the manual&apos;s own table. The two 1,000-hour courses carry the core/specialty
            split; the specialty courses have a single pool.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[620px] border-collapse bg-white">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Course</th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Total hrs</th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Max distance</th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Split</th>
                </tr>
              </thead>
              <tbody>
                {COURSE_CAPS.map((c) => (
                  <tr key={c.course} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3.5 text-sm font-bold text-slate-900">{c.course}</td>
                    <td className="px-5 py-3.5 text-sm font-black tabular-nums text-slate-900">{c.total.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-sm font-black tabular-nums text-emerald-700">{c.maxDistance}</td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-slate-500">
                      {"core" in c && c.core ? `350 in core ${c.core} · 150 in specialty ${c.specialty}` : "single pool"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            And your own limit may be lower. The manual: &ldquo;Approved distance education hours can
            be found on your certificate of approval.&rdquo; Compliance is measured against the
            certificate, not the statute.
          </p>
        </section>

        {/* ---- SHEARS mechanics ----------------------------------------------- */}
        <section className="mb-12">
          <h2 className="mb-1 flex items-center gap-2 text-xl font-black text-slate-900">
            <ClipboardCheck className="h-4.5 w-4.5 text-indigo-600" />
            What {SHEARS.name} requires, quoted
          </h2>
          <p className="mb-5 max-w-3xl text-sm font-medium text-slate-500">
            {SHEARS.name} is the {SHEARS.expands} &mdash; the system every licensed Texas school
            files hours through. These are from the {SHEARS.manualVersion} operations manual.
          </p>
          <div className="space-y-3">
            {SHEARS_RULES.map((r, i) => (
              <div key={r.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex gap-4">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-black text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900">{r.label}</p>
                    <p className="mt-1.5 border-l-2 border-slate-200 pl-3 text-sm italic leading-relaxed text-slate-600">
                      &ldquo;{r.quote}&rdquo;
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{r.why}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---- The combined obligation table ----------------------------------- */}
        <section className="mb-12">
          <h2 className="mb-1 text-xl font-black text-slate-900">
            The eight obligations, and why in-person systems miss them
          </h2>
          <p className="mb-5 max-w-3xl text-sm font-medium text-slate-500">
            A school does not experience TDLR and NACCAS as two problems, so these are ordered by
            how badly each fails when missing rather than by which body requires it.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[820px] border-collapse bg-white">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Requirement</th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Who</th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Evidence needed</th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Why it&apos;s missing today</th>
                </tr>
              </thead>
              <tbody>
                {OBLIGATIONS.map((o) => (
                  <tr key={o.requirement} className="border-b border-slate-100 align-top last:border-0">
                    <td className="px-5 py-4 text-sm font-bold text-slate-900">{o.requirement}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-block rounded-lg px-2 py-0.5 text-xs font-black ${o.authority === "TDLR" ? "bg-indigo-100 text-indigo-800" : o.authority === "NACCAS" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-800"}`}>
                        {o.authority}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs leading-relaxed text-slate-600">{o.evidence}</td>
                    <td className="px-5 py-4 text-xs leading-relaxed text-slate-500">{o.gap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- The test ------------------------------------------------------- */}
        <section className="mb-12 rounded-2xl border border-indigo-200 bg-indigo-50/60 px-6 py-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-indigo-900">
            <Monitor className="h-4.5 w-4.5" />
            Four questions that tell you where you stand
          </h2>
          <ol className="space-y-3 text-sm leading-relaxed text-indigo-900/90">
            <li>
              <strong>Can you show, right now, that no student has gone more than 10 business days
              without a full day on campus?</strong> That is NACCAS VI.02 element 3, and it is the
              one nothing computes.
            </li>
            <li>
              <strong>Are your distance hours inside the core 700 under 350 &mdash; separately from
              the specialty 300?</strong> Not the overall percentage. The two buckets.
            </li>
            <li>
              <strong>Is the method you verify distance hours with the same method you verify floor
              attendance with?</strong> A time clock plus a video-completion log is two methods.
            </li>
            <li>
              <strong>Can you produce a signed reciprocity disclaimer for every enrolled
              student?</strong> Having them filed is not the test; producing 100 on request is.
            </li>
          </ol>
        </section>

        <section className="mb-12 grid gap-3 sm:grid-cols-2">
          {[
            { href: "/naccas-distance-education-requirements", label: "NACCAS Policy VI.02 in full", why: "The five accreditation elements verbatim, and why the widely-cited 50% cap is not in that policy." },
            { href: "/texas-online-barber-cosmetology-school-guide", label: "The Texas rules for students", why: "Max online hours per licence and TDLR's five school duties — the student-facing version." },
            { href: "/states-that-allow-online-cosmetology-school", label: "Which states allow it", why: "The verified state matrix. California permits none at all." },
            { href: "/texas-cosmetology-school-license-requirements-guide", label: "School licence requirements", why: "$580 including inspection, and what the licence itself requires." },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300">
              <span className="min-w-0">
                <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">{l.label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{l.why}</span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
            </Link>
          ))}
        </section>

        <div className="mb-12 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          Quoted from the{" "}
          <a href={SHEARS.manualUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline">
            {SHEARS.manualVersion} {SHEARS.name} Operations Manual
            <ExternalLink className="h-3 w-3" />
          </a>
          , 47 pages, read in full on {VERIFIED_ON}, together with 16 TAC &sect;83.202(e)(1) and
          NACCAS Policy VI.02. The &ldquo;may not not&rdquo; in the core-hours quote is TDLR&apos;s
          typo, reproduced as printed. TDLR revises this manual and the file name carries no version
          &mdash; check the date inside the document before relying on a figure for a filing.
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
        <DistanceEducationCta source="compliance" />
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "FAQPage",
            "@id": `${SITE_URL}/texas-distance-education-compliance#faqpage`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
          )),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "Article",
            "@id": `${SITE_URL}/texas-distance-education-compliance#article`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            author: authorSchema(),
            headline: TITLE,
            description: DESCRIPTION,
            dateModified: VERIFIED_ON,
            about: { "@type": "Thing", name: "Distance education compliance for Texas barbering and cosmetology schools" },
            citation: [
              { "@type": "CreativeWork", name: `${SHEARS.manualVersion} SHEARS Operations Manual`, url: SHEARS.manualUrl },
              { "@type": "CreativeWork", name: "NACCAS Policy VI.02", url: "http://elibrary.naccas.org/InfoRouter/docs/Public/NACCAS%20Handbook/Policies%20III.01-IX.02/Policy%20VI.02.pdf" },
            ],
          },
          )),
        }}
      />
    </div>
  );
}
