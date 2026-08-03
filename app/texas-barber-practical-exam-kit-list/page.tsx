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
  title: "Texas Barber Practical Exam Kit List & Checklist (2026)",
  description:
    "The complete Texas Class A Barber practical exam kit list and printable checklist, sourced from the official PSI/TDLR Candidate Information Bulletin effective January 1, 2026 — every supply, the exact must-label vs. do-not-label rules, and all 11 timed stations (now including manicure and thermal curling).",
  keywords: [
    "texas barber practical exam",
    "barber practical exam texas",
    "texas barber practical exam kit list",
    "texas barber exam kit list pdf",
    "barber state board kit list 2026",
    "texas barber practical exam steps",
    "psi tdlr barber exam supplies",
    "class a barber practical exam checklist",
  ],
  openGraph: {
    title: "Texas Barber Practical Exam Kit List & Checklist (2026)",
    description:
      "Every required kit item, the exact must-label vs. do-not-label rules, and all 11 timed stations for the Texas Class A Barber practical exam — sourced from the official PSI/TDLR bulletin effective January 1, 2026.",
  },
  alternates: { canonical: "https://agency.innergcomplete.com/texas-barber-practical-exam-kit-list" },
};

const FAQS = [
  {
    q: "How long is the Texas barber practical exam, and what score do I need to pass?",
    a: "As of the January 1, 2026 Candidate Information Bulletin, the practical exam runs 3 hours and 29 minutes across 11 timed sections, worth 163 total points. You need 70% — 115 of 163 points — to pass.",
  },
  {
    q: "Does the Texas barber practical exam really include a manicure now?",
    a: "Yes. The exam updated effective January 1, 2026 added a 22-minute Manicure section performed on a mannequin hand (fingers prepped with tips to represent the natural nail), plus a Blow Drying & Thermal Curling section using an electric curling iron. If your study materials don't mention these, they're based on the older exam.",
  },
  {
    q: "Which kit items have to be labeled, and which must NOT be labeled?",
    a: "The bulletin gives two explicit lists. Products like your disinfectant, hand sanitizer, astringent, cleansing/massage/protective products, shaving cream, simulated chemical and perm products, water spray bottle, blood-exposure kit, and trash bags MUST be labeled in English. Tools like your blow dryer, curling iron, clippers, shears, razor, combs, clips, perm rods, and mannequins must NOT be labeled — and numbering any item is never allowed. Labeling the wrong items loses points.",
  },
  {
    q: "What happens if I'm missing a required kit item on exam day?",
    a: "You are responsible for bringing everything, and you can't leave the exam area once you've signed in. Missing or non-approved items (e.g. a non-approved disinfectant, or an aerosol product, which are prohibited) mean you lose the points for any step requiring that item. Check every item against your bag the night before, not the morning of.",
  },
  {
    q: "Where can I find the official, most current kit list?",
    a: "Your own Candidate Information Bulletin at psiexams.com is the authoritative source. This page is built from the PSI Class A Barber bulletin effective January 1, 2026, but requirements are updated periodically — confirm against your current bulletin before your exam date.",
  },
];

// ── Kit, split into the CIB's two authoritative lists ──────────────────────
const KIT_GROUPS: KitGroup[] = [
  {
    title: "Products & containers you must bring",
    mustLabel: true,
    note: "Label each in English (manufacturer labels are acceptable; numbering of any kind is not allowed).",
    items: [
      { label: "Kit / bag", hint: 'A 30" × 30" kit labeled "Pre-sanitized, Clean or Disinfected"' },
      { label: "EPA-approved disinfectant (or simulated product)" },
      { label: "Hand sanitizer" },
      { label: "Astringent, freshener, or toner" },
      { label: "Cleansing product" },
      { label: "Massage product" },
      { label: "Protective cream" },
      { label: "Non-aerosol shaving cream", hint: "Aerosol products are prohibited" },
      { label: "Cuticle remover" },
      { label: "Simulated product for chemical services", hint: "e.g. gel, cholesterol" },
      { label: "Simulated product for permanent wave service", hint: "e.g. water" },
      { label: "Spray bottle with water" },
      { label: "Blood exposure kit / first-aid kit" },
      { label: "Trash bag(s)" },
    ],
  },
  {
    title: "Tools & implements you must bring",
    mustLabel: false,
    note: "Do NOT label these — labeling a do-not-label item can lose points.",
    items: [
      { label: "Mannequin head", hint: "Bring TWO — one is used for the haircut" },
      { label: "Mannequin stand or tripod" },
      { label: "Mannequin hand / finger", hint: "Prepped with tips to represent the natural nail (manicure)" },
      { label: "Haircutting clippers" },
      { label: "Haircutting shears" },
      { label: "Disposable-blade straight razor (with blade)" },
      { label: "Electric curling iron", hint: "Thermal curling section" },
      { label: "Blow dryer" },
      { label: "Abrasives / nail files and buffers" },
      { label: "Cuticle pusher" },
      { label: "Combs" },
      { label: "Hairbrush" },
      { label: "Clips" },
      { label: "Permanent wave rods", hint: "You wrap a minimum of 4" },
      { label: "End papers" },
      { label: "Protective cotton" },
      { label: "Cotton / cotton pads / facial tissues" },
      { label: "Neck strips" },
      { label: "Drape(s)" },
      { label: "Head draping" },
      { label: "Tint brush, bowl, or bottle" },
      { label: "Disposable applicators" },
      { label: "Gloves" },
      { label: "Paper towels" },
      { label: "Towels" },
      { label: "Finger bowl" },
      { label: "Bowl for water (optional)" },
    ],
  },
];

const PROVIDED_ON_SITE = ["Work area and chair", "Covered trash cans", "Mounted wall clock", "Brooms and dust pans"];

// ── 11 timed stations, in exam order (Jan 1, 2026 CIB) ─────────────────────
const SECTIONS = [
  { name: "Pre-Examination Set Up & Disinfection", time: "10 min", points: "4 pts", notes: ["Disinfect work surfaces and properly dispose of waste", "Kit remains sanitary; avoid cross-contamination", "Kit stays closed except when retrieving an item"] },
  { name: "Manicure (on mannequin hand)", time: "22 min", points: "16 pts", isNew: true, notes: ["Complete a manicure on five nails", "Set up table, sanitize hands, shape nails, soften & push back cuticles, apply cuticle remover, clean under the free edge, finish nails", "Nail liquid must be odorless — examiners check it before the exam"] },
  { name: "Professional Shave Service", time: "42 min", points: "34 pts", notes: ["Prep the client and face, lather, remove, and re-lather", "Demonstrate freehand, backhand, and reverse freehand strokes, then remove all lather", "Procedure steps score 3 points each"] },
  { name: "Blood Exposure Incident", time: "12 min", points: "12 pts", notes: ["Wear gloves, apply pressure to the simulated cut, cleanse and bandage it", "Properly dispose of used materials and sanitize hands"] },
  { name: "Facial", time: "17 min", points: "13 pts", notes: ["Apply cleansing cream, demonstrate at least one massage manipulation, remove cream", "Apply astringent, freshener, or toner"] },
  { name: "Haircut (on mannequin)", time: "37 min", points: "43 pts", notes: ["Remove one inch of hair throughout using shears and clippers", "Scalp analysis, freehand clipper in the nape, clipper-over-comb, finger-and-shear on top, arching, shear-over-comb blend, balanced result, full clean-up", "Procedure steps score 3 points each"] },
  { name: "Blow Drying & Thermal Curling", time: "22 min", points: "11 pts", isNew: true, notes: ["Blow dry wet hair in one quadrant", "Test the iron for proper temperature, curl one sub-section, and protect the scalp while forming the curl"] },
  { name: "Chemical Application Preparation", time: "10 min", points: "4 pts", notes: ["Prepare the mannequin, section hair into two quadrants, apply protective cream"] },
  { name: "Permanent Wave", time: "17 min", points: "13 pts", notes: ["Wrap a minimum of 4 rods with proper band position and tension", "Demonstrate saturation on all rods and a test curl"] },
  { name: "Single Process Color Retouch", time: "10 min", points: "10 pts", notes: ["Assume one inch of regrowth", "Perform a strand test and a patch test, apply color, and keep all product off facial skin and ears"] },
  { name: "End of Examination Disinfection", time: "10 min", points: "3 pts", notes: ["Dispose of used materials, disinfect and clean the work area, remove all supplies and personal belongings"] },
];

const RULES = [
  "All tasks must be performed in the order listed — steps out of order, or not completed within the allotted time, are not scored.",
  "Every service is performed on a mannequin — bring TWO mannequins, since one is used for the haircut. No live models.",
  "Follow the bulletin's two labeling lists exactly: label the required products in English, but do NOT label tools/implements. Numbering any item is never allowed; an identifying bag for a service is fine.",
  "Cheat sheets and written notes — including written task lines on containers or bags with a written supply list — are prohibited and cost points across all Procedure Criteria.",
  "Aerosol products are not permitted. Nail liquid must be odorless or you can't use it (examiners check).",
  "No markings or coloring around the mannequin's hair, scalp, or hairline.",
  "Raise your hand at the end of each section to signal completion.",
  "Wear closed-toe shoes. Cell phones are not allowed in the practical room. Once you sign in you cannot leave the area, and anything left behind is discarded.",
];

export default function BarberPracticalExamKitListPage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      {/* Print styles: strip chrome, keep the checklist + reference clean on paper/PDF */}
      <style dangerouslySetInnerHTML={{ __html: `@media print { .no-print { display: none !important; } main { padding-top: 0 !important; } a[href]:after { content: ""; } }` }} />
      <div className="no-print">
        <Navbar />
      </div>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-10 sm:pb-14">
        <Link
          href="/texas-barber-exam-intelligence-prep"
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
            Texas Barber Practical Exam Kit List &amp; Checklist
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl">
            Every item, the exact must-label vs. do-not-label rules, and all 11 timed stations for the Texas
            Class A Barber practical exam, administered by PSI on behalf of TDLR — sourced directly from the
            official PSI Candidate Information Bulletin effective January 1, 2026, which added a manicure and a
            thermal-curling section.
          </p>
        </div>

        {/* Exam Structure */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <Clock className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">3h 29m</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Total Exam Length</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ShieldCheck className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">70%</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Passing Score (115/163 pts)</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ListChecks className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">11</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Timed Sections</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">163</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Total Points</p>
          </div>
        </div>

        {/* Interactive + printable checklist */}
        <KitChecklist groups={KIT_GROUPS} />

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
                    {section.isNew && (
                      <span className="ml-2 align-middle text-[9px] font-black uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">
                        New in 2026
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                      {section.points}
                    </span>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5 whitespace-nowrap">
                      {section.time}
                    </span>
                  </div>
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
            barber state-board kit from a beauty-supply vendor. If you buy one, verify it against the list above
            first — the exam changed on January 1, 2026 (manicure and thermal-curling sections were added), and not
            every vendor kit has been updated to match the current bulletin.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 mb-10 text-sm text-slate-600 leading-relaxed">
          This list is drawn directly from the official PSI Class A Barber Candidate Information Bulletin effective
          January 1, 2026 — the same document TDLR and PSI use to administer the exam. Requirements are occasionally
          updated; always confirm current kit requirements against your own Candidate Information Bulletin at{" "}
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
            href="/tools/texas-barber-exam-practice-deck"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm uppercase tracking-wider transition-colors shadow-md shadow-indigo-600/20"
          >
            Practice the Written Exam
          </Link>
          <Link
            href="/texas-cosmetology-practical-exam-kit-list"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
          >
            View Cosmetology Kit List
          </Link>
          <Link
            href="/texas-barber-license-requirements-guide"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
          >
            Barber Licence Requirements
          </Link>
          <Link
            href="/texas-barber-license-renewal"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
          >
            Barber Renewal
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
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: faq.a },
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "Texas Class A Barber Practical Exam — Station Order",
            description:
              "The 11 timed stations of the Texas Class A Barber practical exam in order, per the PSI/TDLR Candidate Information Bulletin effective January 1, 2026.",
            totalTime: "PT3H29M",
            step: SECTIONS.map((s, i) => ({
              "@type": "HowToStep",
              position: i + 1,
              name: s.name,
              text: s.notes.join(" "),
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Texas Barber Practical Exam Kit List (2026)",
            itemListElement: KIT_GROUPS.flatMap((g) => g.items).map((item, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: item.label,
            })),
          }),
        }}
      />
    </div>
  );
}
