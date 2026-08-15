import Link from "next/link";
import { ExternalLink, ShieldCheck, AlertTriangle, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { NACCAS_POLICY, STATE_RULES, VERIFIED_ON } from "@/lib/distance-education-states";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";
import { ShareLinks } from "@/components/shared/share-links";

/**
 * The school-operator layer of the distance-education cluster.
 *
 * NO CONSUMER SEARCH VOLUME, HIGHEST COMMERCIAL INTENT ON THE SITE. Nobody
 * shopping for beauty school types "NACCAS Policy VI.02". School owners and
 * compliance staff do, and they are the audience that buys software. A page
 * that ranks for a term with 30 searches a month and reaches the person
 * signing purchase orders is worth more than one that ranks for 4,400 and
 * reaches students.
 *
 * THE CORRECTION THIS PAGE EXISTS TO MAKE. Secondary sources — including the
 * first search result we hit — attribute a 50% distance-education cap to this
 * policy. The policy was read in full: five elements, no percentage. The
 * complete NACCAS policy set III.01–IX.02 contains "50%" exactly once, in a
 * refund table. Being the page that gets this right is the whole point;
 * everyone else is repeating a summary of a document they did not open.
 */

const TITLE = "NACCAS Policy VI.02: Distance Education Requirements for Beauty Schools";
const DESCRIPTION =
  "The five accreditation requirements in full — and why the widely-cited 50% cap is not in this policy. What each element demands of a school's systems.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "naccas distance education policy",
    "naccas policy vi.02",
    "naccas distance learning requirements",
    "cosmetology school accreditation distance education",
    "beauty school distance education compliance",
    "naccas 10 business days rule",
    "distance education transcript requirements cosmetology",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: {
    canonical: `${SITE_URL}/naccas-distance-education-requirements`,
  },
};

const FAQS = [
  {
    q: "Does NACCAS cap distance education at 50%?",
    a: "No — not in Policy VI.02. That policy contains five elements and none of them is a percentage limit, and the complete NACCAS policy set III.01 through IX.02 contains \"50%\" only once, inside a refund table. The 50% figures in Texas and Alabama are set by those states independently. If a vendor or consultant tells you the accreditor sets 50%, ask them which policy number says so.",
  },
  {
    q: "How often must a distance education student be physically on campus?",
    a: "At least once every 10 business days, for the length of a scheduled class day, and the interval must be set out in the enrolment contract. This is element 3 of NACCAS Policy VI.02 and it is a hard floor — a student cannot go a fortnight without a full day on campus.",
  },
  {
    q: "Can graded assessments be taken online?",
    a: "Not if they count toward GPA. Policy VI.02 element 2 requires that all assessments used for calculating a student's GPA be executed while the student is physically on campus. Remote theory delivery is permitted; remote GPA-bearing assessment is not.",
  },
  {
    q: "Do distance hours have to be shown separately on a transcript?",
    a: "Yes. Element 4 requires that all transcripts and other documents listing academic attainment — official or unofficial — identify the distance education component. In practice that means your system of record has to distinguish distance hours from the first hour recorded, because reconstructing the split afterwards is not reliable and will not survive an audit.",
  },
  {
    q: "What disclosure must students sign before enrolling?",
    a: "A disclaimer that academic achievement earned via distance education may not be accepted for reciprocity or eligible for licensure in other states. Element 5 requires it be provided prior to enrolment and that a signed and dated copy be held in the student file. Alabama's 2026 rule restates this requirement almost word for word.",
  },
  {
    q: "How does NACCAS Policy VI.02 interact with my state's rules?",
    a: "It stacks. The policy states that an institution's distance education policy must comply with all local, state and federal laws and regulations as well as NACCAS Standards and Criteria — so you meet the stricter of the two on every dimension. Texas caps distance delivery at 50% of course hours and requires the same tracking method as in-person attendance; NACCAS adds on-campus assessment, the 10-business-day presence interval, transcript separation and the signed disclaimer.",
  },
];

export default function NaccasDistanceEducationPage() {
  const capStates = STATE_RULES.filter((s) => s.percentCap !== null);

  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          For school owners &middot; Accreditation
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          NACCAS Policy VI.02: Distance Education Requirements
        </h1>

        <ResearchByline verifiedOn={VERIFIED_ON} what="Read in full and verified" />

        <p className="mb-8 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
          If your institution offers distance education, {NACCAS_POLICY.id} sets five things your
          policy must contain. They are short, specific, and every one of them is a system
          requirement rather than a document requirement &mdash; which is why schools tend to fail
          them with a compliant-looking binder.
        </p>

          <ShareLinks title="NACCAS distance education requirements" professional className="mt-8 mb-2" />

        {/* The correction, up top, because it is the reason to trust this page. */}
        <div className="mb-12 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-rose-900">
            <AlertTriangle className="h-4.5 w-4.5" />
            The 50% cap is not in this policy
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-rose-900/90">
            It is widely repeated that NACCAS limits distance education to 50% of a programme. We
            read {NACCAS_POLICY.id} in full &mdash; five elements, no percentage &mdash; and searched
            the complete policy set III.01 through IX.02, where &ldquo;50%&rdquo; appears once, in a
            refund table.
          </p>
          <p className="text-sm leading-relaxed text-rose-900/90">
            The 50% figures are set by states independently:{" "}
            {capStates.map((s, i) => (
              <span key={s.code}>
                {i > 0 ? " and " : ""}
                <strong>
                  {s.name} at {s.percentCap}%
                </strong>
              </span>
            ))}
            . Neither rule cites the other, and neither cites the accreditor for the number.
          </p>
        </div>

        {/* ---- The five elements ---------------------------------------------- */}
        <section className="mb-12">
          <h2 className="mb-1 text-xl font-black text-slate-900">
            The five required elements, verbatim
          </h2>
          <p className="mb-5 max-w-3xl text-sm font-medium text-slate-500">
            {NACCAS_POLICY.title} &mdash; {NACCAS_POLICY.version}. Quoted from the policy, with what
            each one actually demands of your systems.
          </p>
          <div className="space-y-4">
            {NACCAS_POLICY.elements.map((el) => (
              <div key={el.n} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex gap-4">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-black text-white">
                    {el.n}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold italic leading-relaxed text-slate-900">
                      &ldquo;{el.text}&rdquo;
                    </p>
                    <div className="mt-3 rounded-xl bg-indigo-50/70 px-4 py-3">
                      <p className="text-xs font-black uppercase tracking-wider text-indigo-700">
                        What it means operationally
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-indigo-900/90">
                        {el.operationally}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            The policy also states plainly that an institution&apos;s distance education policy
            &ldquo;must be in compliance with all local, state and federal laws and regulations and
            NACCAS Standards and Criteria&rdquo; &mdash; so these stack on top of your state&apos;s
            rules rather than replacing them. You meet the stricter of the two on every dimension.
          </p>
        </section>

        {/* ---- The stack ------------------------------------------------------ */}
        <section className="mb-12 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900">
            <ShieldCheck className="h-4.5 w-4.5 text-indigo-600" />
            What a Texas school has to satisfy, combined
          </h2>
          <ul className="space-y-2.5 text-sm leading-relaxed text-slate-600">
            {[
              "No more than 50% of total course hours delivered at a distance, theory only — 16 TAC §83.202(e)(1)",
              "Distance hours tracked by the same verification method as in-person attendance — TDLR",
              "Hours reported electronically per student in the manner the department prescribes — TDLR",
              "Instructor interaction validated by measurable participation — NACCAS element 1",
              "All GPA-bearing assessment taken physically on campus — NACCAS element 2",
              "Student on campus at least once every 10 business days, per the enrolment contract — NACCAS element 3",
              "Distance component identified separately on every transcript — NACCAS element 4",
              "Signed, dated reciprocity disclaimer in every student file — NACCAS element 5",
            ].map((s) => (
              <li key={s} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Eight obligations, each evidenced per student, across two authorities that audit
            separately. Note how many are about the <em>record</em> rather than the teaching &mdash;
            which is the part a learning management system either does from day one or cannot
            retrofit.
          </p>
        </section>

        <section className="mb-12 grid gap-3 sm:grid-cols-2">
          {[
            {
              href: "/states-that-allow-online-cosmetology-school",
              label: "Which states allow it, and how much",
              why: "The verified state-by-state matrix, with the document behind each figure.",
            },
            {
              href: "/texas-online-barber-cosmetology-school-guide",
              label: "The Texas rules in full",
              why: "Max distance hours for all six licence types and TDLR's five school duties.",
            },
            {
              href: "/texas-barber-school-license-requirements-guide",
              label: "Opening a barber school in Texas",
              why: "$580 including inspection, and what the licence itself requires.",
            },
            {
              href: "/texas-cosmetology-school-license-requirements-guide",
              label: "Opening a cosmetology school in Texas",
              why: "The equivalent requirements on the cosmetology side.",
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
        </section>

        <div className="mb-12 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          Quoted from{" "}
          <a
            href={NACCAS_POLICY.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline"
          >
            {NACCAS_POLICY.id} &mdash; {NACCAS_POLICY.title}
            <ExternalLink className="h-3 w-3" />
          </a>
          , {NACCAS_POLICY.version}, read in full on {VERIFIED_ON}. NACCAS revises its handbook;
          confirm against the current edition before relying on this for an accreditation visit.
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
          __html: JSON.stringify(graph(
            {
            "@type": "FAQPage",
            "@id": `${SITE_URL}/naccas-distance-education-requirements#faqpage`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
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
            "@id": `${SITE_URL}/naccas-distance-education-requirements#article`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            author: authorSchema(),
            headline: TITLE,
            description: DESCRIPTION,
            dateModified: VERIFIED_ON,
            about: { "@type": "Thing", name: `NACCAS ${NACCAS_POLICY.id} distance education requirements` },
            citation: [{ "@type": "CreativeWork", name: `NACCAS ${NACCAS_POLICY.id} (${NACCAS_POLICY.version})`, url: NACCAS_POLICY.url }],
          },
          )),
        }}
      />
    </div>
  );
}
