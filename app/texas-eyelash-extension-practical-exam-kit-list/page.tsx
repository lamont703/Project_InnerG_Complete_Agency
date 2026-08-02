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
import { KitChecklist, type KitGroup } from "@/components/tools/kit-checklist";

/**
 * Sourced from public/TexasEyelashCIB2026.pdf — the PSI Eyelash Extension
 * Candidate Information Bulletin effective January 1, 2026. Every number on
 * this page (57 minutes, 36 points, 26 to pass, the two labeling lists, the
 * four sections and their times) is read from that document rather than
 * inferred from the sibling disciplines, which differ.
 *
 * Title and description are deliberately shorter than the older kit pages.
 * Those run 74-90 characters and lose "| Inner G Complete" to truncation in
 * every result; this one fits inside what Google actually displays.
 */
export const metadata = {
  title: "Texas Eyelash Extension Practical Exam Kit List (2026)",
  description:
    "Every kit item for the Texas eyelash extension practical exam, what must be labeled, and all 4 timed sections — from the Jan 1, 2026 PSI/TDLR bulletin.",
  keywords: [
    "texas eyelash extension practical exam",
    "eyelash extension practical exam texas",
    "texas eyelash extension kit list",
    "texas lash extension state board kit",
    "eyelash extension exam supplies texas",
    "psi tdlr eyelash extension exam",
    "texas eyelash technician practical exam",
    "eyelash extension practical exam checklist",
  ],
  openGraph: {
    title: "Texas Eyelash Extension Practical Exam Kit List (2026)",
    description:
      "Every required kit item, the must-label vs. do-not-label rules, and all 4 timed sections for the Texas eyelash extension practical exam — from the official PSI/TDLR bulletin effective January 1, 2026.",
  },
  alternates: {
    canonical: "https://agency.innergcomplete.com/texas-eyelash-extension-practical-exam-kit-list",
  },
};

const FAQS = [
  {
    q: "How long is the Texas eyelash extension practical exam, and what score do I need to pass?",
    a: "As of the January 1, 2026 Candidate Information Bulletin, the practical exam runs 57 minutes across 4 sections and is worth 36 points. You need 70% — 26 of 36 points — to pass. The written exam is 40 scored items in 55 minutes.",
  },
  {
    q: "What do you actually have to do on the Texas eyelash extension practical exam?",
    a: "One graded service between setup and cleanup. You prepare the mannequin, protect the lower lashes, apply six individual extensions one at a time, and demonstrate separation — then perform a blood exposure incident procedure. The extension application section alone is 25 minutes of the 57.",
  },
  {
    q: "Which eyelash kit items must be labeled in English, and which can't be labeled at all?",
    a: "Only six items must be labeled: the 30\" x 30\" kit itself (marked \"Pre-sanitized, Clean or Disinfected\"), lash adhesive, blood exposure kit, EPA-approved disinfectant or simulated product, hand sanitizer, and trash bags. Everything else — adhesive holder, tweezers, small scissors, under-eye pads, individual eyelashes, gloves, drapes, head draping, the mannequin head and stand, paper towels, and optional glasses — must NOT be labeled. Numbering any item is never allowed.",
  },
  {
    q: "What does the mannequin head need to look like for the eyelash exam?",
    a: "It must be prepped with an eyelash strip to represent natural lashes. No markings or colorings around the mannequin's hair, scalp, hairline, hands or fingers are permitted — a marked mannequin loses you the points for every section that uses it.",
  },
  {
    q: "What happens if I'm missing a required kit item on exam day?",
    a: "You bring everything yourself and cannot leave the exam area once you have signed in. A missing or non-approved item means you lose the points for any step that needs it. Check every item on this list against your bag the night before.",
  },
  {
    q: "Where can I find the official, most current eyelash extension kit list?",
    a: "This page is built from the PSI Eyelash Extension Candidate Information Bulletin effective January 1, 2026. Requirements are updated periodically, so confirm against your own bulletin at psiexams.com before your exam date.",
  },
];

const KIT_GROUPS: KitGroup[] = [
  {
    title: "Products & containers you must bring",
    mustLabel: true,
    note: "Label each in English (manufacturer labels are acceptable; numbering of any kind is not allowed).",
    items: [
      { label: "Kit / bag", hint: 'A 30" × 30" kit labeled "Pre-sanitized, Clean or Disinfected"' },
      { label: "Lash adhesive" },
      { label: "Blood exposure kit / first-aid kit" },
      { label: "EPA-approved disinfectant (or simulated product)" },
      { label: "Hand sanitizer" },
      { label: "Trash bag(s)" },
    ],
  },
  {
    title: "Tools & disposables you must bring",
    mustLabel: false,
    note: "Do NOT label these — labeling a do-not-label item can lose points.",
    items: [
      { label: "Mannequin head", hint: "Prepped with an eyelash strip to represent natural lashes" },
      { label: "Mannequin stand or tripod" },
      { label: "Individual eyelashes" },
      { label: "Adhesive holder" },
      { label: "Tweezers" },
      { label: "Small scissors" },
      { label: "Under-eye pads" },
      { label: "Gloves" },
      { label: "Drape(s)" },
      { label: "Head draping" },
      { label: "Paper towels" },
      { label: "Glasses / specs", hint: "Optional" },
    ],
  },
];

const PROVIDED_ON_SITE = ["Work area and chair", "Covered trash cans", "Mounted wall clock", "Brooms and dust pans"];

const SECTIONS = [
  {
    name: "Pre-Exam Set Up & Disinfection",
    time: "10 min",
    notes: ["Disinfect work surfaces, dispose of waste material, keep the kit sanitary, avoid cross contamination"],
  },
  {
    name: "Eyelash Extension Application",
    time: "25 min",
    notes: [
      "Sanitize hands, prepare the mannequin, protect the lower lashes, prepare for application",
      "Apply six individual extensions — each one is scored separately",
      "Demonstrate separation",
    ],
  },
  {
    name: "Blood Exposure Incident",
    time: "12 min",
    notes: ["Gloves on, clean the simulated cut, bandage it, dispose of used materials, sanitize hands"],
  },
  {
    name: "End of Exam Disinfection",
    time: "10 min",
    notes: ["Dispose of used materials, disinfect and clean the work area, remove all supplies and belongings"],
  },
];

const RULES = [
  "All services are performed on a mannequin head prepped with an eyelash strip — no live models.",
  "All tasks must be performed in the order listed. Steps out of order, or not completed in the time allowed, are not scored.",
  "Follow the bulletin's two labeling lists exactly: label the six required products in English, but do NOT label tools or disposables. Numbering any item is never allowed; an identifying bag for a service is fine.",
  "No markings or colorings around the mannequin's hair, scalp, hairline, hands or fingers — a marked mannequin loses the points for every section that uses it.",
  "Cheat sheets and written notes — including numbered items or a bag with a written supply list — are prohibited and cost points across all Procedure Criteria.",
  "Step back and raise your hand at the end of each section to signal completion.",
  "Cell phones are not allowed in the practical room, and anything left behind is discarded.",
];

export default function EyelashExtensionPracticalExamKitListPage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <style dangerouslySetInnerHTML={{ __html: `@media print { .no-print { display: none !important; } main { padding-top: 0 !important; } a[href]:after { content: ""; } }` }} />
      <div className="no-print">
        <Navbar />
      </div>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-10 sm:pb-14">
        <Link
          href="/texas-barber-license-requirements-guide"
          className="no-print inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary hover:underline mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Texas Licensing Guide
        </Link>

        <div className="mb-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
            <ListChecks className="w-3 h-3" />
            Updated for the Jan 1, 2026 exam
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-3">
            Texas Eyelash Extension Practical Exam Kit List &amp; Checklist
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl">
            Every item, the exact must-label vs. do-not-label rules, and all 4 timed sections for the Texas eyelash
            extension practical exam, administered by PSI on behalf of TDLR — sourced directly from the official PSI
            Candidate Information Bulletin effective January 1, 2026.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <Clock className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">57m</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Total Exam Length</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ShieldCheck className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">70%</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Passing Score (26/36 pts)</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ListChecks className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">4</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Timed Sections</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">36</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Total Points</p>
          </div>
        </div>

        <KitChecklist groups={KIT_GROUPS} />

        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-6 mb-10">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-3">
            Already provided at the exam site — don&apos;t bring these
          </h3>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {PROVIDED_ON_SITE.map((item) => (
              <li key={item} className="text-sm text-slate-600">{item}</li>
            ))}
          </ul>
        </div>

        <div className="mb-10">
          <h2 className="text-xl font-black text-slate-900 mb-1">Station-by-station step order</h2>
          <p className="text-sm text-slate-500 font-medium mb-5">
            Every task must be performed in this exact order — the time allotted for each section includes setup and
            cleanup, and you cannot leave the exam area once you&apos;ve signed in.
          </p>
          <div className="space-y-3">
            {SECTIONS.map((section, i) => (
              <div key={section.name} className="bg-white border border-slate-200 rounded-2xl shadow-sm px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-sm font-black text-slate-900">{i + 1}. {section.name}</h3>
                  <span className="shrink-0 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5 whitespace-nowrap">
                    {section.time}
                  </span>
                </div>
                <ul className="space-y-1">
                  {section.notes.map((note) => (
                    <li key={note} className="text-xs text-slate-600 leading-relaxed">• {note}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

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

        <div className="bg-white border border-slate-200 rounded-2xl px-6 py-6 mb-10">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 mb-3">
            <ShoppingBag className="w-4.5 h-4.5 text-indigo-600" />
            Where to get your kit
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            You can assemble this kit yourself from what you already used in training, or buy a pre-packed Texas
            eyelash extension state-board kit from a beauty-supply vendor. If you buy one, verify it against the list
            above first — this is a short kit, and a missing adhesive holder or set of under-eye pads costs the same
            points as a missing product.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 mb-10 text-sm text-slate-600 leading-relaxed">
          This list is drawn directly from the official PSI Eyelash Extension Candidate Information Bulletin effective
          January 1, 2026 — the same document TDLR and PSI use to administer the exam. Requirements are occasionally
          updated; always confirm current kit requirements against your own Candidate Information Bulletin at{" "}
          <a href="https://www.psiexams.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline inline-flex items-center gap-1">
            psiexams.com
            <ExternalLink className="w-3 h-3" />
          </a>{" "}
          before your exam date.
        </div>

        <div className="no-print flex flex-wrap gap-3 mb-16">
          <Link
            href="/texas-hair-weaving-practical-exam-kit-list"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm uppercase tracking-wider transition-colors shadow-md shadow-indigo-600/20"
          >
            View Hair Weaving Kit List
          </Link>
          <Link
            href="/texas-esthetician-practical-exam-kit-list"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
          >
            View Esthetician Kit List
          </Link>
          <Link
            href="/texas-eyelash-extension-exam-prep"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
          >
            Eyelash Exam Prep
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

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })) }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "HowTo", name: "Texas Eyelash Extension Practical Exam — Station Order", description: "The 4 timed sections of the Texas eyelash extension practical exam in order, per the PSI/TDLR Candidate Information Bulletin effective January 1, 2026.", totalTime: "PT57M", step: SECTIONS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.notes.join(" ") })) }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "ItemList", name: "Texas Eyelash Extension Practical Exam Kit List (2026)", itemListElement: KIT_GROUPS.flatMap((g) => g.items).map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.label })) }) }} />
    </div>
  );
}
