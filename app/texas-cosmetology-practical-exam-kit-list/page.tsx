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

export const metadata = {
  title: "Texas Cosmetology Practical Exam Kit List (2026) | Inner G Complete",
  description:
    "The complete Texas Cosmetology Operator practical exam kit list, sourced from the official PSI/TDLR Candidate Information Bulletin — which items must be labeled in English, which items can't be labeled at all, and the exact station-by-station step order.",
  keywords: [
    "texas cosmetology practical exam kit list",
    "texas cosmetology practical exam kit list pdf",
    "cosmetology state board kit list 2024",
    "texas cosmetology practical exam steps",
    "psi tdlr cosmetology exam supplies",
    "cosmetology operator practical exam checklist",
  ],
  openGraph: {
    title: "Texas Cosmetology Practical Exam Kit List (2026)",
    description:
      "Every required kit item, labeling rule, and station-by-station step order for the Texas Cosmetology Operator practical exam, sourced from the official PSI/TDLR bulletin.",
  },
  alternates: { canonical: "https://innergcomplete.com/texas-cosmetology-practical-exam-kit-list" },
};

const FAQS = [
  {
    q: "Do I need a live model for the Texas cosmetology practical exam?",
    a: "No. As of September 1, 2019, the practical exam is performed entirely on mannequins — live models are no longer required or allowed.",
  },
  {
    q: "Which kit items must be labeled in English, and which can't be labeled at all?",
    a: "Products must be labeled in English (manufacturer labels are acceptable), but numbering of any kind on labeled items is not allowed. Some items in this list specifically can't carry any label — check the two separate lists above before packing your kit.",
  },
  {
    q: "How long is the Texas cosmetology practical exam, and what score do I need to pass?",
    a: "The exam runs about 3 hours and 45 minutes across all stations, worth 130 total points. You need 70% — 91 of 130 points — to pass.",
  },
  {
    q: "Can I put markings or coloring on the mannequin's scalp or hairline to guide my work?",
    a: "No. No markings or colorings are permitted around the mannequin's hair, scalp, or hairline during the exam.",
  },
  {
    q: "Where can I find the official, most current kit list?",
    a: "This list is sourced directly from the official PSI Cosmetology Operator Candidate Information Bulletin. Requirements are occasionally updated, so confirm against your own Bulletin at psiexams.com before your exam date.",
  },
];

const NOT_LABELED = [
  "Abrasive/nail files and buffers",
  "Application brush",
  "Blow dryer",
  "Bowl for water (optional)",
  "Clips",
  "Combs",
  "Cotton/cotton pads/sponges/facial tissue",
  "Cuticle pusher",
  "Dappen dish",
  "Disposable applicators",
  "Drape(s)",
  "Electric curling iron",
  "End papers",
  "Eyelash strip",
  "Fabric strip",
  "Foils",
  "Gloves",
  "Hair brush",
  "Haircutting shears",
  "Head draping",
  "Mannequin hand/finger (prepped with tips for the natural nail)",
  "Mannequin head (prepped with eyelash strip for natural lashes)",
  "Mannequin stand or tripod",
  "Nail tips",
  "Neck strips",
  "Orangewood stick",
  "Paper towels",
  "Permanent wave rods",
  "Protective cotton",
  "Razor with guard",
  "Small scissors",
  "Tint brush, bowl or bottle",
  "Tip cutter",
  "Towels",
  "Tweezers",
];

const MUST_BE_LABELED = [
  "30x30 kit labeled \"Pre-sanitized, Clean or Disinfected\"",
  "Antiseptic/soothing lotion",
  "Astringent, freshener, or toner",
  "Blood exposure kit / first aid kit",
  "Cleansing product",
  "EPA-approved disinfectant or simulated product",
  "Eye makeup remover",
  "Hand sanitizer",
  "Lash adhesive",
  "Massage product",
  "Moisturizer",
  "Nail adhesive",
  "Nail dehydrator/cleanser",
  "Odorless monomer + low-odor primer for one nail (only bottles marked \"odorless\" by the manufacturer are allowed)",
  "Polymer powder",
  "Protective cream",
  "Simulated product for permanent wave service (e.g. water)",
  "Simulated product for chemical services (e.g. gel, cholesterol)",
  "Simulated soft wax product for waxing service (e.g. petroleum jelly or honey)",
  "Spray bottle with water",
  "Trash bag(s)",
];

const VENDOR_SUPPLIED = ["Brooms and dust pans", "Covered trash cans", "Mounted wall clock", "Work stations/manicure table with chairs"];

const SECTIONS = [
  { name: "Pre-Exam Set Up and Disinfection", time: "10 min", notes: ["Disinfect work surfaces, dispose of waste, kit remains sanitary"] },
  { name: "Monomer and Polymer Over Tip", time: "32 min", notes: ["Apply a nail tip, then monomer and polymer overlay, on one nail"] },
  { name: "Blood Exposure Incident", time: "12 min", notes: ["Full procedure on a simulated cut — gloves, pressure, cleaning, bandaging, disposal"] },
  { name: "Eyelash Strip Application", time: "14 min", notes: ["Apply one eyelash strip to the mannequin"] },
  { name: "Facial Service", time: "17 min", notes: ["Cleanse, massage cream + effleurage/petrissage/tapotement manipulations, toner, moisturizer"] },
  { name: "Waxing Service (Soft Wax)", time: "14 min", notes: ["Simulated wax product applied to one eyebrow — application, fabric strip, removal, post-wax product"] },
  { name: "Haircut Service", time: "42 min", notes: ["Layered haircut of your choice using a razor and shears, minimum 1 inch removed throughout"] },
  { name: "Permanent Wave Service", time: "22 min", notes: ["Wrap a minimum of 6 rods in the center back section, demonstrate saturation and a test curl"] },
  { name: "Blow Drying and Thermal Curling", time: "22 min", notes: ["Blow dry wet hair, then an on-base and an off-base curl using a curling iron"] },
  { name: "Chemical Service Preparation", time: "10 min", notes: ["Divide hair into 4 sections, apply protective cream, gloves on for all chemical services"] },
  { name: "Foil Highlights Application", time: "Untimed", notes: ["Apply high-lift product to 2 subsections in a quadrant of your choice using foils"] },
  { name: "Hydroxide Virgin Relaxer", time: "10 min", notes: ["Virgin relaxer application in a quadrant of your choice"] },
  { name: "Hydroxide Relaxer Retouch", time: "10 min", notes: ["Relaxer retouch assuming 2 inches of regrowth"] },
  { name: "End of Exam Disinfection", time: "10 min", notes: ["Dispose of materials, disinfect workstation, remove all supplies and belongings"] },
];

const RULES = [
  "As of September 1, 2019, the practical exam is performed entirely on mannequins — live models are no longer required or allowed.",
  "Aerosol products are not permitted for use during the exam, under any circumstances.",
  "All tasks must be performed in the order listed — steps out of order are not scored, even if completed correctly.",
  "Products must be labeled in English (manufacturer labels acceptable) — numbering of any kind on labeled items is not allowed.",
  "Cheat sheets and written notes — including numbered bags or bags with a written supply list — are not permitted; an identifying (non-numbered) bag per service is allowed.",
  "No markings or colorings are permitted around the mannequin's hair, scalp, or hairline.",
  "Cell phones are not allowed in the practical exam room.",
];

export default function CosmetologyPracticalExamKitListPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <Link
          href="/texas-barber-exam-intelligence-prep"
          className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary hover:underline mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Exam Intelligence Hub
        </Link>

        <div className="mb-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-100 rounded-full px-3 py-1 mb-4">
            <ListChecks className="w-3 h-3" />
            2026 Practical Exam Prep
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-3">
            Texas Cosmetology Practical Exam Kit List
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl">
            Every item, labeling rule, and station-by-station step order for the Texas Cosmetology Operator
            practical exam, administered by PSI on behalf of TDLR — sourced directly from the official PSI
            Candidate Information Bulletin. Also known as the beauty school or hair school state board exam.
          </p>
        </div>

        {/* Exam Structure */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <Clock className="w-4 h-4 text-fuchsia-600 mb-2" />
            <p className="text-lg font-black text-slate-900">3h 45m</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Total Exam Length</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ShieldCheck className="w-4 h-4 text-fuchsia-600 mb-2" />
            <p className="text-lg font-black text-slate-900">70%</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Passing Score (91/130 pts)</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ListChecks className="w-4 h-4 text-fuchsia-600 mb-2" />
            <p className="text-lg font-black text-slate-900">14</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Timed Sections</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <CheckCircle2 className="w-4 h-4 text-fuchsia-600 mb-2" />
            <p className="text-lg font-black text-slate-900">130</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Total Points</p>
          </div>
        </div>

        <div className="bg-fuchsia-50 border border-fuchsia-200 rounded-2xl px-6 py-4 mb-10 flex items-start gap-3">
          <AlertTriangle className="w-4.5 h-4.5 text-fuchsia-700 shrink-0 mt-0.5" />
          <p className="text-sm text-fuchsia-900 leading-relaxed">
            <strong>Mannequin-only since September 1, 2019.</strong> Every service on this exam — including the
            haircut and facial — is performed on a mannequin. Live models are not required or allowed.
          </p>
        </div>

        {/* Kit list — not labeled */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-6 mb-6">
          <h2 className="text-xl font-black text-slate-900 mb-1">Items that must NOT be labeled</h2>
          <p className="text-sm text-slate-500 font-medium mb-5">
            Labeling these items — including any numbering — may cost you points.
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {NOT_LABELED.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Kit list — must be labeled */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-6 mb-6">
          <h2 className="text-xl font-black text-slate-900 mb-1">Items that MUST be labeled in English</h2>
          <p className="text-sm text-slate-500 font-medium mb-5">
            Manufacturer labels are acceptable — numbering of any kind is not allowed. Failure to properly label
            these may cost you points.
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {MUST_BE_LABELED.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-fuchsia-600 shrink-0 mt-0.5" />
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
                  <span className="shrink-0 text-xs font-bold text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-100 rounded-full px-2.5 py-0.5 whitespace-nowrap">
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
          This list is drawn directly from the official PSI Cosmetology Operator Candidate Information Bulletin
          (revised 9/1/2019) — the same document TDLR and PSI use to administer the exam. Requirements are
          occasionally updated; always confirm current kit requirements against your own Candidate Information
          Bulletin at{" "}
          <a
            href="https://www.psiexams.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-fuchsia-600 font-bold hover:underline inline-flex items-center gap-1"
          >
            psiexams.com
            <ExternalLink className="w-3 h-3" />
          </a>{" "}
          before your exam date.
        </div>

        <div className="flex flex-wrap gap-3 mb-16">
          <Link
            href="/tools/texas-barber-exam-practice-deck"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-extrabold text-sm uppercase tracking-wider transition-colors shadow-md shadow-fuchsia-600/20"
          >
            Practice the Written Exam
          </Link>
          <Link
            href="/texas-barber-practical-exam-kit-list"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
          >
            View Barber Kit List
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
