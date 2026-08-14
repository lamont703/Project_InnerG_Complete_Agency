import Link from "next/link";
import { ClipboardCheck, Compass, ExternalLink, Info, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";

/**
 * Shared hub layout for the states that carry practical-exam content only.
 *
 * WHY IT OMITS MOST OF THE MARYLAND HUB'S SECTIONS. Maryland shows Licensing
 * Guides, an every-licence hours table and a business directory because that
 * content exists for Maryland. For Virginia, Ohio, Mississippi, Tennessee and
 * Minnesota it does not — we have kit lists and nothing else. Rendering an
 * empty "Licensing Guides" card would be worse than leaving it out, so the
 * component only takes the sections a state can actually fill.
 *
 * THE "NO LISTINGS" NOTICE IS DELIBERATE AND STAYS. The directory covers Texas
 * and California. Saying so is better than showing someone a search box that
 * returns nothing, and it is the same choice the Maryland hub already made.
 *
 * Design is copied from app/maryland/page.tsx rather than reinvented — same
 * card treatment, same grid, same chip styling — so the hubs read as one set.
 */

export interface HubLink {
  href: string;
  label: string;
  note?: string;
}

export interface StateHubProps {
  stateName: string;
  /** One or two sentences under the h1. */
  intro: React.ReactNode;
  /** Small chips under the hero. Keep to three or fewer. */
  chips?: { icon: React.ReactNode; label: React.ReactNode; href?: string }[];
  /** The kit lists. */
  practical: HubLink[];
  /** Sentence introducing the practical section — usually names the exam vendor. */
  practicalNote: React.ReactNode;
  /** Outbound regulator and vendor links. Every one must be verified live. */
  resources: HubLink[];
  resourcesNote: React.ReactNode;
  /** When the sources behind this hub were last read. */
  checked: string;
  siblings: { href: string; label: string }[];
}

export function StateHub({
  stateName, intro, chips = [], practical, practicalNote, resources, resourcesNote,
  checked, siblings,
}: StateHubProps) {
  return (
    <div className="min-h-screen bg-slate-50 light flex flex-col">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-12 flex-1 w-full">
        {/* ---- hero ------------------------------------------------------ */}
        <div className="text-center max-w-2xl mx-auto mb-4">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            {stateName} Barber &amp; Cosmetology Licensing
          </h1>
          <p className="text-slate-600">{intro}</p>
        </div>

        {chips.length > 0 && (
          <div className="max-w-4xl mx-auto mb-8 flex flex-wrap gap-3 justify-center">
            {chips.map((c, i) => {
              const inner = (
                <>
                  <span className="shrink-0">{c.icon}</span>
                  <p className="text-sm text-slate-600">{c.label}</p>
                </>
              );
              const cls =
                "bg-white border border-slate-200 rounded-2xl shadow-sm px-5 py-3 flex items-center gap-2.5";
              return c.href ? (
                <Link key={i} href={c.href} className={`${cls} hover:border-indigo-300 transition-colors`}>
                  {inner}
                </Link>
              ) : (
                <div key={i} className={cls}>
                  {inner}
                </div>
              );
            })}
          </div>
        )}

        {/* ---- practical exams ------------------------------------------- */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-black text-slate-900">Practical Exams</h2>
            <span className="text-sm font-bold text-slate-400">({practical.length})</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">{practicalNote}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {practical.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors p-4 block"
              >
                <p className="font-bold text-slate-900 text-sm">{p.label}</p>
                {p.note && <p className="text-xs text-slate-500 mt-0.5">{p.note}</p>}
              </Link>
            ))}
          </div>
        </div>

        {/* ---- statewide resources --------------------------------------- */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Compass className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-black text-slate-900">Statewide Resources</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">{resourcesNote}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {resources.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors p-4 block"
              >
                <p className="font-bold text-slate-900 text-sm inline-flex items-center gap-1">
                  {l.label}
                  <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                </p>
                {l.note && <p className="text-xs text-slate-500 mt-0.5">{l.note}</p>}
              </a>
            ))}
          </div>
        </div>

        {/* ---- what this hub is not -------------------------------------- */}
        <div className="bg-white border border-amber-300 rounded-2xl shadow-sm px-6 py-5 mb-8">
          <div className="flex items-start gap-2.5">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-black text-slate-900 mb-1">
                No {stateName} business listings yet
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                The directory covers Texas and California shops, salons, schools and supply stores.
                {" "}{stateName} here is exam information only — we would rather say so than show
                you an empty search box.
              </p>
              <p className="text-xs text-slate-500 mt-2">
                <strong className="text-slate-700">Checked {checked}.</strong> Every figure on these
                pages names the document it came from. Exam vendors revise their bulletins without
                notice, so confirm against your own copy before you rely on it.
              </p>
            </div>
          </div>
        </div>

        {/* ---- sibling hubs ---------------------------------------------- */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {siblings.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 transition-colors p-4 flex items-center justify-between gap-2"
            >
              <span className="text-sm font-bold text-slate-900">{s.label}</span>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
