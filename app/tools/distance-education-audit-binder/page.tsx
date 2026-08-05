import Link from "next/link";
import { ArrowLeft, ExternalLink, ArrowRight, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";
import { BinderClient, BinderLegend } from "./binder-client";

/**
 * The audit binder, demonstrated.
 *
 * WHAT IT IS FOR. A school running distance education has to produce, per
 * student, evidence for six things across two authorities. Today that means
 * someone joining a time clock, an LMS export, a filing cabinet and a calendar
 * by hand — which is why the honest answer to "show me student #47 never broke
 * the 10-business-day rule" is usually "give me a week". This shows the answer
 * arriving in ten seconds instead, which is the entire argument.
 *
 * THE DEMO DATA IS INVENTED AND SAYS SO, PROMINENTLY. Five students, each
 * exercising a different failure, because a screen of green ticks demonstrates
 * nothing. Publishing something that looked like real student records would be
 * wrong on a public page regardless of whether the names were real.
 *
 * THE ONE MOMENT THIS PAGE EXISTS FOR is the first roster row: 50% distance
 * hours overall, and in breach, because the ceiling that bites is the 350 hours
 * inside the core 700 rather than the percentage. Every school owner reading
 * that recognises their own reporting.
 */

const TITLE = "Distance Education Audit Binder — Compliance Demo";
const DESCRIPTION =
  "Every distance-education obligation a Texas school must evidence per student — the 350/150 split, the 10-business-day campus clock, the 184-hour ceiling — computed and printable.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "distance education audit binder",
    "naccas audit preparation cosmetology",
    "tdlr shears compliance tool",
    "10 business day rule naccas tracking",
    "distance education hours tracking school",
    "cosmetology school compliance software",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: {
    canonical: "https://agency.innergcomplete.com/tools/distance-education-audit-binder",
  },
};

export default function AuditBinderPage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-28 pb-16">
        <Link
          href="/ai-solutions"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-indigo-600 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All tools
        </Link>

        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          For school owners &amp; compliance directors
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          Distance Education Audit Binder
        </h1>

        <ResearchByline verifiedOn="2026-08-05" what="Rules read from TDLR and NACCAS sources, and built by" />

        <p className="mb-6 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
          When an inspector asks whether a student has broken the 10-business-day rule, the honest
          answer at most schools is &ldquo;give me a week&rdquo; &mdash; because the attendance lives
          in a time clock, the theory hours in an LMS, and nothing joins them. This is what the
          answer looks like when the evidence is a report rather than a project.
        </p>

        {/* The demo-data notice sits above the tool, not under it. */}
        <div className="mb-10 rounded-2xl border border-amber-300 bg-amber-50 px-6 py-5">
          <p className="text-sm leading-relaxed text-amber-900">
            <strong className="text-amber-950">These five students are invented.</strong> Each one
            exercises a different failure so the checks are visible &mdash; a screen of green ticks
            would demonstrate nothing. No real student records are shown here, and none are stored.
            The rules are real: every check cites the TDLR or NACCAS provision it comes from.
          </p>
        </div>

        <section className="mb-10">
          <h2 className="mb-4 text-lg font-black text-slate-900">What is being checked</h2>
          <BinderLegend />
        </section>

        <BinderClient />

        {/* ---- What it would take with real data --------------------------- */}
        <section className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900">
            <ShieldCheck className="h-4.5 w-4.5 text-indigo-600" />
            What changes with a real school&apos;s data
          </h2>
          <ul className="space-y-2.5 text-sm leading-relaxed text-slate-600">
            {[
              "The business-day calendar comes from the enrolment contract, not from federal holidays. NACCAS measures presence against \"a scheduled class day as outlined in the enrollment contract\", so term dates and closures are the school's own.",
              "The distance ceiling comes from the certificate of approval, which can be lower than the statutory 350/150. TDLR's manual: \"Approved distance education hours can be found on your certificate of approval.\"",
              "Hours reconcile against what was filed in SHEARS each month, so the school's records and the state's agree before anyone asks.",
              "Transcripts carry the distance component separately, which only works if the split was recorded from the first hour rather than reconstructed later.",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2">
          {[
            { href: "/texas-distance-education-compliance", label: "Where these rules come from", why: "The 350/150 split, quoted from TDLR's April 2026 SHEARS manual." },
            { href: "/texas-school-penalties-distance-education", label: "What a breach costs", why: "\"Failed to comply with distance education parameters\" is Class D — $3,500–$5,000 and/or revocation." },
            { href: "/naccas-distance-education-requirements", label: "NACCAS Policy VI.02", why: "The five accreditation elements the campus and assessment checks come from." },
            { href: "/states-that-allow-online-cosmetology-school", label: "Which states allow it", why: "The verified matrix. California permits none at all." },
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

        {/* The conversion moment is here, after the checks have shown what they
            catch — not at the top before anyone has seen one fire. */}
        <section className="mt-8 rounded-2xl border border-slate-900 bg-slate-900 px-6 py-6 sm:px-8 sm:py-7">
          <h2 className="text-lg font-black tracking-tight text-white sm:text-xl">
            This is running on sample data. Yours will look different.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Send us an hours export and we&apos;ll run your actual roster through the same checks
            against the same sources, and hand back a dated binder you can put in the file.
          </p>
          <Link
            href="/contact"
            data-ig-click="binder_cta_contact"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-md transition-colors hover:bg-slate-100"
          >
            Run this on our school
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          Rules sourced from TDLR&apos;s{" "}
          <a href="https://www.tdlr.texas.gov/SHEARS/Operations%20Manual%20for%20SHEARS.pdf" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline">
            April 2026 SHEARS Operations Manual
            <ExternalLink className="h-3 w-3" />
          </a>
          , 16 TAC §83.202(e) and §83.72(w), and NACCAS Policy VI.02. This is a demonstration of the
          checks, not compliance advice &mdash; confirm your own position with TDLR and your
          accreditor.
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Distance Education Audit Binder",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description: DESCRIPTION,
            author: authorSchema(),
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          }),
        }}
      />
    </div>
  );
}
