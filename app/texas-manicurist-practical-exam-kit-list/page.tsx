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
  title: "Texas Manicurist (Nail Tech) Practical Exam Kit List & Checklist (2026)",
  description:
    "The complete Texas Manicurist / nail technician practical exam kit list and printable checklist, sourced from the official PSI/TDLR Candidate Information Bulletin effective January 1, 2026 — which items must be labeled, which must not, and all 6 timed stations in order.",
  keywords: [
    "texas manicurist practical exam",
    "nail technician practical exam texas",
    "texas manicurist practical exam kit list",
    "texas nail tech exam kit list pdf",
    "texas manicurist exam kit list pdf",
    "nail technician state board kit list texas",
    "psi tdlr manicurist exam supplies",
    "texas manicurist practical exam steps",
  ],
  openGraph: {
    title: "Texas Manicurist (Nail Tech) Practical Exam Kit List & Checklist (2026)",
    description:
      "Every required kit item, the must-label vs. do-not-label rules, and all 6 timed stations for the Texas Manicurist practical exam — sourced from the official PSI/TDLR bulletin effective January 1, 2026.",
  },
  alternates: { canonical: "https://agency.innergcomplete.com/texas-manicurist-practical-exam-kit-list" },
};

const FAQS = [
  {
    q: "How long is the Texas manicurist practical exam, and what score do I need to pass?",
    a: "As of the January 1, 2026 Candidate Information Bulletin, the practical exam runs 1 hour and 21 minutes across 6 sections, worth 51 total points. You need 70% — 36 of 51 points — to pass. The written exam is 60 scored items in 90 minutes (also 70% to pass).",
  },
  {
    q: "What services are tested on the Texas manicurist practical exam?",
    a: "Three graded nail services plus setup and cleanup: a manicure, a tip application on one nail, and a nail enhancement with a form on one finger, followed by a blood exposure incident procedure — performed in that exact order on a mannequin hand.",
  },
  {
    q: "Does the nail liquid (monomer) have to be odorless?",
    a: "Yes. Examiners check your nail liquid before the exam — only bottles clearly marked \"odorless\" by the manufacturer are allowed. If it isn't odorless you can't use it, and you lose the points for those tasks. Trainer hands for nail procedures are not permitted; you use a mannequin hand prepped with tips.",
  },
  {
    q: "Which kit items must be labeled in English, and which can't be labeled at all?",
    a: "Products — your disinfectant, hand sanitizer, cuticle oil, cuticle remover, nail adhesive, nail dehydrator, odorless monomer with low-odor primer, polymer powder, and blood-exposure kit — MUST be labeled in English. Tools — nail files/buffers, cuticle pusher and nippers, application brush, dappen dish, finger bowl, orangewood stick, nail tips and forms, tip cutter, the mannequin hand — must NOT be labeled. Numbering any item is never allowed.",
  },
  {
    q: "Where can I find the official, most current kit list?",
    a: "This page is built from the PSI Manicurist Candidate Information Bulletin effective January 1, 2026. Requirements are updated periodically, so confirm against your own bulletin at psiexams.com before your exam date.",
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
      { label: "Cuticle oil" },
      { label: "Cuticle remover" },
      { label: "Nail adhesive" },
      { label: "Nail dehydrator / cleanser" },
      { label: "Odorless monomer + low-odor primer for one nail", hint: 'Only bottles marked "odorless" by the manufacturer are allowed' },
      { label: "Polymer powder" },
      { label: "Blood exposure kit / first-aid kit" },
      { label: "Trash bag(s)" },
    ],
  },
  {
    title: "Tools & implements you must bring",
    mustLabel: false,
    note: "Do NOT label these — labeling a do-not-label item can lose points.",
    items: [
      { label: "Mannequin hand", hint: "Prepped with tips to represent the natural nail" },
      { label: "Nail tips" },
      { label: "Nail forms" },
      { label: "Tip cutter / large nail clipper" },
      { label: "Abrasives / nail files and buffers" },
      { label: "Cuticle pusher" },
      { label: "Cuticle nippers" },
      { label: "Orangewood stick" },
      { label: "Application brush" },
      { label: "Dappen dish" },
      { label: "Finger bowl" },
      { label: "Cotton / cotton pads" },
      { label: "Paper towels" },
      { label: "Towels" },
    ],
  },
];

const PROVIDED_ON_SITE = ["Work area and chair", "Covered trash cans", "Mounted wall clock", "Brooms and dust pans"];

const SECTIONS = [
  { name: "Pre-Exam Set Up & Disinfection", time: "10 min", notes: ["Disinfect work surfaces, dispose of waste, kit remains sanitary"] },
  { name: "Manicure", time: "15 min", notes: ["Perform a manicure on the mannequin hand"] },
  { name: "Tip Application on One Nail", time: "12 min", notes: ["Apply a tip to one finger"] },
  { name: "Nail Enhancement with Form", time: "22 min", notes: ["Apply a nail enhancement with a form to one finger"] },
  { name: "Blood Exposure Incident", time: "12 min", notes: ["Full procedure on a simulated cut — gloves, pressure, cleaning, bandaging, disposal"] },
  { name: "End of Exam Disinfection", time: "10 min", notes: ["Dispose of materials, disinfect the workstation, remove all supplies and belongings"] },
];

const RULES = [
  "All procedures are performed on a mannequin hand prepped with tips — trainer hands are not permitted, and there are no live models.",
  "Nail liquid must be odorless (examiners check before the exam) or you can't use it and lose those points.",
  "All tasks must be performed in the order listed — steps out of order, or not completed within the allotted time, are not scored.",
  "Follow the bulletin's two labeling lists exactly: label the required products in English, but do NOT label tools/implements. Numbering any item is never allowed; an identifying bag for a service is fine.",
  "Cheat sheets and written notes — including numbered bags or bags with a written supply list — are prohibited and cost points across all Procedure Criteria.",
  "Aerosol products are not permitted.",
  "Raise your hand at the end of each section to signal completion.",
  "Cell phones are not allowed in the practical room, and anything left behind is discarded.",
];

export default function ManicuristPracticalExamKitListPage() {
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
            Texas Manicurist Practical Exam Kit List &amp; Checklist
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl">
            Every item, the exact must-label vs. do-not-label rules, and all 6 timed stations for the Texas
            Manicurist (nail technician) practical exam, administered by PSI on behalf of TDLR — sourced directly
            from the official PSI Candidate Information Bulletin effective January 1, 2026.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <Clock className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">1h 21m</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Total Exam Length</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ShieldCheck className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">70%</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Passing Score (36/51 pts)</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ListChecks className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">6</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Timed Sections</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">51</p>
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
            manicurist state-board kit from a beauty-supply vendor. If you buy one, verify it against the list
            above first — and make sure your monomer is clearly marked odorless.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 mb-10 text-sm text-slate-600 leading-relaxed">
          This list is drawn directly from the official PSI Manicurist Candidate Information Bulletin effective
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
            href="/texas-esthetician-practical-exam-kit-list"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm uppercase tracking-wider transition-colors shadow-md shadow-indigo-600/20"
          >
            View Esthetician Kit List
          </Link>
          <Link
            href="/texas-cosmetology-practical-exam-kit-list"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
          >
            View Cosmetology Kit List
          </Link>
          <Link
            href="/texas-hair-weaving-practical-exam-kit-list"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
          >
            View Hair Weaving Kit List
          </Link>
          <Link
            href="/texas-manicurist-exam-prep"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
          >
            Manicurist Exam Prep
          </Link>
          <Link
            href="/texas-manicurist-license-requirements-guide"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
          >
            Manicurist Requirements
          </Link>
          <Link
            href="/texas-manicurist-license-renewal"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
          >
            Manicurist Renewal
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "HowTo", name: "Texas Manicurist Practical Exam — Station Order", description: "The 6 timed sections of the Texas Manicurist practical exam in order, per the PSI/TDLR Candidate Information Bulletin effective January 1, 2026.", totalTime: "PT1H21M", step: SECTIONS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.notes.join(" ") })) }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "ItemList", name: "Texas Manicurist Practical Exam Kit List (2026)", itemListElement: KIT_GROUPS.flatMap((g) => g.items).map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.label })) }) }} />
    </div>
  );
}
