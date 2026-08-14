import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink, AlertTriangle, Tag } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { KitChecklist, type KitGroup } from "@/components/tools/kit-checklist";
import { AgentInvite } from "@/components/journey/agent-invite";
import { SITE_URL } from "@/lib/site";
import { authorSchema } from "@/lib/author";
import { REGULATORS, articleGraph, entityId, ref, stateNode, topics } from "@/lib/schema-graph";
import {
  MS_GENERAL_BAG, MS_RULES, MS_SOURCES, MS_HANDBOOK, CHECKED, type MsSkill,
} from "@/lib/mississippi-licensing";

/**
 * Shared body for the four Mississippi kit pages.
 *
 * ONE COMPONENT, FOUR PAGES, because the four licences genuinely share their
 * framing: the same handbook, the same general bag, the same rules, the same
 * Label column. Only the per-skill equipment differs, and that arrives as a
 * prop. Four near-identical page files would have drifted the moment one of
 * them was edited.
 *
 * THE LABEL COLUMN IS RENDERED AS A HINT, not folded into the item text. The
 * handbook requires a specific string on specific items — a spray bottle
 * reading "Water", mock bleach reading "Bleach" — and a candidate scanning the
 * list needs to see which items carry that burden and which do not.
 */

export interface MsKitPageProps {
  path: string;
  title: string;
  description: string;
  /** e.g. "Cosmetology" — used in headings and prose. */
  licence: string;
  skills: readonly MsSkill[];
  /** One sentence on what makes this licence's exam distinctive. */
  intro: React.ReactNode;
  /** schema.org topic key — constrained by `topics()` in lib/schema-graph. */
  topic: Parameters<typeof topics>[0];
  related: { href: string; label: string; why: string }[];
}

export function MsKitPage({
  path, title, description, licence, skills, intro, topic, related,
}: MsKitPageProps) {
  const groups: KitGroup[] = [
    {
      title: MS_GENERAL_BAG.heading,
      note: "Carried by every candidate whatever the licence.",
      items: MS_GENERAL_BAG.items.map((i) => ({
        label: i.label,
        hint: i.labelAs ? `Label it "${i.labelAs}"` : undefined,
        mustLabel: Boolean(i.labelAs),
      })),
    },
    ...skills.map((s) => ({
      title: s.heading,
      note: s.prop ? `Performed on: ${s.prop}` : undefined,
      items: s.items.map((i) => ({
        label: i.label,
        hint: i.labelAs ? `Label it "${i.labelAs}"` : undefined,
        mustLabel: Boolean(i.labelAs),
      })),
    })),
  ];
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const labelled = groups.flatMap((g) => g.items).filter((i) => i.mustLabel).length;

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
          Mississippi · MSBCB practical exam
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
          Mississippi {licence} Practical Exam Kit List
        </h1>
        <p className="mb-6 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
          {intro} All <strong>{total} items</strong> below are printed in the Board&apos;s own
          handbook, listed under the skill they belong to.
        </p>

        {/* The Label column is the thing candidates lose points on and it is
            unique to Mississippi among the states covered on this site. */}
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4">
          <Tag className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
          <p className="text-sm leading-relaxed text-indigo-900">
            <strong>{labelled} of these items must carry an exact label.</strong> The handbook has
            two columns — the item, and the precise word it must be labelled with. Not &ldquo;label
            your bottles&rdquo;: a spray bottle must read <strong>Water</strong>, a perm bottle must
            read <strong>Perm Wave Solution</strong>. Each one is marked below.
          </p>
        </div>

        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm leading-relaxed text-amber-900">
            <strong className="text-amber-950">
              Your carrying case may not exceed 20&Prime; × 14&Prime; × 9&Prime;
            </strong>{" "}
            — and if any required document is missing at check-in you are disqualified and forfeit
            every fee. Read your own current handbook before exam day; the Board revises it.
          </p>
        </div>

        <KitChecklist groups={groups} />

        <AgentInvite
          questions={[
            `What does Mississippi require to get a ${licence.toLowerCase()} licence?`,
            "Which schools are near me?",
            "What does booth rent cost around me once I'm licensed?",
          ]}
        />

        <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-3 text-lg font-black text-slate-900">
            Rules that decide whether you test at all
          </h2>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-700">
            {MS_RULES.map((r) => (
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
            Read from the {MS_HANDBOOK} on {CHECKED}. Mississippi&apos;s practical is
            board-administered and evaluated by licensed practitioners of the licence being
            examined — there is no PSI or NIC bulletin involved.
          </p>
          <ul className="space-y-1.5 text-sm">
            {[
              { href: MS_SOURCES.handbook, label: "MSBCB Practical Exam Handbook (PDF)" },
              { href: MS_SOURCES.board, label: "Mississippi State Board of Cosmetology" },
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
          {related.map((r) => (
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
              path,
              headline: title,
              description,
              author: authorSchema(),
              dateModified: CHECKED,
              about: [ref(REGULATORS.ms["@id"]), stateNode("MS"), ...topics(topic)],
              citation: [
                { "@type": "WebPage", name: MS_HANDBOOK, url: MS_SOURCES.handbook },
              ],
              extra: [
                REGULATORS.ms,
                {
                  "@type": "ItemList",
                  "@id": `${SITE_URL}${path}#kit`,
                  name: title,
                  description,
                  numberOfItems: total,
                  itemListElement: groups.flatMap((g) => g.items).map((i, n) => ({
                    "@type": "ListItem",
                    position: n + 1,
                    name: i.label,
                  })),
                  isPartOf: ref(entityId(path)),
                },
              ],
            })
          ),
        }}
      />
    </div>
  );
}
