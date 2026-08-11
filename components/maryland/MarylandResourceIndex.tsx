import Link from "next/link";
import { FileText, ClipboardCheck, RefreshCw, ListChecks } from "lucide-react";

/**
 * The index of everything we've written about being licensed in Maryland.
 *
 * WHY IT EXISTS. The hub shipped with eleven Maryland pages behind it and
 * linked three. Eight had no inbound internal link at all — including
 * /maryland-barber-practical-exam-kit-list, which is the single best-performing
 * page TYPE on this site by a wide margin. Google was reaching those eight
 * through the sitemap alone, with nothing saying which mattered.
 *
 * Third in the set, after TexasResourceIndex and CaliforniaResourceIndex, and
 * deliberately the same shape: grouped by the question being asked, a
 * distinguishing note on every link, and every link pointing at a Maryland
 * page. No reaching into other states to fill a category out — that mistake
 * was made once on the California index and removed.
 *
 * WHAT MARYLAND HAS THAT CALIFORNIA DOESN'T: a practical exam, and therefore
 * kit lists. California abolished its practical on 1 Jan 2022, so that format
 * is unavailable there. It is available here, and it is the format with the
 * best evidence behind it, which is why "Practical exams" is its own group
 * rather than being folded into licensing.
 *
 * ZERO IMPRESSIONS IS NOT A VERDICT YET. Every page below was published
 * 2026-08-10. Do not read the absence of Search Console data as failure —
 * re-measure after 30 days, against the Texas kit lists as the benchmark
 * (3-8% CTR, positions 3-7).
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
      "What each Maryland licence requires, with the hours and fees named to their source on the Department of Labor's own pages.",
    icon: FileText,
    links: [
      { href: "/maryland-cosmetology-license-requirements", label: "Cosmetologist" },
      { href: "/maryland-barber-license-requirements", label: "Barber" },
    ],
  },
  {
    title: "Practical exams",
    blurb:
      "Maryland still requires a hands-on exam — six of them, one per licence. The graded sections and the time on each, from the PSI bulletins.",
    icon: ClipboardCheck,
    links: [
      { href: "/maryland-cosmetology-practical-exam", label: "Cosmetology Practical" },
      { href: "/maryland-esthetician-practical-exam", label: "Esthetician Practical" },
      { href: "/maryland-nail-technician-practical-exam", label: "Nail Technician Practical" },
      { href: "/maryland-hairstylist-practical-exam", label: "Hairstylist Practical" },
      { href: "/maryland-eyelash-extension-practical-exam", label: "Eyelash Extension Practical" },
      { href: "/maryland-blow-dry-stylist-practical-exam", label: "Blow Dry Stylist Practical" },
    ],
  },
  {
    title: "Packing the kit",
    blurb:
      "Every item you bring, and the labelling rules that cost candidates points before they start. Maryland publishes a kit list; most states don't.",
    icon: ListChecks,
    links: [
      { href: "/maryland-barber-practical-exam-kit-list", label: "Barber Kit List" },
    ],
  },
  {
    title: "Keeping your licence",
    blurb: "Renewal cycles, fees and the late bands, per licence.",
    icon: RefreshCw,
    links: [
      { href: "/maryland-cosmetology-license-renewal", label: "Cosmetology Renewal" },
      { href: "/maryland-barber-license-renewal", label: "Barber Renewal" },
    ],
  },
];

export function MarylandResourceIndex() {
  return (
    <section className="mb-8">
      <div className="mb-6 border-t border-slate-200 pt-8">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">
          Licensing and exams in Maryland
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Everything we&apos;ve documented from the Maryland Department of Labor and the PSI
          candidate bulletins &mdash; sourced, dated, and separated by licence because the
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
