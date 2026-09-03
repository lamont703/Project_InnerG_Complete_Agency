import Link from "next/link";
import { AlertTriangle, ExternalLink, ArrowRight, Scale, ShieldAlert } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";
import { DistanceEducationCta } from "@/components/distance-education-cta";
import {
  PENALTY_CLASSES,
  DISTANCE_VIOLATIONS,
  HOURS_VIOLATIONS,
  classOf,
  SOURCE_URL,
  VERIFIED_ON,
} from "@/lib/tdlr-school-penalties";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";

/**
 * What non-compliance actually costs, from TDLR's own published schedule.
 *
 * THE FACT THIS PAGE EXISTS FOR. The schedule contains a Class D violation —
 * the most severe band, $3,500 to $5,000 and/or revocation — reading "Failed to
 * comply with distance education parameters", citing 83.120(c) and 83.202(e).
 * 83.202(e) is the rule carrying the 50% cap, which the SHEARS manual splits
 * into 350 hours inside the core 700 and 150 inside the specialty 300. So a
 * school at exactly 50% overall, believing itself compliant, can be inside a
 * named Class D violation.
 *
 * TONE DISCIPLINE. These are published ranges, not sentences anyone received.
 * Writing "$5,000 fine" where TDLR wrote "$3,500 to $5,000 and/or revocation"
 * would be the same category of error as publishing a licence number without
 * checking it was live — and this page's whole value is that it is checkable.
 * The caveat is stated up front, not in a footnote.
 */

const TITLE = "What Distance Education Non-Compliance Costs a Texas School";
const DESCRIPTION =
  "TDLR's published penalty schedule puts \"failed to comply with distance education parameters\" in Class D — $3,500 to $5,000 and/or revocation. The violations, the ranges, the citations.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "tdlr school penalties",
    "cosmetology school fines texas",
    "barber school license revocation texas",
    "tdlr administrative penalty schools",
    "distance education violation texas school",
    "tdlr enforcement barbering cosmetology schools",
    "83.120(c) distance education parameters",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: {
    canonical: `${SITE_URL}/texas-school-penalties-distance-education`,
  },
};

const FAQS = [
  {
    q: "What is the penalty for breaking Texas distance education rules?",
    a: "TDLR's published schedule lists \"Failed to comply with distance education parameters\" (16 TAC §83.120(c), §83.202(e)) as a Class D violation, the most severe band, carrying $3,500 to $5,000 and/or revocation. Teaching the practical portion by distance education and offering distance education without approval are both Class C: $2,000 to $5,000 and/or up to revocation. These are the published ranges, not outcomes — an actual penalty depends on the case and any settlement reached after a Notice of Alleged Violation.",
  },
  {
    q: "Can a school be at 50% distance hours and still be in violation?",
    a: "Yes, and this is the trap. The rule caps distance education at 50% of course hours, but TDLR's SHEARS manual splits that into two ceilings: no more than 350 distance hours within the first 700 core hours, and no more than 150 within the 300 specialty hours. A school with 500 distance hours all inside the core 700 is at exactly 50% overall and has breached the core ceiling. \"Failed to comply with distance education parameters\" cites §83.202(e), which is the rule those parameters live in.",
  },
  {
    q: "How long must a Texas school keep student records?",
    a: "48 months after the student completes the curriculum, withdraws, or has enrollment terminated — 16 TAC §83.72(k). Failing to do so is a Class C violation at $2,000 to $5,000 and/or up to revocation. Separately, §1603.2309(b) requires the school to allow inspection of attendance records \"at any time\", which makes production on demand the test rather than mere existence.",
  },
  {
    q: "What happens if hours are reported late or in a batch?",
    a: "Two separate exposures. Failing to submit an electronic record of accrued clock hours at least monthly is Class A, $500 to $1,500. And awarding more than 184 hours in a calendar month is also Class A — which is what catches a school reconstructing a term's hours in a single filing, because the overflow has nowhere to go.",
  },
  {
    q: "Is a school penalised for hours it granted in good faith?",
    a: "It can be. \"Directly or indirectly granting or approving student hours not correctly accrued\" (§83.72(k)) is Class D — $3,500 to $5,000 and/or revocation — and \"indirectly\" is the operative word. A process that awards hours the records cannot substantiate falls inside it whether or not anyone intended the outcome.",
  },
  {
    q: "Does an enforcement action always mean a fine?",
    a: "No. TDLR issues a Notice of Alleged Violation which may contain a settlement offer; if agreed, an Agreed Order is issued. That order may require paying an administrative penalty, but can also require restitution, additional education, or simply providing the documentation that was missing. A sanction is separate from a penalty and acts on the licence itself — suspension, probation, written reprimand or revocation.",
  },
];

function ViolationTable({ rows, title, note }: { rows: typeof DISTANCE_VIOLATIONS; title: string; note?: string }) {
  return (
    <section className="mb-12">
      <h2 className="mb-1 text-xl font-black text-slate-900">{title}</h2>
      {note ? <p className="mb-5 max-w-3xl text-sm font-medium text-slate-500">{note}</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[780px] border-collapse bg-white">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Violation, as TDLR words it</th>
              <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Class</th>
              <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Published range</th>
              <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">What produces it</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => {
              const c = classOf(v.cls);
              return (
                <tr key={v.text} className="border-b border-slate-100 align-top last:border-0">
                  <td className="px-5 py-4">
                    <p className="text-sm font-bold leading-snug text-slate-900">{v.text}</p>
                    <p className="mt-1 text-xs text-slate-400">{v.citation}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-block rounded-lg px-2 py-0.5 text-xs font-black ${v.cls === "D" ? "bg-rose-100 text-rose-800" : v.cls === "C" ? "bg-orange-100 text-orange-800" : v.cls === "B" ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700"}`}>
                      {v.cls}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="block text-sm font-black tabular-nums text-slate-900">{c.range}</span>
                    {c.sanction !== "—" ? <span className="mt-0.5 block text-xs font-semibold text-rose-700">{c.sanction}</span> : null}
                  </td>
                  <td className="px-5 py-4 text-xs leading-relaxed text-slate-600">{v.trigger}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function TexasSchoolPenaltiesPage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          For school owners &middot; Enforcement
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          What Distance Education Non-Compliance Costs
        </h1>

        <ResearchByline verifiedOn={VERIFIED_ON} what="Read from TDLR's enforcement schedule and verified" />

        {/* The caveat leads, because the page's value is that it is checkable. */}
        <div className="mb-8 rounded-2xl border border-slate-300 bg-slate-50 px-6 py-5">
          <p className="text-sm leading-relaxed text-slate-700">
            <strong className="text-slate-900">These are published ranges, not sentences.</strong>{" "}
            TDLR sets a band per violation class; what a school actually pays depends on the case,
            its history, and any settlement reached after a Notice of Alleged Violation. Nothing here
            predicts an outcome. It shows where each failure sits in TDLR&apos;s own schedule, with
            the citation, so you can check it.
          </p>
        </div>

        <p className="mb-10 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Distance education is not a lighter-touch part of the rules. TDLR&apos;s enforcement
          schedule puts <strong className="text-slate-900">&ldquo;failed to comply with distance
          education parameters&rdquo; in Class D</strong> &mdash; the most severe band it publishes,
          alongside falsifying hours.
        </p>

        {/* ---- The four bands -------------------------------------------------- */}
        <section className="mb-12">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-slate-900">
            <Scale className="h-4.5 w-4.5 text-indigo-600" />
            The four penalty classes
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PENALTY_CLASSES.map((c) => (
              <div key={c.cls} className={`rounded-2xl border p-5 shadow-sm ${c.cls === "D" ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"}`}>
                <p className={`text-xs font-black uppercase tracking-wider ${c.cls === "D" ? "text-rose-700" : "text-slate-500"}`}>Class {c.cls}</p>
                <p className="mt-1 text-lg font-black tabular-nums text-slate-900">{c.range}</p>
                {c.sanction !== "—" ? <p className="mt-1 text-xs font-semibold leading-snug text-rose-700">{c.sanction}</p> : null}
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{c.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- The 50% trap --------------------------------------------------- */}
        <div className="mb-12 rounded-2xl border border-rose-300 bg-rose-50 px-6 py-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-rose-900">
            <AlertTriangle className="h-4.5 w-4.5" />
            A school at exactly 50% can be inside the Class D band
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-rose-900/90">
            &ldquo;Failed to comply with distance education parameters&rdquo; cites{" "}
            <strong>16 TAC §83.120(c) and §83.202(e)</strong>. §83.202(e) is the rule carrying the
            50% cap &mdash; and TDLR&apos;s SHEARS manual splits that cap in two:{" "}
            <strong>no more than 350 distance hours inside the first 700 core hours</strong>, and no
            more than 150 inside the 300 specialty hours.
          </p>
          <p className="text-sm leading-relaxed text-rose-900/90">
            350 + 150 = 500, which is 50% of 1,000. But a school running all 500 distance hours
            inside the core 700 has met the overall percentage and breached the core ceiling. Nothing
            that tracks a single percentage would show it.{" "}
            <Link href="/texas-distance-education-compliance" className="font-black underline">
              How the split actually works
            </Link>
            .
          </p>
        </div>

        <ViolationTable
          title="Distance education violations"
          note="Every one of these exists only because a school offers distance education. A school that doesn't has no exposure to any of them."
          rows={DISTANCE_VIOLATIONS}
        />

        <ViolationTable
          title="Hours, attendance and records violations"
          note="These apply to every school — but distance education multiplies the surface, because the hours now come in two kinds that must be separately accounted for and separately reported."
          rows={HOURS_VIOLATIONS}
        />

        {/* ---- How enforcement works ------------------------------------------ */}
        <section className="mb-12 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900">
            <ShieldAlert className="h-4.5 w-4.5 text-indigo-600" />
            Penalty and sanction are two different things
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            An <strong className="text-slate-900">administrative penalty</strong> is money paid to
            the State of Texas. A <strong className="text-slate-900">sanction</strong> acts on the
            licence itself &mdash; suspension, probation, written reprimand or revocation. The
            classes above carry both, which is why the range matters less than the &ldquo;and/or
            revocation&rdquo; beside it.
          </p>
          <p className="text-sm leading-relaxed text-slate-600">
            The process starts with a Notice of Alleged Violation, which may carry a settlement
            offer. An agreement becomes an Agreed Order, and that order can require the penalty,
            restitution, additional education, or simply producing the documentation that was
            missing in the first place.
          </p>
        </section>

        <section className="mb-12 grid gap-3 sm:grid-cols-2">
          {[
            { href: "/texas-distance-education-compliance", label: "The 350/150 split, and SHEARS", why: "Where the parameters come from, quoted from TDLR's own operations manual." },
            { href: "/naccas-distance-education-requirements", label: "NACCAS Policy VI.02", why: "The accreditation layer that stacks on top of the state rules." },
            { href: "/texas-online-barber-cosmetology-school-guide", label: "The student-facing version", why: "Max online hours per licence — what to tell prospective students." },
            { href: "/texas-cosmetology-school-license-requirements-guide", label: "School licence requirements", why: "What the licence itself requires, at $580 including inspection." },
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
          Every violation and range above is quoted from{" "}
          <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline">
            TDLR&apos;s penalty schedule for schools, instructors and CE providers
            <ExternalLink className="h-3 w-3" />
          </a>
          , read on {VERIFIED_ON}. This is not legal advice, and the ranges are not predictions. TDLR
          revises the schedule &mdash; check it before relying on a figure, and speak to TDLR or
          counsel about your own situation.
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
        <DistanceEducationCta source="penalties" />
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "FAQPage",
            "@id": `${SITE_URL}/texas-school-penalties-distance-education#faqpage`,
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
            "@id": `${SITE_URL}/texas-school-penalties-distance-education#article`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            author: authorSchema(),
            headline: TITLE,
            description: DESCRIPTION,
            dateModified: VERIFIED_ON,
            about: { "@type": "Thing", name: "TDLR administrative penalties for Texas barbering and cosmetology schools" },
            citation: [{ "@type": "CreativeWork", name: "TDLR penalty schedule — schools, instructors and CE providers", url: SOURCE_URL }],
          },
          )),
        }}
      />
    </div>
  );
}
