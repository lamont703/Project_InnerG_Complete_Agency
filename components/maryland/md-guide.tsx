import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { CHECKED, type FeeRow, type Requirement } from "@/lib/maryland-licensing";
import { AgentInvite } from "@/components/journey/agent-invite";

/**
 * One shell for the Maryland licensing guides.
 *
 * Shared rather than copied because the four pages differ only in their data,
 * and the parts that must never drift — the "checked on" date, the source
 * links, the link back to the hub — are exactly the parts a copy-paste would
 * let drift.
 */

export interface MdGuideProps {
  eyebrow: string;
  h1: string;
  intro: React.ReactNode;
  /** Named so a reader can see which board a figure came from. */
  board: "Board of Barbers" | "Board of Cosmetologists";
  requirements?: Requirement[];
  fees?: FeeRow[];
  facts?: { n: string; l: string; s?: string }[];
  body?: React.ReactNode;
  sources: { label: string; href: string }[];
  related: { href: string; label: string; why: string }[];
}

export function MdGuide({
  eyebrow, h1, intro, board, requirements, fees, facts, body, sources, related, agentQuestions,
}: MdGuideProps & { agentQuestions?: string[] }) {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 pt-28 pb-16">
        <Link
          href="/maryland"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-indigo-600 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Maryland hub
        </Link>

        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">{eyebrow}</p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">{h1}</h1>
        <div className="mb-8 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">{intro}</div>

        {facts && facts.length > 0 && (
          <section className="mb-10 grid gap-3 sm:grid-cols-3">
            {facts.map((f) => (
              <div key={f.l} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <p className="text-2xl font-black tracking-tight text-slate-900">{f.n}</p>
                <p className="text-sm font-bold text-slate-700">{f.l}</p>
                {f.s && <p className="mt-0.5 text-xs text-slate-500">{f.s}</p>}
              </div>
            ))}
          </section>
        )}

        {requirements && (
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-black text-slate-900">Requirements by licence</h2>
            <div className="space-y-3">
              {requirements.map((r) => (
                <div key={r.license} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <div className="mb-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-sm font-black text-slate-900">{r.license}</h3>
                    {r.schoolHours && (
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 tabular-nums">
                        {r.schoolHours.toLocaleString()} school hours
                      </span>
                    )}
                    {r.apprenticeHours && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 tabular-nums">
                        {r.apprenticeHours.toLocaleString()} apprentice hours
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600">{r.detail}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Wording taken from the {board}&apos;s own requirements page rather than paraphrased.
            </p>
          </section>
        )}

        {fees && (
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-black text-slate-900">Fee schedule</h2>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Licence</th>
                    <th className="px-4 py-3">Cat</th>
                    <th className="px-4 py-3">Original</th>
                    <th className="px-4 py-3">Renewal</th>
                    <th className="px-4 py-3">Late</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fees.map((f) => (
                    <tr key={f.license}>
                      <td className="px-4 py-2.5 font-bold text-slate-800">{f.license}</td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-500">{f.cat}</td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-700">{f.original}</td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-700">{f.renewal}</td>
                      <td className="px-4 py-2.5 text-slate-600">{f.late}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              The board states fees are set by law and regulation, are subject to change with public
              notice, and are all nonrefundable.
            </p>
          </section>
        )}

        {body}

        <section className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-2 text-sm font-black text-slate-900">Where these figures come from</h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            Read from the {board} on <strong>{CHECKED}</strong>. Maryland publishes this as web
            pages, not PDFs, and those pages carry no version and change without notice — so check
            the source before relying on a figure.
          </p>
          <ul className="space-y-1.5 text-sm">
            {sources.map((s) => (
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

        <section className="grid gap-3 sm:grid-cols-2">
          {related.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
            >
              <span className="min-w-0">
                <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">{r.label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{r.why}</span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
            </Link>
          ))}
        </section>
        {/* Passed in rather than derived: this component carries nothing
            that identifies its route, and guessing from the heading would
            put renewal questions on a requirements page. */}
        {agentQuestions?.length ? <AgentInvite questions={agentQuestions} /> : null}

      </main>
    </div>
  );
}
