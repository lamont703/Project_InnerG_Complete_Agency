import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ListChecks,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";

export const metadata = {
  title: "Texas Barber Practical Exam Kit List (2026) | Inner G Complete",
  description:
    "The complete Texas Class A Barber practical exam kit list, sourced from the official PSI/TDLR Candidate Information Bulletin — every required supply, labeling rules, and the exact station-by-station step order.",
  keywords: [
    "texas barber practical exam",
    "barber practical exam texas",
    "texas barber practical exam kit list",
    "texas barber exam kit list pdf",
    "barber state board kit list 2024",
    "texas barber practical exam steps",
    "psi tdlr barber exam supplies",
    "class a barber practical exam checklist",
  ],
  openGraph: {
    title: "Texas Barber Practical Exam Kit List (2026)",
    description:
      "Every required kit item, labeling rule, and station-by-station step order for the Texas Class A Barber practical exam, sourced from the official PSI/TDLR bulletin.",
  },
  alternates: { canonical: "https://agency.innergcomplete.com/texas-barber-practical-exam-kit-list" },
};

const FAQS = [
  {
    q: "What happens if I'm missing a required kit item on exam day?",
    a: "PSI proctors check kit contents before the exam begins. Missing a required item can prevent you from starting the station that needs it, so it's worth checking every item on this list against your actual bag the night before, not the morning of.",
  },
  {
    q: "Do all my kit items need to be labeled in English?",
    a: "Implements and supplies must be pre-sanitized and labeled in English only — manufacturer labels are acceptable. This is a common way candidates lose points even when they have the right physical items.",
  },
  {
    q: "How long is the Texas barber practical exam, and what score do I need to pass?",
    a: "The exam runs about 3 hours and 10 minutes across all stations, worth 184 total points. You need 70% — 129 of 184 points — to pass.",
  },
  {
    q: "Is this kit list the same as what I used in barber school?",
    a: "It should overlap heavily, but school kit requirements and the official PSI/TDLR exam-day kit list aren't guaranteed to match exactly. This list is sourced directly from the official PSI Class A Barber Candidate Information Bulletin, the same document TDLR and PSI use to administer the exam.",
  },
  {
    q: "Where can I find the official, most current kit list?",
    a: "Your own Candidate Information Bulletin at psiexams.com is the authoritative source — requirements are occasionally updated, so confirm against it before your exam date even if you've taken this exam before.",
  },
];

const KIT_ITEMS = [
  "Approved disinfectant (70% ethyl alcohol, 99% isopropyl alcohol, etc.)",
  "Combs",
  "Protective drape(s) — one MUST be appropriate for chemical services (e.g. plastic comb-out cape)",
  "Clips (for sectioning)",
  "Hair cutting shears",
  "Hair cutting clippers",
  "Disposable blade straight razor (with blade)",
  "Can of shaving cream",
  "Neck duster",
  "Permanent wave rods (at least 3)",
  "End papers",
  "Cotton coil",
  "Sanitary neck strips",
  "One permanent wave lotion applicator containing water (simulated perm wave lotion)",
  "Shampoo",
  "Cholesterol cream",
  "Tint brush / tint bottle(s) for coloring (containing simulated product, e.g. cholesterol, conditioner)",
  "Blow dryer",
  "Cotton towels",
  "Paper towels",
  "Hand sanitizer (e.g. 70% alcohol, soap and water, shampoo)",
  "Massage / facial cream",
  "Protective cream",
  "Astringent, freshener, or toner",
  "Spatula(s)",
  "Spray bottle for water",
  "Disposable gloves",
  "Bag for disposal of waste materials",
  "Bag/container for soiled linen",
  "Blood spill kit (bandages, labeled blood spill bag, antiseptic, disinfectant, gloves, liquid or powdered alum)",
  "Means of showing implements have been disinfected (a zip-lock bag labeled “disinfected/sanitized implements” is acceptable)",
  "Mannequin with a minimum of 4 inches of hair throughout",
  "Mannequin stand",
];

const VENDOR_SUPPLIED = [
  "Liquid soap",
  "Hot and cold water",
  "Work stations with mirrors",
  "Chairs for models and candidates",
  "Covered trash cans",
  "Mounted wall clock",
  "Ultraviolet sanitizers",
  "Brooms and dust pans",
  "Diagram of 14 shaving areas",
];

const SECTIONS = [
  {
    name: "Pre-Exam Set Up and Disinfection",
    time: "10 minutes",
    notes: [
      "Implements/supplies pre-sanitized and labeled in English only",
      "Disinfect work surfaces with approved EPA-registered disinfectant",
      "Kit must remain closed except when retrieving items",
    ],
  },
  {
    name: "Shampoo Service (model)",
    time: "15 minutes",
    notes: ["Shampoo and rinse hair", "Sanitary draping and scalp massage throughout"],
  },
  {
    name: "Blow Drying Service (model)",
    time: "10 minutes",
    notes: ["Blow dry wet hair until tangle-free"],
  },
  {
    name: "Hair Shaping Service (model)",
    time: "35 minutes",
    notes: ["Tapered, blended haircut using clippers and shears", "Arch over ears must be apparent at the end"],
  },
  {
    name: "Shaving Service (model)",
    time: "40 minutes",
    notes: [
      "Basic shave with a straight razor (blade required)",
      "Free-hand, back-hand, and reverse free-hand strokes are all demonstrated",
      "Includes a mock blood spill procedure",
    ],
  },
  {
    name: "Facial Service (model)",
    time: "15 minutes",
    notes: ["Massage cream application + one manipulation technique (petrissage, effleurage, or tapotement)"],
  },
  {
    name: "Chemical Services (mannequin)",
    time: "30 minutes total",
    notes: [
      "Prep + virgin hair relaxer on left front quadrant + hair color retouch on right front quadrant",
      "Protective gloves worn throughout; no chemical product may touch facial skin or ears",
    ],
  },
  {
    name: "Permanent Waving Service (mannequin)",
    time: "15 minutes",
    notes: ["Wrap a minimum of 3 rods, apply mock waving solution (water), demonstrate a test curl"],
  },
  {
    name: "End of Exam Disinfection",
    time: "10 minutes",
    notes: ["Disinfect all surfaces, sanitize hands, remove all supplies and personal belongings"],
  },
];

const RULES = [
  "All tasks must be performed in the order listed above — steps out of order are not scored, even if completed correctly.",
  "All supplies must be clean, sanitary, unstained, and labeled in English (manufacturer labels are acceptable).",
  "The kit must remain closed except when removing an item — products must be removed from containers without contamination.",
  "You must wear a sleeved smock/lab coat and closed-toe shoes, or you will not be admitted to the exam.",
  "Cheat sheets and written notes — including written task lines on containers — are not permitted during the practical exam.",
  "Wearing gloves and swapping them is not an accepted substitute for sanitizing your hands between services.",
  "Your model must not be pre-cut, must have hair on the neck, appear in need of a haircut, and be in need of a shave.",
];

export default function BarberPracticalExamKitListPage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-10 sm:pb-14">
        <Link
          href="/texas-barber-exam-intelligence-prep"
          className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary hover:underline mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Exam Intelligence Hub
        </Link>

        <div className="mb-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
            <ListChecks className="w-3 h-3" />
            2026 Practical Exam Prep
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-3">
            Texas Barber Practical Exam Kit List
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl">
            Every item, labeling rule, and station-by-station step order for the Texas Class A Barber practical
            exam, administered by PSI on behalf of TDLR — sourced directly from the official PSI Candidate
            Information Bulletin.
          </p>
        </div>

        {/* Exam Structure */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <Clock className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">3h 10m</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Total Exam Length</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ShieldCheck className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">70%</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Passing Score (129/184 pts)</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ListChecks className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">9</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Timed Sections</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 mb-2" />
            <p className="text-lg font-black text-slate-900">184</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Total Points</p>
          </div>
        </div>

        {/* Kit list */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-6 mb-6">
          <h2 className="text-xl font-black text-slate-900 mb-1">What to bring — full kit list</h2>
          <p className="text-sm text-slate-500 font-medium mb-5">
            You are responsible for bringing everything on this list yourself. Missing or non-approved items (e.g.
            a non-approved disinfectant) mean you lose the points for any step requiring that item.
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {KIT_ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Vendor supplied */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-6 mb-10">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-3">
            Already provided at the exam site — don&apos;t bring these
          </h3>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {VENDOR_SUPPLIED.map((item) => (
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

        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 mb-10 text-sm text-slate-600 leading-relaxed">
          This list is drawn directly from the official PSI Class A Barber Candidate Information Bulletin — the
          same document TDLR and PSI use to administer the exam. Requirements are occasionally updated; always
          confirm current kit requirements against your own Candidate Information Bulletin at{" "}
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

        <div className="flex flex-wrap gap-3 mb-16">
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
    </div>
  );
}
