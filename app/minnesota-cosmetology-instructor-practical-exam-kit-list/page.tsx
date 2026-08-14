import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink, AlertTriangle, PackageCheck } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { KitChecklist, type KitGroup } from "@/components/tools/kit-checklist";
import { AgentInvite } from "@/components/journey/agent-invite";
import { SITE_URL } from "@/lib/site";
import { authorSchema } from "@/lib/author";
import { REGULATORS, articleGraph, entityId, ref, stateNode, topics } from "@/lib/schema-graph";
import {
  MN_INSTRUCTOR_KIT, MN_VENDOR_SUPPLIES, MN_RULES, MN_SOURCES, MN_BULLETIN, CHECKED,
} from "@/lib/minnesota-licensing";

/**
 * Minnesota cosmetology instructor practical exam kit list.
 *
 * THE ONLY TEACHING EXAM IN THIS SET. Every other kit page equips someone to
 * perform a service; this one equips them to deliver a lesson. The list is
 * five entries and the rules run to nine, which is the correct weighting — a
 * candidate fails this on the 20-minute floor or a handwritten lesson plan far
 * more often than on a missing tool. The page is ordered to match.
 */

const PATH = "/minnesota-cosmetology-instructor-practical-exam-kit-list";
const TITLE = "Minnesota Cosmetology Instructor Practical Exam Kit List (2026)";
const DESCRIPTION =
  "What to bring to the Minnesota cosmetology instructor practical — the typed lesson plan and handout in duplicate, your own presentation tools and mannequin — plus the 20-minute floor that fails candidates outright.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "minnesota cosmetology instructor practical exam kit list",
    "minnesota instructor exam supplies",
    "psi minnesota instructor practical examination",
    "minnesota cosmetology instructor exam what to bring",
    "mn instructor practical exam lesson plan",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: { canonical: `${SITE_URL}${PATH}` },
};

const KIT_GROUPS: KitGroup[] = [
  {
    title: "Supplies and equipment",
    note: 'The bulletin\'s wording: "Required supplies include the following items."',
    items: MN_INSTRUCTOR_KIT.map((label) => ({ label })),
  },
];

const TOTAL = MN_INSTRUCTOR_KIT.length;

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
          Minnesota · PSI instructor practical
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
          Minnesota Cosmetology Instructor Practical Exam Kit List
        </h1>
        <p className="mb-6 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
          This one is unlike every other kit list on this site. Minnesota&apos;s instructor
          practical is a <strong>taught lesson</strong>, not a service — you hand in a lesson plan
          and a handout, then present for 20 to 60 minutes and are graded on teaching as well as
          technical skill. The packing list is short. The rules are what fail people.
        </p>

        {/* The outright-fail rule, first, because it is not a deduction. */}
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm leading-relaxed text-amber-900">
            <strong className="text-amber-950">
              A presentation under 20 minutes is an automatic fail
            </strong>{" "}
            — not a deduction. The proctor also stops you at 60 minutes, and nothing you present
            after that is rated. Your lesson plan must be <strong>typed</strong> and finished before
            you arrive; no time is allowed at the test site to write or change it.
          </p>
        </div>

        <KitChecklist groups={KIT_GROUPS} />

        <section className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-emerald-950">
            <PackageCheck className="h-4 w-4 text-emerald-700" />
            What the test site provides
          </h2>
          <ul className="space-y-1.5 text-sm text-emerald-900">
            {MN_VENDOR_SUPPLIES.map((v) => (
              <li key={v} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span>{v}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-emerald-900">
            That is the entire list — a table. Everything your presentation needs, including a
            mannequin, comes from you, and the bulletin tells you plainly that building a lesson
            that works in that limited setting is your responsibility.
          </p>
        </section>

        <AgentInvite
          questions={[
            "What does Minnesota require to become a cosmetology instructor?",
            "Which cosmetology schools are near me?",
            "What does booth rent cost around me once I'm licensed?",
          ]}
        />

        <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-3 text-lg font-black text-slate-900">
            The rules that actually decide this exam
          </h2>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-700">
            {MN_RULES.map((r) => (
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
            Read from the {MN_BULLETIN} on {CHECKED}, reached through PSI&apos;s candidate portal
            under client code <strong>MNCOS</strong>. Minnesota&apos;s other bulletin — Advanced
            Practice Esthetics — publishes no supply list, so it has no page here.
          </p>
          <ul className="space-y-1.5 text-sm">
            {[
              { href: MN_SOURCES.psiPortal, label: "PSI candidate portal — Minnesota (MNCOS)" },
              { href: MN_SOURCES.board, label: "Minnesota Board of Cosmetologist Examiners" },
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
              href: "/tennessee-barber-technician-practical-exam-kit-list",
              label: "Tennessee barber technician kit list",
              why: "Also PSI, and the other bulletin that publishes what the vendor supplies.",
            },
            {
              href: "/mississippi-cosmetology-practical-exam-kit-list",
              label: "Mississippi cosmetology kit list",
              why: "A service exam by contrast — six graded skills across two mannequins.",
            },
            {
              href: "/texas-cosmetology-practical-exam-kit-list",
              label: "Texas cosmetology kit list",
              why: "The operator licence rather than the instructor one.",
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
              about: [ref(REGULATORS.mn["@id"]), stateNode("MN"), ...topics("cosmetology")],
              citation: [{ "@type": "WebPage", name: MN_BULLETIN, url: MN_SOURCES.psiPortal }],
              extra: [
                REGULATORS.mn,
                {
                  "@type": "ItemList",
                  "@id": `${SITE_URL}${PATH}#kit`,
                  name: TITLE,
                  description: DESCRIPTION,
                  numberOfItems: TOTAL,
                  itemListElement: MN_INSTRUCTOR_KIT.map((label, n) => ({
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
