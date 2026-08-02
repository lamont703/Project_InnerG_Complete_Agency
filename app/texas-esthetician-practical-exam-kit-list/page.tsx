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

export const metadata = {
  title: "Texas Esthetician Practical Exam Kit List & Checklist (2026)",
  description:
    "The complete Texas Esthetician practical exam kit list and printable checklist, sourced from the official PSI/TDLR Candidate Information Bulletin effective January 1, 2026 — which items must be labeled in English, which must not be labeled, and all 8 timed stations in order.",
  keywords: [
    "texas esthetician practical exam",
    "esthetician practical exam texas",
    "texas esthetician practical exam kit list",
    "texas esthetician exam kit list pdf",
    "esthetician state board kit list texas",
    "texas esthetician practical exam steps",
    "psi tdlr esthetician exam supplies",
    "esthetician practical exam checklist texas",
  ],
  openGraph: {
    title: "Texas Esthetician Practical Exam Kit List & Checklist (2026)",
    description:
      "Every required kit item, the must-label vs. do-not-label rules, and all 8 timed stations for the Texas Esthetician practical exam — sourced from the official PSI/TDLR bulletin effective January 1, 2026.",
  },
  alternates: { canonical: "https://agency.innergcomplete.com/texas-esthetician-practical-exam-kit-list" },
};

const FAQS = [
  {
    q: "How long is the Texas esthetician practical exam, and what score do I need to pass?",
    a: "As of the January 1, 2026 Candidate Information Bulletin, the practical exam runs 1 hour and 41 minutes across 8 sections, worth 76 total points. You need 70% — 54 of 76 points — to pass. The written exam is 75 scored items in 105 minutes (also 70% to pass).",
  },
  {
    q: "What services are tested on the Texas esthetician practical exam?",
    a: "Six graded services plus setup and cleanup: a cleansing service, a steaming service, massage manipulations, a mask and moisturizing service, a soft-wax waxing service on one eyebrow, and a blood exposure incident procedure — performed in that exact order.",
  },
  {
    q: "Which kit items must be labeled in English, and which can't be labeled at all?",
    a: "Products — your disinfectant, hand sanitizer, cleansing product, astringent, antiseptic lotion, eye makeup remover, mask/pack product, massage product, moisturizer, simulated soft wax, and blood-exposure kit — MUST be labeled in English. Tools and disposables — drapes, gloves or finger cots, mask brush, fabric strips, cotton, applicators, mannequin stand, towels — must NOT be labeled. Numbering any item is never allowed.",
  },
  {
    q: "What happens if I'm missing a required kit item on exam day?",
    a: "You bring everything yourself and can't leave the exam area once you've signed in. Missing or non-approved items — or a prohibited aerosol product — mean you lose the points for any step requiring that item. Check every item against your bag the night before.",
  },
  {
    q: "Where can I find the official, most current kit list?",
    a: "This page is built from the PSI Esthetician Candidate Information Bulletin effective January 1, 2026. Requirements are updated periodically, so confirm against your own bulletin at psiexams.com before your exam date.",
  },
];

const KIT_GROUPS: KitGroup[] = [
  {
    title: "Products & containers you must bring",
    mustLabel: true,
    note: "Label each in English (manufacturer labels are acceptable; numbering of any kind is not allowed).",
    items: [
      { label: "Kit / bag", hint: 'A 30" × 30" kit labeled "Pre-sanitized, Clean or Disinfected"' },
      { label: "EPA-approved disinfectant (or simulated product)" },
      { label: "Hand sanitizer" },
      { label: "Cleansing product" },
      { label: "Antiseptic / soothing lotion" },
      { label: "Astringent, freshener, or toner" },
      { label: "Eye makeup remover" },
      { label: "Mask or pack product" },
      { label: "Massage product" },
      { label: "Moisturizer" },
      { label: "Simulated soft-wax product for waxing", hint: "e.g. petroleum jelly or honey" },
      { label: "Blood exposure kit / first-aid kit" },
      { label: "Trash bag(s)" },
    ],
  },
  {
    title: "Tools & disposables you must bring",
    mustLabel: false,
    note: "Do NOT label these — labeling a do-not-label item can lose points.",
    items: [
      { label: "Mannequin with stand or tripod" },
      { label: "Mask brush" },
      { label: "Fabric strips", hint: "Soft-wax removal" },
      { label: "Cotton / cotton pads / sponges / facial tissue" },
      { label: "Disposable applicators" },
      { label: "Gloves or finger cots" },
      { label: "Drape(s)" },
      { label: "Head draping" },
      { label: "Paper towels" },
      { label: "Towels" },
      { label: "Bowl for water (optional)" },
    ],
  },
];

const PROVIDED_ON_SITE = ["Work area and chair", "Covered trash cans", "Mounted wall clock", "Brooms and dust pans"];

const SECTIONS = [
  { name: "Pre-Exam Set Up & Disinfection", time: "10 min", notes: ["Disinfect work surfaces, dispose of waste, kit remains sanitary"] },
  { name: "Cleansing", time: "14 min", notes: ["Perform a cleansing service on the mannequin"] },
  { name: "Steaming", time: "7 min", notes: ["Perform a steaming service"] },
  { name: "Massage", time: "17 min", notes: ["Demonstrate massage manipulations"] },
  { name: "Mask & Moisturizing", time: "17 min", notes: ["Perform a mask and moisturizing service"] },
  { name: "Waxing with Soft Wax", time: "14 min", notes: ["Apply a simulated soft-wax product to one eyebrow — application, fabric strip, removal, post-wax product"] },
  { name: "Blood Exposure Incident", time: "12 min", notes: ["Full procedure on a simulated cut — gloves, pressure, cleaning, bandaging, disposal"] },
  { name: "End of Exam Disinfection", time: "10 min", notes: ["Dispose of materials, disinfect the workstation, remove all supplies and belongings"] },
];

const RULES = [
  "All services are performed on a mannequin — no live models.",
  "All tasks must be performed in the order listed — steps out of order, or not completed within the allotted time, are not scored.",
  "Follow the bulletin's two labeling lists exactly: label the required products in English, but do NOT label tools/disposables. Numbering any item is never allowed; an identifying bag for a service is fine.",
  "Cheat sheets and written notes — including numbered bags or bags with a written supply list — are prohibited and cost points across all Procedure Criteria.",
  "Aerosol products are not permitted.",
  "Raise your hand at the end of each section to signal completion.",
  "Cell phones are not allowed in the practical room, and anything left behind is discarded.",
];

export default function EstheticianPracticalExamKitListPage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <style dangerouslySetInnerHTML={{ __html: `@media print { .no-print { display: none !important; } main { padding-top: 0 !important; } a[href]:after { content: ""; } }` }} />
      <div className="no-print">
        <Navbar />
      </div>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-10 sm:pb-14">
        <Link
          href="/insights/texas-esthetician-nail-technician-exam-guide"
          className="no-print inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary hover:underline mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Esthetician & Nail Exam Guide
        </Link>

        <div className="mb-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
            <ListChecks className="w-3 h-3" />
            Updated for the Jan 1, 2026 exam
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-3">
            Texas Esthetician Practical Exam Kit List &amp; Checklist
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl">
            Every item, the exact must-label vs. do-not-label rules, and all 8 timed stations for the Texas
            Esthetician practical exam, administered by PSI on behalf of TDLR — sourced directly from the official
            PSI Candidate Information Bulletin effective January 1, 2026.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <Clock className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">1h 41m</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Total Exam Length</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ShieldCheck className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">70%</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Passing Score (54/76 pts)</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ListChecks className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">8</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Timed Sections</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">76</p>
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
            Every task must be performed in this exact order — the time allotted for each section includes setup
            and cleanup, and you cannot leave the exam area once you&apos;ve signed in.
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
            You can assemble this kit yourself from what you already used in school, or buy a pre-packed Texas
            esthetician state-board kit from a beauty-supply vendor. If you buy one, verify it against the list
            above first — confirm it matches the January 1, 2026 bulletin.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 mb-10 text-sm text-slate-600 leading-relaxed">
          This list is drawn directly from the official PSI Esthetician Candidate Information Bulletin effective
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
            href="/texas-manicurist-practical-exam-kit-list"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm uppercase tracking-wider transition-colors shadow-md shadow-indigo-600/20"
          >
            View Manicurist Kit List
          </Link>
          <Link
            href="/texas-cosmetology-practical-exam-kit-list"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
          >
            View Cosmetology Kit List
          </Link>
          <Link
            href="/texas-eyelash-extension-practical-exam-kit-list"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
          >
            View Eyelash Extension Kit List
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "HowTo", name: "Texas Esthetician Practical Exam — Station Order", description: "The 8 timed sections of the Texas Esthetician practical exam in order, per the PSI/TDLR Candidate Information Bulletin effective January 1, 2026.", totalTime: "PT1H41M", step: SECTIONS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.notes.join(" ") })) }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "ItemList", name: "Texas Esthetician Practical Exam Kit List (2026)", itemListElement: KIT_GROUPS.flatMap((g) => g.items).map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.label })) }) }} />
    </div>
  );
}
