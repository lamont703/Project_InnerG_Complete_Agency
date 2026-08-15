import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ListChecks,
  ExternalLink,
  ShoppingBag,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { KitChecklist } from "@/components/tools/kit-checklist";
import { AgentInvite } from "@/components/journey/agent-invite";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";
import { TEXAS_COSMETOLOGY_KIT } from "@/lib/kits/texas-cosmetology";
import { VideoEmbed } from "@/components/shared/video-embed";
import { WRITTEN_EXAM_EPISODE, WRITTEN_EXAM_CONTEXT } from "@/lib/episode-videos";
import { ogImage } from "@/lib/og-cards";
import { ShareLinks } from "@/components/shared/share-links";

export const metadata = {
  title: "Texas Cosmetology State Board Practical Exam Kit Checklist (2026)",
  description:
    "The complete Texas Cosmetology Operator practical exam kit list and printable checklist, sourced from the official PSI/TDLR Candidate Information Bulletin effective January 1, 2026 — which items must be labeled in English, which must not be labeled at all, and all 13 timed stations in order.",
  keywords: [
    "psi cosmetology practical exam texas",
    "cosmetology practical exam texas",
    "texas state board cosmetology practical exam",
    "texas cosmetology practical exam kit list",
    "texas cosmetology practical exam kit list pdf",
    "cosmetology state board kit list 2026",
    "texas cosmetology practical exam steps",
    "psi tdlr cosmetology exam supplies",
    "cosmetology operator practical exam checklist",
  ],
  openGraph: {
    images: ogImage("texas-cosmetology-practical-exam-kit-list"),
    title: "Texas Cosmetology State Board Practical Exam Kit Checklist (2026)",
    description:
      "Every required kit item, the exact must-label vs. do-not-label rules, and all 13 timed stations for the Texas Cosmetology Operator practical exam — sourced from the official PSI/TDLR bulletin effective January 1, 2026.",
  },
  twitter: {
    card: "summary_large_image",
    images: ogImage("texas-cosmetology-practical-exam-kit-list"),
  },
  alternates: { canonical: `${SITE_URL}/texas-cosmetology-practical-exam-kit-list` },
};

const FAQS = [
  {
    q: "How long is the Texas cosmetology practical exam, and what score do I need to pass?",
    a: "As of the January 1, 2026 Candidate Information Bulletin, the practical exam runs 3 hours and 31 minutes across 13 sections, worth 119 total points. You need 70% — 84 of 119 points — to pass.",
  },
  {
    q: "Do I need a live model for the Texas cosmetology practical exam?",
    a: "No. The practical exam is performed entirely on mannequins — a mannequin head for the hair services and a mannequin hand (with tips representing the natural nail) for the nail service. Live models are not required or allowed.",
  },
  {
    q: "Which kit items must be labeled in English, and which can't be labeled at all?",
    a: "The bulletin gives two explicit lists. Products — disinfectant, hand sanitizer, cleansing/massage/moisturizer/protective products, cuticle oil, nail adhesive and dehydrator, odorless monomer, polymer powder, simulated perm/chemical/soft-wax products, water spray bottle, blood-exposure kit, and trash bags — MUST be labeled in English. Tools — blow dryer, curling iron, shears, combs, clips, foils, perm rods, mannequins, nail files, and more — must NOT be labeled. Numbering any item is never allowed.",
  },
  {
    q: "Can I put markings or coloring on the mannequin's scalp or hairline to guide my work?",
    a: "No. No markings or colorings are permitted around the mannequin's hair, scalp, hairline, hands, or fingers. Bringing a marked mannequin can forfeit the points for every section using it.",
  },
  {
    q: "Where can I find the official, most current kit list?",
    a: "This page is built from the PSI Cosmetology Operator Candidate Information Bulletin effective January 1, 2026 — the same document TDLR and PSI use to administer the exam. Requirements are updated periodically, so confirm against your own bulletin at psiexams.com before your exam date.",
  },
];

// Kit contents, timed stations and conduct rules live in lib/kits/ so this
// page and anything else that needs them read one source. Destructured to
// the original local names — the markup below is unchanged.
const { groups: KIT_GROUPS, providedOnSite: PROVIDED_ON_SITE, sections: SECTIONS, rules: RULES } = TEXAS_COSMETOLOGY_KIT;

export default function CosmetologyPracticalExamKitListPage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <style dangerouslySetInnerHTML={{ __html: `@media print { .no-print { display: none !important; } main { padding-top: 0 !important; } a[href]:after { content: ""; } }` }} />
      <div className="no-print">
        <Navbar />
      </div>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-10 sm:pb-14">
        <Link
          href="/texas-cosmetology-exam-intelligence-prep"
          className="no-print inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary hover:underline mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Exam Intelligence Hub
        </Link>

        <div className="mb-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
            <ListChecks className="w-3 h-3" />
            Updated for the Jan 1, 2026 exam
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-3">
            Texas Cosmetology Practical Exam Kit List &amp; Checklist
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl">
            Every item, the exact must-label vs. do-not-label rules, and all 13 timed stations for the Texas
            Cosmetology Operator practical exam, administered by PSI on behalf of TDLR — sourced directly from the
            official PSI Candidate Information Bulletin effective January 1, 2026.
          </p>

          <ShareLinks title="Texas Cosmetology Practical Exam Kit Checklist" className="mt-8 mb-2" />
        </div>

        {/* Exam Structure */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <Clock className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">3h 31m</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Total Exam Length</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ShieldCheck className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">70%</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Passing Score (84/119 pts)</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ListChecks className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">13</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Sections</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">119</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Total Points</p>
          </div>
        </div>

        {/* Interactive + printable checklist */}
        <KitChecklist groups={KIT_GROUPS} />


        <VideoEmbed
          videoId={WRITTEN_EXAM_EPISODE.videoId}
          title={WRITTEN_EXAM_EPISODE.title}
          description={WRITTEN_EXAM_EPISODE.description}
          duration={WRITTEN_EXAM_EPISODE.duration}
          uploadDate={WRITTEN_EXAM_EPISODE.uploadDate}
          context={WRITTEN_EXAM_CONTEXT.practicalKit}
        />

        <AgentInvite
          questions={[
            "What's the first-attempt pass rate at my cosmetology school?",
            "How do Texas cosmetology schools compare on written exam pass rates?",
            "Which salons near me are hiring newly licensed operators?",
          ]}
        />
        {/* Provided on site */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-6 mb-10">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-3">
            Already provided at the exam site — don&apos;t bring these
          </h3>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {PROVIDED_ON_SITE.map((item) => (
              <li key={item} className="text-sm text-slate-600">
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Step order */}
        <div className="mb-10">
          <h2 className="text-xl font-black text-slate-900 mb-1">Station-by-station step order</h2>
          <p className="text-sm text-slate-500 font-medium mb-5">
            Every task must be performed in this exact order — the time allotted for each section includes setup
            and cleanup, and you cannot leave the exam area once you&apos;ve signed in.
          </p>
          <div className="space-y-3">
            {SECTIONS.map((section, i) => (
              <div key={section.name} className="bg-white border border-slate-200 rounded-2xl shadow-sm px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-sm font-black text-slate-900">
                    {i + 1}. {section.name}
                  </h3>
                  <span className="shrink-0 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5 whitespace-nowrap">
                    {section.time}
                  </span>
                </div>
                <ul className="space-y-1">
                  {section.notes.map((note) => (
                    <li key={note} className="text-xs text-slate-600 leading-relaxed">
                      • {note}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Rules */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-6 mb-10">
          <h2 className="flex items-center gap-2 text-lg font-black text-amber-900 mb-4">
            <AlertTriangle className="w-4.5 h-4.5" />
            Rules that cost candidates real points
          </h2>
          <ul className="space-y-2.5">
            {RULES.map((rule) => (
              <li key={rule} className="text-sm text-amber-900/90 leading-relaxed flex gap-2">
                <span className="shrink-0">•</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Where to get your kit */}
        <div className="bg-white border border-slate-200 rounded-2xl px-6 py-6 mb-10">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 mb-3">
            <ShoppingBag className="w-4.5 h-4.5 text-indigo-600" />
            Where to get your kit
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            You can assemble this kit yourself from what you already used in school, or buy a pre-packed Texas
            cosmetology state-board kit from a beauty-supply vendor. If you buy one, verify it against the list
            above first — the exam bulletin was updated January 1, 2026, and not every vendor kit matches the
            current stations.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 mb-10 text-sm text-slate-600 leading-relaxed">
          This list is drawn directly from the official PSI Cosmetology Operator Candidate Information Bulletin
          effective January 1, 2026 — the same document TDLR and PSI use to administer the exam. Requirements are
          occasionally updated; always confirm current kit requirements against your own Candidate Information
          Bulletin at{" "}
          <a
            href="https://www.psiexams.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 font-bold hover:underline inline-flex items-center gap-1"
          >
            psiexams.com
            <ExternalLink className="w-3 h-3" />
          </a>{" "}
          before your exam date.
        </div>

        <div className="no-print flex flex-wrap gap-3 mb-16">
          <Link
            href="/tools/texas-cosmetology-exam-practice-deck"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm uppercase tracking-wider transition-colors shadow-md shadow-indigo-600/20"
          >
            Practice the Written Exam
          </Link>
          <Link
            href="/texas-barber-state-board-practical-exam-kit-list"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
          >
            View Barber Kit List
          </Link>
          <Link
            href="/texas-eyelash-extension-practical-exam-kit-list"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
          >
            View Eyelash Extension Kit List
          </Link>
          <Link
            href="/texas-hair-weaving-practical-exam-kit-list"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
          >
            View Hair Weaving Kit List
          </Link>
          <Link
            href="/texas-cosmetology-license-requirements-guide"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
          >
            Cosmetology Requirements
          </Link>
          <Link
            href="/texas-cosmetology-license-renewal"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
          >
            Cosmetology Renewal
          </Link>
          <Link
            href="/texas-california-license-reciprocity"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
          >
            Moving States?
          </Link>
        </div>

        <div className="border-t border-slate-200 pt-10">
          <h2 className="text-xl font-black text-slate-900 mb-6">Common Questions</h2>
          <div className="space-y-6">
            {FAQS.map((faq) => (
              <div key={faq.q}>
                <h3 className="text-sm font-black text-slate-900 mb-1.5">{faq.q}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
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
            "@id": `${SITE_URL}/texas-cosmetology-practical-exam-kit-list#faqpage`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            mainEntity: FAQS.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: faq.a },
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
            "@type": "HowTo",
            "@id": `${SITE_URL}/texas-cosmetology-practical-exam-kit-list#howto`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            name: "Texas Cosmetology Operator Practical Exam — Station Order",
            description:
              "The 13 timed sections of the Texas Cosmetology Operator practical exam in order, per the PSI/TDLR Candidate Information Bulletin effective January 1, 2026.",
            totalTime: "PT3H31M",
            step: SECTIONS.map((s, i) => ({
              "@type": "HowToStep",
              position: i + 1,
              name: s.name,
              text: s.notes.join(" "),
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
            "@type": "ItemList",
            "@id": `${SITE_URL}/texas-cosmetology-practical-exam-kit-list#itemlist`,
            name: "Texas Cosmetology Practical Exam Kit List (2026)",
            itemListElement: KIT_GROUPS.flatMap((g) => g.items).map((item, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: item.label,
            })),
          },
          )),
        }}
      />
    </div>
  );
}
