import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink, AlertTriangle, PackageCheck } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { KitChecklist, type KitGroup } from "@/components/tools/kit-checklist";
import { AgentInvite } from "@/components/journey/agent-invite";
import { SITE_URL } from "@/lib/site";
import { authorSchema } from "@/lib/author";
import { REGULATORS, articleGraph, entityId, ref, stateNode, topics } from "@/lib/schema-graph";
import {
  TN_TECHNICIAN_KIT, TN_VENDOR_SUPPLIES, TN_RULES, TN_SOURCES, TN_BULLETIN, CHECKED,
} from "@/lib/tennessee-licensing";

/**
 * Tennessee barber technician practical exam kit list.
 *
 * ONE PAGE, NOT THREE. Tennessee issues three barber bulletins and only this
 * one publishes a kit — Master Barber is the PSI container pattern with no
 * itemised list, and Barber Instructor asks candidates to bring whatever their
 * own lesson plan needs. See lib/tennessee-licensing.ts. Writing pages for the
 * other two would mean inventing their contents.
 *
 * THE VENDOR-SUPPLIES SECTION IS THE UNUSUAL PART and is kept prominent:
 * Tennessee publishes what the test centre provides, which no other document
 * in this repo does. Knowing what not to pack is worth as much as the list.
 */

const PATH = "/tennessee-barber-technician-practical-exam-kit-list";
const TITLE = "Tennessee Barber Technician Practical Exam Kit List (2026)";
const DESCRIPTION =
  "Every supply PSI lists for the Tennessee barber technician practical — mannequin head and hand, the manicure tools, the blood exposure kit — plus what the test centre supplies, and the wrong-item rule that quietly costs you points.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "tennessee barber technician practical exam kit list",
    "tennessee barber technician exam supplies",
    "psi tennessee barber technician exam",
    "tennessee barber exam what to bring",
    "tn barber technician practical exam",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: { canonical: `${SITE_URL}${PATH}` },
};

const KIT_GROUPS: KitGroup[] = [
  {
    title: "Kits, supplies and equipment",
    note: 'The bulletin\'s own wording is "recommended supplies" — but see the scoring rule below.',
    items: TN_TECHNICIAN_KIT.map((label) => ({ label })),
  },
];

const TOTAL = TN_TECHNICIAN_KIT.length;

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
          Tennessee · PSI practical exam
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
          Tennessee Barber Technician Practical Exam Kit List
        </h1>
        <p className="mb-6 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Tennessee&apos;s barber technician practical covers a manicure on a prepped hand and a
          facial on a mannequin, graded step by step and strictly in order. These are the{" "}
          <strong>{TOTAL} supplies</strong> PSI lists for it.
        </p>

        {/* The quiet failure mode. This is scored, not administrative, which
            makes it easier to walk into than a dismissal rule. */}
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm leading-relaxed text-amber-900">
            <strong className="text-amber-950">
              A wrong item costs you points, not your seat.
            </strong>{" "}
            The bulletin is explicit: if you do not bring the listed items, or bring a wrong one —
            its own examples are <em>real hair colour</em> or <em>real perm solution</em> — you
            receive no points for the steps that used it. Nobody stops you; you simply score
            nothing for that work.
          </p>
        </div>

        <KitChecklist groups={KIT_GROUPS} />

        {/* No other bulletin in this project publishes this. */}
        <section className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-emerald-950">
            <PackageCheck className="h-4 w-4 text-emerald-700" />
            Don&apos;t pack these — the test centre supplies them
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-emerald-900">
            Tennessee publishes what the vendor provides, which is unusual — most bulletins leave
            you guessing.
          </p>
          <ul className="grid gap-1.5 text-sm text-emerald-900 sm:grid-cols-2">
            {TN_VENDOR_SUPPLIES.map((v) => (
              <li key={v} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </section>

        <AgentInvite
          questions={[
            "What does Tennessee require to get a barber technician licence?",
            "Which barber schools are near me?",
            "What does booth rent cost around me once I'm licensed?",
          ]}
        />

        <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-3 text-lg font-black text-slate-900">Rules that cost points</h2>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-700">
            {TN_RULES.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="no-print mt-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-2 text-sm font-black text-slate-900">Sources</h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            Read from the {TN_BULLETIN} on {CHECKED}. Tennessee&apos;s other two barber bulletins
            carry no kit list — Master Barber uses the PSI closable-container format with no
            itemised supplies, and Barber Instructor asks candidates to bring whatever their own
            lesson plan and demonstration require — so neither has a page here.
          </p>
          <ul className="space-y-1.5 text-sm">
            {[
              { href: TN_SOURCES.psi, label: "PSI Exams" },
              { href: TN_SOURCES.board, label: "Tennessee Board of Cosmetology and Barber Examiners" },
            ].map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline"
                >
                  {s.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="no-print mt-8 grid gap-3 sm:grid-cols-2">
          {[
            {
              href: "/mississippi-barbering-practical-exam-kit-list",
              label: "Mississippi barbering kit list",
              why: "A neighbouring state that publishes far more — and needs a live model.",
            },
            {
              href: "/texas-barber-state-board-practical-exam-kit-list",
              label: "Texas barber kit list",
              why: "Also PSI, and still a different kit.",
            },
            {
              href: "/ohio-barber-practical-exam-kit-list",
              label: "Ohio barber kit list",
              why: "A board that publishes no list at all — it makes you derive one.",
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
              about: [ref(REGULATORS.tn["@id"]), stateNode("TN"), ...topics("barbering")],
              citation: [{ "@type": "WebPage", name: TN_BULLETIN, url: TN_SOURCES.psi }],
              extra: [
                REGULATORS.tn,
                {
                  "@type": "ItemList",
                  "@id": `${SITE_URL}${PATH}#kit`,
                  name: TITLE,
                  description: DESCRIPTION,
                  numberOfItems: TOTAL,
                  itemListElement: TN_TECHNICIAN_KIT.map((label, n) => ({
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
