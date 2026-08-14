import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink, AlertTriangle, Info } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { KitChecklist, type KitGroup } from "@/components/tools/kit-checklist";
import { AgentInvite } from "@/components/journey/agent-invite";
import { SITE_URL } from "@/lib/site";
import { authorSchema } from "@/lib/author";
import { REGULATORS, articleGraph, entityId, ref, stateNode, topics } from "@/lib/schema-graph";
import { OH_COSMETOLOGY_KIT, OH_RULES, OH_SOURCES, CHECKED } from "@/lib/ohio-licensing";

/**
 * Ohio barber practical exam kit list.
 *
 * THE PAGE DOES WORK THE BOARD EXPLICITLY DELEGATES. Ohio publishes no supply
 * list. It names seven items outright and then says: "Refer to the task's
 * lines in each subject area to determine your supply list." So the page is
 * split into what the Board stated and what was derived from the graded tasks,
 * with the exam section named against every derived group. Blurring the two
 * would claim Board authorship for our reading.
 *
 * AND IT CARRIES A WARNING AGAINST ITSELF. The TIP prohibits printed itemised
 * supply lists in the examination room. A printable checklist page has an
 * obligation to say so plainly rather than hand someone a dismissal.
 */

const PATH = "/ohio-cosmetology-practical-exam-kit-list";
const TITLE = "Ohio Cosmetology Practical Exam Kit List (2026)";
const DESCRIPTION =
  "Ohio publishes no supply list for the cosmetology practical — it tells candidates to build one from the graded tasks. This is that list, assembled task by task: haircutting, chemical wave, colour, foils, relaxer, a facial and a full manicure.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "ohio cosmetology practical exam kit list",
    "ohio cosmetology practical exam supplies",
    "ohio cosmetology exam what to bring",
    "ohio cosmetology and barber board practical exam",
    "ohio cosmetology state board exam",
    "ohio cosmetology TIP testing information packet",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: { canonical: `${SITE_URL}${PATH}` },
};

const KIT_GROUPS: KitGroup[] = [
  {
    title: OH_COSMETOLOGY_KIT.stated.heading,
    note: "These eight are named in the packet itself.",
    items: OH_COSMETOLOGY_KIT.stated.items.map((label) => ({ label })),
  },
  ...OH_COSMETOLOGY_KIT.derived.map((s) => ({
    title: s.heading,
    note: s.fromTask ? `Derived from: ${s.fromTask}` : undefined,
    items: s.items.map((label) => ({ label })),
  })),
];

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
          Ohio · State board practical exam
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
          Ohio Cosmetology Practical Exam Kit List
        </h1>
        <p className="mb-6 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Ohio&apos;s cosmetology practical spans hair, skin and nails in one sitting — a
          30-minute haircut, chemical wave, colour retouch, four foil packets, a virgin relaxer, a
          cleansing and facial massage, then a complete manicure on a mannequin hand. These are the{" "}
          <strong>{TOTAL} items</strong> those sections require.
        </p>

        {/* The Board writes its own exam. Saying which document governs is the
            most useful orientation a candidate can get. */}
        <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4">
          <p className="text-sm leading-relaxed text-indigo-900">
            <strong>Ohio writes and runs its own exam.</strong> There is no PSI bulletin and no NIC
            bulletin here — the Ohio State Cosmetology and Barber Board issues a Testing
            Information Packet, and that is the only document that governs this exam. The Texas,
            Maryland and Virginia kit lists on this site come from different vendors entirely and do
            not transfer.
          </p>
        </div>

        {/* How the list was built. This is the page's central honesty claim and
            it belongs above the checklist, not in a footnote. */}
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-5 py-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <p className="text-sm leading-relaxed text-slate-700">
            <strong className="text-slate-900">Ohio publishes no supply list.</strong> The packet
            names eight items and then says: &ldquo;Refer to the task&rsquo;s lines in each subject
            area to determine your supply list.&rdquo; The first group below is what the Board
            named. Every group after it was assembled by reading the graded tasks, and each one says
            which exam section it came from so you can check the working against your own copy.
          </p>
        </div>

        {/* The rule that a printable checklist page must not bury. */}
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm leading-relaxed text-amber-900">
            <strong className="text-amber-950">Do not take this page into the exam room.</strong>{" "}
            Ohio prohibits printed materials, handwritten notes and itemised supply or procedure
            lists in the examination room, and numbering your supplies to remember their order is
            prohibited too. Use this to pack the night before, then leave it in the car.
          </p>
        </div>

        <KitChecklist groups={KIT_GROUPS} />

        <AgentInvite
          questions={[
            "What does Ohio require to get a barber licence?",
            "Which barber schools are near me?",
            "What does booth rent cost around me once I'm licensed?",
          ]}
        />

        <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-3 text-lg font-black text-slate-900">Rules that get you dismissed</h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            These are not etiquette. The packet attaches dismissal and rescheduling to several of
            them, and a dismissal bars you from rebooking for 30 days.
          </p>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-700">
            {OH_RULES.map((r) => (
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
            Read from the {OH_COSMETOLOGY_KIT.document} ({OH_COSMETOLOGY_KIT.revisedLabel}) on {CHECKED}. The
            Board&apos;s own vanity domains do not currently resolve, so the links below go to the
            Ohio Administrative Code the packet cites by rule number, and to eLicense.
          </p>
          <ul className="space-y-1.5 text-sm">
            {[
              { href: OH_SOURCES.dressCodeRule, label: "OAC 4713-5-28 — examination dress code" },
              { href: OH_SOURCES.examRuleChapter, label: "OAC Chapter 4713-5 — examinations" },
              { href: OH_SOURCES.elicense, label: "Ohio eLicense" },
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
              href: "/ohio-barber-practical-exam-kit-list",
              label: "Ohio barber kit list",
              why: "Same board, a narrower exam — and it wants a tripod stand specifically.",
            },
            {
              href: "/virginia-cosmetology-practical-exam-kit-list",
              label: "Virginia cosmetology kit list",
              why: "NIC's national exam, with a published list rather than a derived one.",
            },
            {
              href: "/texas-cosmetology-practical-exam-kit-list",
              label: "Texas cosmetology kit list",
              why: "The same licence under PSI. The kits are not the same.",
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
              about: [ref(REGULATORS.oh["@id"]), stateNode("OH"), ...topics("cosmetology")],
              citation: [
                {
                  "@type": "WebPage",
                  name: `${OH_COSMETOLOGY_KIT.document} (${OH_COSMETOLOGY_KIT.revisedLabel})`,
                  url: OH_SOURCES.examRuleChapter,
                },
              ],
              extra: [
                REGULATORS.oh,
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
