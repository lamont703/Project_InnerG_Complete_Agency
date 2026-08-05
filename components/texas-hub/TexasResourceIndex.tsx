import Link from "next/link";
import { FileText, ListChecks, RefreshCw, ClipboardCheck, ArrowLeftRight, Building2, Monitor } from "lucide-react";

/**
 * The index of everything we've written about being licensed in Texas.
 *
 * WHY THIS EXISTS. The hub linked to one resource page — /texas/licensing — while
 * 47 Texas resource pages sat behind it, 13 of them with no inbound internal
 * link at all. Google was reaching most of them through the sitemap alone, with
 * nothing telling it which mattered or how they related.
 *
 * Deliberately additive: TexasHubDirectory still renders the city hubs and the
 * shops, salons, barbers, cosmetologists, schools and stores exactly as before.
 * A visitor looking for a barbershop is not made to scroll past a licensing
 * index to find one — this sits below the directory, for the audience that came
 * for the other thing.
 *
 * Grouped by the question being asked rather than by our URL structure: getting
 * licensed, preparing for the exam, packing the kit, keeping the licence,
 * moving states, opening a business.
 */

interface ResourceLink {
  href: string;
  label: string;
  /** The distinguishing fact — hours, fee, whatever separates this from its siblings. */
  note?: string;
}

interface ResourceGroup {
  title: string;
  blurb: string;
  icon: typeof FileText;
  links: ResourceLink[];
}

const GROUPS: ResourceGroup[] = [
  {
    title: "Getting licensed",
    blurb: "What each licence requires — the hours run from 300 to 1,000 and the pattern is not what the names suggest.",
    icon: FileText,
    links: [
      { href: "/texas-barber-license-requirements-guide", label: "Class A Barber", note: "1,000 hrs" },
      { href: "/texas-cosmetology-license-requirements-guide", label: "Cosmetology Operator", note: "1,000 hrs" },
      { href: "/texas-esthetician-license-requirements-guide", label: "Esthetician", note: "750 hrs" },
      { href: "/texas-manicurist-license-requirements-guide", label: "Manicurist", note: "600 hrs" },
      { href: "/texas-eyelash-extension-license-requirements-guide", label: "Eyelash Extension", note: "320 hrs" },
      { href: "/texas-hair-weaving-license-requirements-guide", label: "Hair Weaving", note: "300 hrs" },
    ],
  },
  {
    title: "Passing the exam",
    blurb: "Pass rates where TDLR publishes them, and the full scored rubric where it doesn't.",
    icon: ClipboardCheck,
    links: [
      { href: "/texas-barber-exam-intelligence-prep", label: "Barber Exam Prep", note: "with pass rates" },
      { href: "/texas-cosmetology-exam-intelligence-prep", label: "Cosmetology Exam Prep", note: "with pass rates" },
      { href: "/texas-esthetician-exam-prep", label: "Esthetician Exam Prep" },
      { href: "/texas-manicurist-exam-prep", label: "Manicurist Exam Prep" },
      { href: "/texas-eyelash-extension-exam-prep", label: "Eyelash Exam Prep" },
      { href: "/texas-hair-weaving-exam-prep", label: "Hair Weaving Exam Prep" },
    ],
  },
  {
    title: "Packing the kit",
    blurb: "Every item, and the must-label vs do-not-label rules that cost candidates points.",
    icon: ListChecks,
    links: [
      { href: "/texas-barber-practical-exam-kit-list", label: "Barber Kit List" },
      { href: "/texas-cosmetology-practical-exam-kit-list", label: "Cosmetology Kit List" },
      { href: "/texas-esthetician-practical-exam-kit-list", label: "Esthetician Kit List" },
      { href: "/texas-manicurist-practical-exam-kit-list", label: "Manicurist Kit List" },
      { href: "/texas-eyelash-extension-practical-exam-kit-list", label: "Eyelash Kit List" },
      { href: "/texas-hair-weaving-practical-exam-kit-list", label: "Hair Weaving Kit List" },
    ],
  },
  {
    title: "Keeping your licence",
    blurb: "$50 every two years, and the late bands that double it.",
    icon: RefreshCw,
    links: [
      { href: "/texas-barber-license-renewal", label: "Barber Renewal" },
      { href: "/texas-cosmetology-license-renewal", label: "Cosmetology Renewal" },
      { href: "/texas-esthetician-license-renewal", label: "Esthetician Renewal" },
      { href: "/texas-manicurist-license-renewal", label: "Manicurist Renewal" },
      { href: "/texas-eyelash-extension-license-renewal", label: "Eyelash Renewal" },
      { href: "/texas-hair-weaving-license-renewal", label: "Hair Weaving Renewal" },
    ],
  },
  {
    title: "Changing trade or state",
    blurb: "The crossover routes are 300 hours, not 1,000. Reciprocity between states is not what people assume.",
    icon: ArrowLeftRight,
    links: [
      { href: "/texas-barber-license-transfer-guide", label: "Cosmetologist → Barber", note: "300 hrs" },
      { href: "/texas-cosmetology-license-transfer-guide", label: "Barber → Cosmetologist", note: "300 hrs" },
      { href: "/texas-california-license-reciprocity", label: "Texas ↔ California", note: "no reciprocity exists" },
      { href: "/texas-tdlr-updates", label: "TDLR Rule Updates" },
    ],
  },
  {
    title: "Studying online",
    blurb: "Distance education is capped at half a course and cannot touch the practical hours — the limit per licence, from TDLR's own approval forms.",
    icon: Monitor,
    links: [
      {
        href: "/texas-online-barber-cosmetology-school-guide",
        label: "Texas Online & Hybrid Rules",
        note: "50% max",
      },
      {
        href: "/states-that-allow-online-cosmetology-school",
        label: "Which States Allow It",
        note: "verified matrix",
      },
      {
        href: "/naccas-distance-education-requirements",
        label: "NACCAS VI.02 (for school owners)",
      },
      {
        href: "/texas-distance-education-compliance",
        label: "Reporting Distance Hours (SHEARS)",
        note: "350 + 150",
      },
      {
        href: "/texas-school-penalties-distance-education",
        label: "Penalties for Getting It Wrong",
        note: "up to revocation",
      },
    ],
  },
  {
    title: "Opening a business",
    blurb: "Establishments are $78, a mini is $70, a school is $580 including the inspection.",
    icon: Building2,
    links: [
      { href: "/texas-barber-establishment-license-requirements-guide", label: "Barber Establishment", note: "$78" },
      { href: "/texas-cosmetology-establishment-license-requirements-guide", label: "Cosmetology Establishment", note: "$78" },
      { href: "/texas-specialty-establishment-license-requirements-guide", label: "Specialty Establishment", note: "$78" },
      { href: "/texas-mini-establishment-license-requirements-guide", label: "Mini-Establishment", note: "$70" },
      { href: "/texas-mobile-establishment-license-requirements-guide", label: "Mobile Establishment", note: "$78" },
      { href: "/texas-barber-school-license-requirements-guide", label: "Barber School", note: "$580" },
      { href: "/texas-cosmetology-school-license-requirements-guide", label: "Cosmetology School", note: "$580" },
    ],
  },
];

export function TexasResourceIndex() {
  return (
    // Rendered through TexasHubDirectory's beforeBackLink slot, so it sits
    // inside that component's light theme scope and its container. No wrapper
    // of its own is needed — an earlier version carried one because it used to
    // render as a sibling and inherited the dark root theme.
    <section className="mt-12">
      <div className="mb-6 border-t border-slate-200 pt-10">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">
          Licensing, exams and opening a shop in Texas
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Everything we&apos;ve documented from TDLR and the PSI candidate bulletins — sourced, dated,
          and separated by licence because the requirements genuinely differ.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {GROUPS.map((group) => (
          <div key={group.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
                <group.icon className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-black text-slate-900">{group.title}</h3>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-slate-500">{group.blurb}</p>
            <ul className="space-y-1">
              {group.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="flex items-baseline justify-between gap-2 rounded-lg px-2 py-1.5 -mx-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-indigo-700"
                  >
                    <span className="font-semibold">{l.label}</span>
                    {l.note && <span className="shrink-0 text-xs text-slate-400">{l.note}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
