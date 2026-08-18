import Link from "next/link";
import { ArrowLeft, DollarSign, CalendarClock, AlertTriangle, ShieldAlert, ExternalLink, HelpCircle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { SPECIALTY_RENEWAL, TDLR_RENEW_URL, TDLR_OAG_URL } from "@/lib/tdlr-sources";
import { authorSchema } from "@/lib/author";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";
import { AgentInvite } from "@/components/journey/agent-invite";
import { questionsForSlug } from "@/lib/agent-invite-questions";

/**
 * Figures come from lib/tdlr-sources.ts, which records which TDLR page settles
 * each one. Nothing here is carried across from the barber or cosmetology
 * renewal pages — the specialty licences differ, and those two pages state the
 * late-renewal bands differently from the rule.
 *
 * The continuing-education section says the requirement is unresolved for
 * specialty licences, because it is. TDLR's at-a-glance PDF names "Barber and
 * Cosmetology Operators"; its CE page says "your license". Telling a
 * eyelash extension specialist they definitely do or definitely do not need CE, on the page
 * they use to keep their licence, is not a guess worth making.
 */

export const metadata = {
  title: 'Texas Eyelash Extension License Renewal (2026): Fee & Steps',
  description: 'Renew your Texas eyelash extension specialist license: the $50 fee, 2-year cycle, late-renewal bands and the TDLR process — plus what TDLR has not published about CE.',
  keywords: ["texas eyelash extension license renewal", "renew lash license texas", "texas lash tech license renewal", "eyelash extension specialist license texas", "texas eyelash license expired", "lash extension ce hours texas", "renew texas eyelash license"],
  openGraph: { title: 'Texas Eyelash Extension License Renewal (2026): Fee & Steps', description: 'Renew your Texas eyelash extension specialist license: the $50 fee, 2-year cycle, late-renewal bands and the TDLR process — plus what TDLR has not published about CE.' },
  alternates: { canonical: `${SITE_URL}/texas-eyelash-extension-license-renewal` },
};

const FAQS = [
  {
    q: "How much does it cost to renew a Texas eyelash extension license?",
    a: "$50 on time. If it has expired, the rule sets the fee as a multiple of that: 1.5x ($75) if expired 90 days or less, and 2x ($100) if expired more than 90 days but under 18 months. Past 18 months you generally cannot renew and must re-establish eligibility.",
  },
  {
    q: "How often do I renew a Texas eyelash extension license?",
    a: "Every two years. TDLR sends a renewal notice, but the responsibility to renew on time is yours whether or not the notice reaches you — which is why keeping your address current with the Department matters.",
  },
  {
    q: "Do I need continuing education to renew a Texas eyelash extension license?",
    a: "TDLR has not published a clear answer for specialty licences. Since September 1, 2025 the Department requires 4 hours of approved CE — 1 hour sanitation, 1 hour human trafficking awareness, 2 hours elective — but its published material names Barber and Cosmetology Operator licensees specifically, while the continuing education page refers to 'your license' without qualifying it. Confirm your own requirement with TDLR before you renew rather than assuming either way.",
  },
  {
    q: "What happens if my Texas eyelash extension license expires?",
    a: "You cannot legally practise on an expired licence, and continuing to do so can bring penalties and fines. You can still renew late by paying the higher fee — 1.5x within 90 days, 2x from 90 days to 18 months — but past 18 months renewal is generally closed and you have to re-establish eligibility.",
  },
  {
    q: "Why would TDLR refuse to renew my license?",
    a: "The most common reason unrelated to your practice is child support. The Texas Attorney General can place a licence in non-renewable status for arrears of three months or more, a missed repayment schedule, failing to appear after a subpoena, or not complying with a possession or access order. Only the OAG Child Support Division can lift it — TDLR cannot — and you have 20 days from a suspension notice to petition for a hearing.",
  },
];

const STEPS = [
  { t: "Check your licence status and expiry", d: "Confirm the name TDLR holds for you matches your government-issued ID before you start — a mismatch stalls the renewal, not just the exam." },
  { t: "Resolve anything blocking renewal", d: "Non-renewable status from child support arrears has to be cleared by the OAG Child Support Division before TDLR can process anything." },
  { t: "Confirm whether CE applies to you", d: "TDLR's published material does not settle this for specialty licences. Ask before you renew, not after." },
  { t: "Renew online and pay", d: "$50 on time. Renewing late costs 1.5x within 90 days and 2x from 90 days to 18 months." },
];

export default function TexasEyelashExtensionLicenseRenewalPage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 pt-28 pb-16">
        <Link href="/texas-barber-license-requirements-guide" className="mb-6 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Texas Licensing Guide
        </Link>

        <h1 className="mb-3 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          Texas Eyelash Extension License Renewal
        </h1>
        <p className="mb-10 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
          What it costs, how often, what happens if you are late, and the one requirement TDLR has not
          published clearly for eyelash extension specialists. Sourced from the Department&apos;s own renewal pages.
        </p>

        <div className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <DollarSign className="mb-2 h-4 w-4 text-indigo-600" />
            <p className="text-lg font-black text-slate-900">${SPECIALTY_RENEWAL.feeUsd}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">On-time fee</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <CalendarClock className="mb-2 h-4 w-4 text-indigo-600" />
            <p className="text-lg font-black text-slate-900">{SPECIALTY_RENEWAL.termYears} yrs</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Renewal cycle</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <AlertTriangle className="mb-2 h-4 w-4 text-amber-600" />
            <p className="text-lg font-black text-slate-900">$75 / $100</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Late (1.5x / 2x)</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <HelpCircle className="mb-2 h-4 w-4 text-slate-500" />
            <p className="text-lg font-black text-slate-900">CE?</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Unpublished for specialties</p>
          </div>
        </div>

        <section className="mb-12 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-amber-900">
            <HelpCircle className="h-4.5 w-4.5" />
            The continuing education question, answered honestly
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-amber-900/90">
            Since September 1, 2025, TDLR requires 4 hours of approved continuing education to renew —
            one hour of sanitation, one hour of human trafficking awareness, and two elective hours from
            the topics in §83.202.
          </p>
          <p className="mb-3 text-sm leading-relaxed text-amber-900/90">
            <strong>What is not clear is whether that applies to you.</strong> The Department&apos;s
            Barbering &amp; Cosmetology at-a-glance document states the requirement for &ldquo;Barber and
            Cosmetology Operators licensees&rdquo;. Its continuing education page states it for
            &ldquo;your license&rdquo; without naming which. Those are not the same statement, and we are
            not going to resolve it for you by guessing.
          </p>
          <p className="text-sm font-semibold leading-relaxed text-amber-900">
            Ask TDLR directly before you renew — (800) 803-9202 in state, or (512) 463-6599.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-1 text-xl font-black text-slate-900">Renewing, step by step</h2>
          <p className="mb-5 text-sm font-medium text-slate-500">
            TDLR sends a renewal notice, but renewing on time is your responsibility whether it arrives or not.
          </p>
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <li key={s.t} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <p className="text-sm font-black text-slate-900">{i + 1}. {s.t}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.d}</p>
              </li>
            ))}
          </ol>
          <a href={TDLR_RENEW_URL} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold uppercase tracking-wider text-white shadow-md shadow-indigo-600/20 transition-colors hover:bg-indigo-700">
            Renew at TDLR
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>

        <section className="mb-12 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900">
            <ShieldAlert className="h-4.5 w-4.5 text-rose-600" />
            The reason renewals get refused that has nothing to do with your work
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            The Texas Attorney General can put a licence into non-renewable status for child support
            reasons: arrears of three months or more, failing to make payments under a repayment
            schedule, not appearing after a subpoena, or not complying with a court order for possession
            of or access to a child.
          </p>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            TDLR cannot lift it. Only the OAG Child Support Division can — (800) 252-8014 — and you have
            20 days from a suspension notice to petition for a hearing.
          </p>
          <a href={TDLR_OAG_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:underline">
            TDLR: licence denial for non-payment of child support
            <ExternalLink className="h-3 w-3" />
          </a>
        </section>

        <div className="mb-12 flex flex-wrap gap-3">
          <Link href="/texas-eyelash-extension-exam-prep" className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-5 py-3 text-sm font-extrabold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-50">Eyelash Extension Exam Prep</Link>
          <Link href="/texas-eyelash-extension-practical-exam-kit-list" className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-5 py-3 text-sm font-extrabold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-50">Eyelash Extension Kit List</Link>
        </div>

        <div className="mb-12">
          <h2 className="mb-4 text-lg font-black text-slate-900">Other Texas specialty renewals</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/texas-esthetician-license-renewal" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-50">Esthetician Renewal</Link>
            <Link href="/texas-manicurist-license-renewal" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-50">Manicurist Renewal</Link>
            <Link href="/texas-hair-weaving-license-renewal" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-50">Hair Weaving Renewal</Link>
          </div>
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
              {/* Questions derived from this route, so a page renamed or added
            to the same convention is handled without a second edit.
            See lib/agent-invite-questions.ts. */}
        <AgentInvite questions={questionsForSlug("texas-eyelash-extension-license-renewal")!} />

</main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph(
            {
            "@type": "FAQPage",
            "@id": `${SITE_URL}/texas-eyelash-extension-license-renewal#faqpage`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID), mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
          )) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph(
            {
            "@type": "HowTo",
            "@id": `${SITE_URL}/texas-eyelash-extension-license-renewal#howto`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID), author: authorSchema(), name: "Renew a Texas Eyelash Extension License", description: 'Renew your Texas eyelash extension specialist license: the $50 fee, 2-year cycle, late-renewal bands and the TDLR process — plus what TDLR has not published about CE.', estimatedCost: { "@type": "MonetaryAmount", currency: "USD", value: SPECIALTY_RENEWAL.feeUsd }, step: STEPS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.t, text: s.d })) },
          )) }} />
    </div>
  );
}
