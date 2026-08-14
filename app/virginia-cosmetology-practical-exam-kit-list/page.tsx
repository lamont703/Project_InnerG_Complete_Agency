import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink, AlertTriangle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { KitChecklist, type KitGroup } from "@/components/tools/kit-checklist";
import { AgentInvite } from "@/components/journey/agent-invite";
import { SITE_URL } from "@/lib/site";
import { authorSchema } from "@/lib/author";
import { REGULATORS, articleGraph, entityId, ref, stateNode, topics } from "@/lib/schema-graph";
import { VA_COSMETOLOGY_KIT, VA_SOURCES, LABELING_RULES, CHECKED } from "@/lib/virginia-licensing";

/**
 * Virginia cosmetology practical exam kit list.
 *
 * ONE FLAT LIST, ON PURPOSE. The barber CIB groups its supplies under nine
 * service headings; this one gives a single alphabetical list. Imposing the
 * barber document's groupings here would be an editorial invention dressed up
 * as the bulletin's own structure, so the flat list stays flat.
 *
 * IT IS ALSO A NEWER DOCUMENT — effective 2022 against the barber bulletin's
 * 2018. Two licences, one state, one vendor, four years apart. That is the
 * concrete reason CLAUDE.md forbids carrying a figure from one CIB to another.
 */

const PATH = "/virginia-cosmetology-practical-exam-kit-list";
const TITLE = "Virginia Cosmetology Practical Exam Kit List (NIC)";
const DESCRIPTION =
  "Every supply NIC lists for the Virginia cosmetology practical exam — from foils and thermal irons to the labelled disposal containers and disinfectant wipes — plus the English-labelling rule that applies to all of it.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "virginia cosmetology practical exam kit list",
    "virginia cosmetology exam supplies",
    "nic cosmetology practical exam kit",
    "virginia cosmetology exam what to bring",
    "va cosmetology practical exam",
    "dpor cosmetology practical exam",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: { canonical: `${SITE_URL}${PATH}` },
};

const KIT_GROUPS: KitGroup[] = [
  {
    title: "Suggested supplies",
    note: "NIC gives this as one alphabetical list rather than grouping it by service, and it is reproduced that way here.",
    items: VA_COSMETOLOGY_KIT.items.map((label) => ({ label })),
  },
];

const TOTAL = VA_COSMETOLOGY_KIT.items.length;

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
          Virginia Cosmetology Practical Exam Kit List
        </h1>
        <p className="mb-6 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
          These are the <strong>{TOTAL} supplies</strong> NIC lists for the Virginia cosmetology
          practical, taken from the bulletin effective{" "}
          <strong>{VA_COSMETOLOGY_KIT.bulletinLabel.replace("Eff. ", "")}</strong>.
        </p>

        <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4">
          <p className="text-sm leading-relaxed text-indigo-900">
            <strong>Virginia doesn&apos;t write this exam — NIC does.</strong> DPOR issues the
            licence; the practical is the National-Interstate Council&apos;s national cosmetology
            examination. And note this is <strong>not</strong> the same list as the Virginia master
            barber kit: that bulletin is four years older, groups its supplies by service, and asks
            for disinfectant where this one asks specifically for disinfectant <em>wipes</em>.
          </p>
        </div>

        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm leading-relaxed text-amber-900">
            <strong className="text-amber-950">NIC calls this a suggested list.</strong> Its exact
            words: candidates are responsible for bringing all needed materials, even if not
            included on this list. Read your own current bulletin before exam day.
          </p>
        </div>

        <KitChecklist groups={KIT_GROUPS} />

        <AgentInvite
          questions={[
            "Does Virginia have a practical exam, and who writes it?",
            "What's on the Virginia cosmetology practical?",
            "Why is Virginia's cosmetology kit different from its barber kit?",
          ]}
        />

        <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-3 text-lg font-black text-slate-900">
            The labelling rule that applies to everything above
          </h2>
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
                Mannequins may carry <strong>no pre-markings or pre-sectioning</strong>, and the
                thermal curling iron&apos;s cord must be <strong>unbound and unaltered</strong>.
              </span>
            </li>
          </ul>
        </section>

        <section className="no-print mt-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-2 text-sm font-black text-slate-900">Sources</h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            Read from the {VA_COSMETOLOGY_KIT.bulletin}, {VA_COSMETOLOGY_KIT.bulletinLabel}, on{" "}
            {CHECKED}.
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
              href: "/virginia-master-barber-practical-exam-kit-list",
              label: "Virginia master barber kit list",
              why: "Same state and vendor, an older bulletin and a different kit.",
            },
            {
              href: "/texas-cosmetology-practical-exam-kit-list",
              label: "Texas cosmetology kit list",
              why: "The same licence in another state, under PSI rather than NIC.",
            },
            {
              href: "/maryland-barber-practical-exam-kit-list",
              label: "Maryland barber kit list",
              why: "A neighbouring state on a third set of rules.",
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
              about: [ref(REGULATORS.va["@id"]), stateNode("VA"), ...topics("cosmetology")],
              citation: [
                {
                  "@type": "WebPage",
                  name: `${VA_COSMETOLOGY_KIT.bulletin}, ${VA_COSMETOLOGY_KIT.bulletinLabel}`,
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
                  itemListElement: VA_COSMETOLOGY_KIT.items.map((label, n) => ({
                    "@type": "ListItem",
                    position: n + 1,
                    name: label,
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
