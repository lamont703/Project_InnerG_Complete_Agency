import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink, AlertTriangle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { KitChecklist, type KitGroup } from "@/components/tools/kit-checklist";
import { AgentInvite } from "@/components/journey/agent-invite";
import { SITE_URL } from "@/lib/site";
import { authorSchema } from "@/lib/author";
import { REGULATORS, articleGraph, entityId, ref, stateNode, topics } from "@/lib/schema-graph";
import { VA_BARBER_KIT, VA_SOURCES, LABELING_RULES, CHECKED } from "@/lib/virginia-licensing";

/**
 * Virginia master barber practical exam kit list.
 *
 * THE VENDOR IS THE THING TO GET RIGHT. Virginia does not write its own
 * practical — candidates sit NIC's National Barber Styling Practical
 * Examination. So this page cites NIC for the kit and DPOR for the licence,
 * and never blurs the two. Everything the Texas and Maryland pages say comes
 * from PSI bulletins, which have no bearing here.
 *
 * THE 2018 DATE IS SURFACED, NOT BURIED. The bulletin in our reference set is
 * Rev. 9/21/18, Eff. 6/1/2018. That is old enough that the page says so above
 * the fold and sends the reader to their own copy, rather than implying it was
 * checked last week.
 */

const PATH = "/virginia-master-barber-practical-exam-kit-list";
const TITLE = "Virginia Master Barber Practical Exam Kit List (NIC)";
const DESCRIPTION =
  "Every supply NIC lists for the Virginia master barber practical exam — universal kit, haircutting, shaving, chemical waving, relaxer, colour and the blood exposure bag — plus the English-labelling rule that applies to all of it.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "virginia master barber practical exam kit list",
    "virginia barber practical exam supplies",
    "nic barber practical exam kit",
    "virginia barber exam what to bring",
    "va master barber exam",
    "dpor barber practical exam",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: { canonical: `${SITE_URL}${PATH}` },
};

const KIT_GROUPS: KitGroup[] = VA_BARBER_KIT.sections.map((s) => ({
  title: s.heading,
  items: s.items.map((label) => ({ label })),
}));

const TOTAL = KIT_GROUPS.reduce((n, g) => n + g.items.length, 0);

export default function Page() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <div className="no-print">
        <Navbar />
      </div>
      <main className="mx-auto max-w-4xl px-4 sm:px-6 pt-28 pb-16">
        <Link
          href="/"
          className="no-print mb-6 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-indigo-600 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          ShearQuery
        </Link>

        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          Virginia · NIC practical exam
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
          Virginia Master Barber Practical Exam Kit List
        </h1>
        <p className="mb-6 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Virginia&apos;s barber practical is graded across haircutting, shaving, chemical waving,
          relaxer, colour and a blood exposure procedure, all on a mannequin. These are the{" "}
          <strong>{TOTAL} supplies</strong> NIC lists, grouped by service exactly as the bulletin
          groups them.
        </p>

        {/* Virginia does not write this exam. Saying so up front is the single
            most useful thing on the page — it tells a candidate which document
            governs them and which ones do not. */}
        <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4">
          <p className="text-sm leading-relaxed text-indigo-900">
            <strong>Virginia doesn&apos;t write this exam — NIC does.</strong> DPOR issues the
            licence, but the practical is the National-Interstate Council&apos;s national barber
            styling examination. That is why this kit differs from the Texas and Maryland lists on
            this site: those come from PSI bulletins, a different vendor entirely.
          </p>
        </div>

        {/* The source's own hedge, and its age. Both kept rather than dropped. */}
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm leading-relaxed text-amber-900">
            <strong className="text-amber-950">
              NIC calls this a suggested list, and this bulletin is dated {VA_BARBER_KIT.bulletinLabel}.
            </strong>{" "}
            Its exact words: candidates are responsible for bringing all needed materials, even if
            not included on this list. NIC revises these documents and this one is several years
            old — read your own current bulletin before exam day and treat this as the starting
            point, not the final word.
          </p>
        </div>

        <KitChecklist groups={KIT_GROUPS} />

        <AgentInvite
          questions={[
            "Does Virginia have a practical exam, and who writes it?",
            "What's on the Virginia master barber practical?",
            "How does Virginia's kit differ from Texas or Maryland?",
          ]}
        />

        <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-3 text-lg font-black text-slate-900">
            The labelling rule that applies to everything above
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            NIC states this as four separate rules. They are not the same rule worded four ways —
            manufacturer labels and labels you make yourself are treated differently.
          </p>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-700">
            {LABELING_RULES.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                <span>{r}</span>
              </li>
            ))}
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              <span>
                Mannequins may carry <strong>no pre-markings or pre-sectioning</strong>, and clippers
                must have an <strong>actual electrical cord</strong>.
              </span>
            </li>
          </ul>
        </section>

        <section className="no-print mt-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-2 text-sm font-black text-slate-900">Sources</h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            Read from the {VA_BARBER_KIT.bulletin}, {VA_BARBER_KIT.bulletinLabel}, on {CHECKED}.
          </p>
          <ul className="space-y-1.5 text-sm">
            <li>
              <a
                href={VA_SOURCES.nic}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline"
              >
                NIC — National-Interstate Council of State Boards of Cosmetology
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              <a
                href={VA_SOURCES.board}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline"
              >
                Virginia DPOR — Board for Barbers and Cosmetology
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          </ul>
        </section>

        <section className="no-print mt-8 grid gap-3 sm:grid-cols-2">
          {[
            {
              href: "/virginia-cosmetology-practical-exam-kit-list",
              label: "Virginia cosmetology kit list",
              why: "Same state, same vendor, a different and newer bulletin.",
            },
            {
              href: "/maryland-barber-practical-exam-kit-list",
              label: "Maryland barber kit list",
              why: "The neighbouring state — PSI, not NIC, and a different kit.",
            },
            {
              href: "/texas-barber-state-board-practical-exam-kit-list",
              label: "Texas barber kit list",
              why: "The same trade in another state. The kits are not the same.",
            },
          ].map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
            >
              <span className="min-w-0">
                <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                  {r.label}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{r.why}</span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
            </Link>
          ))}
        </section>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            articleGraph({
              path: PATH,
              headline: TITLE,
              description: DESCRIPTION,
              author: authorSchema(),
              dateModified: CHECKED,
              about: [ref(REGULATORS.va["@id"]), stateNode("VA"), ...topics("barbering")],
              citation: [
                {
                  "@type": "WebPage",
                  name: `${VA_BARBER_KIT.bulletin}, ${VA_BARBER_KIT.bulletinLabel}`,
                  url: VA_SOURCES.nic,
                },
              ],
              extra: [
                REGULATORS.va,
                {
                  "@type": "ItemList",
                  "@id": `${SITE_URL}${PATH}#kit`,
                  name: TITLE,
                  description: DESCRIPTION,
                  numberOfItems: TOTAL,
                  itemListElement: KIT_GROUPS.flatMap((g) => g.items).map((i, n) => ({
                    "@type": "ListItem",
                    position: n + 1,
                    name: i.label,
                  })),
                  isPartOf: ref(entityId(PATH)),
                },
              ],
            })
          ),
        }}
      />
    </div>
  );
}
