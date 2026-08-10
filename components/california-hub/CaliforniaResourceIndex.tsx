import Link from "next/link";
import { FileText, ClipboardCheck, RefreshCw, Wallet, ArrowLeftRight, Ban } from "lucide-react";

/**
 * The index of everything we've written about being licensed in California.
 *
 * The counterpart to TexasResourceIndex, and it exists for the same reason:
 * thirteen California resource pages shipped with the hub linking to none of
 * them. Google was reaching them through the sitemap alone, with nothing
 * saying which mattered or how they related.
 *
 * SAME SLOT, SAME PLACEMENT. Rendered through CaliforniaHubDirectory's
 * beforeBackLink slot, below the directory. A visitor looking for a salon is
 * not made to scroll past a licensing index to find one.
 *
 * WHERE IT DEPARTS FROM THE TEXAS VERSION, and this is the part not to
 * "fix" by copying:
 *
 *   NO KIT LISTS. Texas has six, and they are the highest-performing page
 *   type on this site. California abolished the practical exam for every
 *   licence type on 1 January 2022 — there is no kit, so there is no kit
 *   list, and the group is replaced by one that says so. Silently omitting it
 *   would read as a gap in our coverage rather than a fact about California.
 *
 *   NO ESTABLISHMENT GUIDES YET. Texas has seven. California has none written,
 *   so nothing is listed rather than linking to a page that does not exist.
 *
 *   HOURS ORDER IS DIFFERENT. Texas runs 300–1,000; California runs 400–1,000
 *   and includes two licences Texas has no name for.
 *
 * The `note` on each link is the distinguishing fact — the thing that stops
 * six licence guides reading as one guide six times.
 */

interface ResourceLink {
  href: string;
  label: string;
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
    blurb:
      "Six licences from 400 to 1,000 hours — including two, hairstylist and electrologist, that most states do not issue at all.",
    icon: FileText,
    links: [
      { href: "/california-cosmetology-license", label: "Cosmetologist", note: "1,000 hrs" },
      { href: "/california-barber-license", label: "Barber", note: "1,000 hrs" },
      { href: "/california-esthetician-license", label: "Esthetician", note: "600 hrs" },
      { href: "/california-hairstylist-license", label: "Hairstylist", note: "600 hrs" },
      { href: "/california-electrologist-license", label: "Electrologist", note: "600 hrs" },
      { href: "/california-nail-technician-license", label: "Nail Technician", note: "400 hrs" },
    ],
  },
  {
    title: "Passing the exam",
    blurb:
      "PSI rewrote all five content outlines on 1 April 2026. The comparison is published nowhere else.",
    icon: ClipboardCheck,
    links: [
      { href: "/california-exam-changes-2026", label: "What Changed in 2026", note: "all 5 licences" },
      { href: "/california-cosmetology-exam-intelligence-prep", label: "Cosmetology Exam Prep", note: "with pass rates" },
      { href: "/california-barber-exam-intelligence-prep", label: "Barber Exam Prep", note: "with pass rates" },
      { href: "/california-school-leaderboard", label: "School Pass Rates", note: "ranked" },
    ],
  },
  {
    title: "Keeping your licence",
    blurb: "$50 every two years for every licence type, $25 late — and no continuing education at all.",
    icon: RefreshCw,
    links: [
      { href: "/california-cosmetology-license-renewal", label: "Cosmetology Renewal", note: "$50" },
      { href: "/california-barber-license-renewal", label: "Barber Renewal", note: "+ the shop licence" },
      { href: "/california-nail-license-renewal", label: "Nail Renewal", note: "filed as “manicurist”" },
      { href: "/california-esthetician-license-renewal", label: "Esthetician Renewal", note: "$50" },
    ],
  },
  {
    title: "What the work pays",
    blurb:
      "The board collects no earnings data. What it collects is hours — and that is what every published salary figure assumes.",
    icon: Wallet,
    links: [
      { href: "/california-esthetician-salary", label: "Esthetician Earnings", note: "8.7% full-time" },
      { href: "/california-barber-salary", label: "Barber Earnings", note: "33.5% full-time" },
    ],
  },
  {
    title: "No practical exam",
    blurb:
      "California dropped the hands-on exam for every licence type on 1 January 2022, so there is no kit to pack and no kit list to write. Texas still has one, and six kit lists to go with it.",
    icon: Ban,
    links: [
      { href: "/texas-barber-practical-exam-kit-list", label: "Texas Barber Kit List", note: "Texas only" },
      { href: "/texas-cosmetology-practical-exam-kit-list", label: "Texas Cosmetology Kit List", note: "Texas only" },
    ],
  },
  {
    title: "Moving between states",
    blurb: "Hours do not transfer on assumption. California requires 600 esthetician hours where Texas requires 750.",
    icon: ArrowLeftRight,
    links: [
      { href: "/texas-california-license-reciprocity", label: "Texas ↔ California", note: "no reciprocity exists" },
      { href: "/texas-esthetician-license-requirements-guide", label: "Texas Esthetician", note: "750 hrs" },
      { href: "/texas-manicurist-license-requirements-guide", label: "Texas Manicurist", note: "600 hrs" },
    ],
  },
];

export function CaliforniaResourceIndex() {
  return (
    <section className="mt-12">
      <div className="mb-6 border-t border-slate-200 pt-10">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">
          Licensing, exams and earnings in California
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Everything we&apos;ve documented from the California Board of Barbering &amp; Cosmetology
          &mdash; the Act, the board&apos;s 2026 report to the Legislature, and its letter to
          approved schools &mdash; sourced, dated, and separated by licence because the
          requirements genuinely differ.
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
