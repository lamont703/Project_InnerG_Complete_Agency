import Link from "next/link"
import { ArrowLeft, ArrowRight, Clock, ShieldCheck, RefreshCw, ListOrdered, BookOpen, AlertTriangle, ExternalLink, TrendingUp } from "lucide-react"
import { Navbar } from "@/components/layout/navbar"
import type { RenewalStats } from "@/lib/tdlr-renewal-stats"
import { SITE_URL } from "@/lib/site";
import {
  ORG_ID, REGULATORS, WEBSITE_ID, faqNode, graphJson, ref, stateNode, webPageNode,
} from "@/lib/schema-graph";

export interface RenewalStep {
  t: string
  d: React.ReactNode
}

export interface RenewalConfig {
  /** Canonical path, e.g. "/texas-barber-license-renewal". Identifies the graph. */
  path: string;
  license: string // "Barber" | "Cosmetology"
  h1: React.ReactNode
  intro: string
  ceTopicUnder15: string
  ceTopicOver15: string
  ceIntro: string
  steps: RenewalStep[]
  faqs: { q: string; a: string }[]
  siblingLinks: { href: string; label: string }[]
  siblingHeading: string
}

const fmt = (n: number) => n.toLocaleString()

export function RenewalLanding({ config, stats }: { config: RenewalConfig; stats: RenewalStats }) {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <div className="no-print">
        <Navbar />
      </div>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-10 sm:pb-14">
        <Link
          href="/insights/texas-barber-cosmetology-license-requirements"
          className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary hover:underline mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Full license requirements &amp; reciprocity
        </Link>

        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
            <RefreshCw className="w-3 h-3" />
            2026 renewal guide · sourced from TDLR
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-3">{config.h1}</h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl">{config.intro}</p>
        </div>

        {/* Live TDLR-lake stat + the 3 renewal numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
            <TrendingUp className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900 tabular-nums">{fmt(stats.renewalsDue90d)}</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Renewals due in the next 90 days</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ShieldCheck className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">$50</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">On-Time Renewal Fee</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <RefreshCw className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">2 Years</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Renewal Cycle</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <BookOpen className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">4 hrs</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">CE Required (2 if 15+ yrs)</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-8">
          {fmt(stats.totalLicensed)} active {config.license} licenses in Texas · renewal counts are live from the TDLR
          licensee registry.
        </p>

        {/* Primary CTA */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-black text-slate-900 mb-1">Need your {config.license.toLowerCase()} CE hours?</p>
            <p className="text-sm text-slate-600">Complete all 4 (or 2) required hours online, self-paced, reported to TDLR fast.</p>
          </div>
          <Link
            href="/barber-cos-continuing-education"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            Complete Your CE Hours
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* How to renew */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <ListOrdered className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-black text-slate-900">How to Renew — Step by Step</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium mb-5">
            TDLR renews online. Start about <strong>60 days before</strong> your expiration date so your CE hours are
            reported and documents are ready before the deadline.
          </p>
          <ol className="space-y-4 list-none pl-0">
            {config.steps.map((step, i) => (
              <li key={step.t} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-black text-sm">{i + 1}</span>
                <div>
                  <p className="font-black text-slate-900 text-sm uppercase tracking-tight mb-1">{step.t}</p>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">{step.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 flex gap-3">
            <Clock className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600 leading-relaxed">
              <strong className="text-slate-900">Timing:</strong> online renewals typically process in about 7–10
              business days; renewing by mail takes roughly 4–6 weeks. Don&apos;t wait until your expiration date — a
              lapse means late fees, and past 3 years no renewal at all.
            </p>
          </div>
        </div>

        {/* CE requirement */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-black text-slate-900">Continuing Education (effective Sept 1, 2025)</h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">{config.ceIntro}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-black text-indigo-700 uppercase tracking-widest mb-2">Licensed fewer than 15 years</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter mb-2">4 hours</p>
              <p className="text-sm text-slate-600">{config.ceTopicUnder15}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-black text-indigo-700 uppercase tracking-widest mb-2">Licensed 15 years or more</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter mb-2">2 hours</p>
              <p className="text-sm text-slate-600">{config.ceTopicOver15}</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Only TDLR-approved courses count, and hours are timed — each requires 50 minutes of seat time. Approved
            providers report your completed hours to TDLR electronically, usually within one business day. A licensee
            who is 65 or older and has held a license 15+ years only needs the single 1-hour sanitation course.
          </p>
        </div>

        {/* Fees */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-black text-slate-900">Renewal Fees</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {[
              { label: "On time", value: "$50" },
              { label: "Expired under 18 months", value: "$75" },
              { label: "Expired 18 months – 3 years", value: "$100" },
            ].map((tier) => (
              <div key={tier.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-2xl font-black text-slate-900 tracking-tighter mb-1">{tier.value}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{tier.label}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            That&apos;s TDLR&apos;s fee only — separate from the roughly $25 you&apos;ll pay a TDLR-approved provider
            for your CE hours. Own a shop? Establishment licenses renew on the same cycle at higher fees ($70–$78 on
            time) — see the{" "}
            <Link href="/insights/texas-barber-cosmetology-license-requirements" className="text-indigo-600 font-bold hover:underline">
              full requirements guide
            </Link>{" "}
            for the establishment fee table, plus reciprocity, lawful-presence, and military-spouse rules.
          </p>
        </div>

        {/* Sibling links */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 mb-10">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-3">{config.siblingHeading}</h3>
          <div className="flex flex-wrap gap-3">
            {config.siblingLinks.map((l) => (
              <Link key={l.href} href={l.href} className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:underline">
                {l.label}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5 mb-10 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 leading-relaxed">
            Requirements are set by TDLR and updated periodically. Confirm your exact cycle and fee in your TDLR
            online account at{" "}
            <a href="https://www.tdlr.texas.gov" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline inline-flex items-center gap-1">
              tdlr.texas.gov
              <ExternalLink className="w-3 h-3" />
            </a>{" "}
            before your renewal date.
          </p>
        </div>

        {/* FAQ */}
        <div className="border-t border-slate-200 pt-10">
          <h2 className="text-xl font-black text-slate-900 mb-6">Common Questions</h2>
          <div className="space-y-6">
            {config.faqs.map((faq) => (
              <div key={faq.q}>
                <h3 className="text-sm font-black text-slate-900 mb-1.5">{faq.q}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Schema */}
      {/*
        One graph rather than two standalone documents. The FAQ and the
        step-by-step are both about the same renewal, and neither said so.
        `config.path` is what makes them identifiable at all — a shared
        component renders on several routes, so without it every renewal page
        published the same anonymous pair of objects.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: graphJson(
            webPageNode({
              path: config.path,
              name: `Texas ${config.license} License Renewal`,
              primaryEntityId: `${SITE_URL}${config.path}#howto`,
            }),
            {
              "@type": "HowTo",
              "@id": `${SITE_URL}${config.path}#howto`,
              isPartOf: ref(WEBSITE_ID),
              publisher: ref(ORG_ID),
              name: `How to Renew a Texas ${config.license} License`,
              description: `Step-by-step renewal of a Texas ${config.license.toLowerCase()} license through TDLR.`,
              estimatedCost: { "@type": "MonetaryAmount", currency: "USD", value: 50 },
              about: [ref(REGULATORS.tx["@id"]), stateNode("TX")],
              step: config.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.t })),
            },
            faqNode(config.path, config.faqs.map((f) => ({ q: f.q, a: f.a })), `${SITE_URL}${config.path}#howto`),
            REGULATORS.tx,
          ),
        }}
      />
    </div>
  )
}
