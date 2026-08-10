import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink, Info, AlertTriangle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import {
  CHECKED, MD_SOURCES, PSI_CONTAINER, PSI_MONOMER, PSI_NO_SUPPLY_LIST,
  type PsiPractical,
} from "@/lib/maryland-licensing";

/**
 * A PSI National Practical test guide.
 *
 * THIS IS NOT A KIT LIST PAGE, and the distinction is the whole reason the
 * component exists separately from the barber one. PSI writes an itemised kit
 * for the Maryland-specific barber practical and explicitly declines to write
 * one for its National Practical tests: "There are no supply lists or suggested
 * supplies." Candidates arrive expecting a list, find none, and that absence is
 * itself the useful answer — so the page leads with it rather than filling the
 * gap with a plausible-looking invention.
 *
 * What PSI does prescribe — container size, monomer, topic order, timings, pass
 * mark — is here, read from each licence's own bulletin.
 */
export function MdPractical({ p, related }: { p: PsiPractical; related: { href: string; label: string; why: string }[] }) {
  const summed = p.topics.reduce((n, t) => n + t.minutes, 0);
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

        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          Maryland · {p.board}
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
          Maryland {p.license} Practical Exam
        </h1>
        <p className="mb-8 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Maryland uses the <strong>PSI National Practical test</strong> for this licence:{" "}
          <strong>{p.topics.length} graded topic areas</strong>, about{" "}
          <strong>{p.totalMinutesStated} minutes</strong>, and you need{" "}
          <strong>{p.passPct}%</strong> to pass. Read from the {p.bulletin} bulletin.
        </p>

        {/* The thing candidates come looking for, and the honest answer. */}
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-sm leading-relaxed text-amber-900">
            <strong className="text-amber-950">There is no kit list for this exam.</strong>{" "}
            {PSI_NO_SUPPLY_LIST} If you have been looking for a Maryland {p.license.toLowerCase()}{" "}
            kit list and cannot find one, that is why — PSI does not publish one. Only the
            Maryland-specific <Link href="/maryland-barber-practical-exam-kit-list" className="font-bold underline">barber practical</Link>{" "}
            has an itemised kit.
          </div>
        </div>

        <section className="mb-10">
          <h2 className="mb-4 text-lg font-black text-slate-900">Topic order and timing</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[26rem] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 w-16">Topic</th>
                  <th className="px-4 py-3">Area</th>
                  <th className="px-4 py-3 w-28">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {p.topics.map((t, i) => (
                  <tr key={t.topic}>
                    <td className="px-4 py-2.5 tabular-nums font-black text-indigo-600">{i + 1}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-800">{t.topic}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-700">{t.minutes} min</td>
                  </tr>
                ))}
                <tr className="bg-slate-50">
                  <td className="px-4 py-2.5" />
                  <td className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500">
                    Topics total
                  </td>
                  <td className="px-4 py-2.5 tabular-nums font-black text-slate-900">{summed} min</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            PSI states the test runs approximately {p.totalMinutesStated} minutes.
            {summed === p.totalMinutesStated
              ? " The topic timings above add to exactly that."
              : ` The topic timings above add to ${summed} — see the note below.`}{" "}
            Procedure criteria are graded in the order listed.
          </p>
        </section>

        {p.sourceNote && (
          <div className="mb-10 flex items-start gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-5 py-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <p className="text-sm leading-relaxed text-slate-700">
              <strong className="text-slate-900">A note on the source.</strong> {p.sourceNote}
            </p>
          </div>
        )}

        <section className="mb-10">
          <h2 className="mb-4 text-lg font-black text-slate-900">What PSI does prescribe</h2>
          <ul className="space-y-2.5 text-sm leading-relaxed text-slate-700">
            {[PSI_CONTAINER, PSI_MONOMER,
              `You must score at least ${p.passPct}% to pass.`,
              "Electronics of any kind are prohibited in the testing facility.",
              "Test takers may not speak to or assist other test takers at any time.",
            ].map((x) => (
              <li key={x} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-2 text-sm font-black text-slate-900">Sources</h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            Read from the PSI Candidate Information Bulletin — {p.bulletin} — on {CHECKED}, through
            PSI&apos;s Maryland candidate portal. PSI stamps a version into every page of these
            bulletins and revises them; check yours against the current edition before exam day.
          </p>
          <ul className="space-y-1.5 text-sm">
            <li>
              <a href={MD_SOURCES.psiPortal} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline">
                PSI candidate portal — Maryland <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              <a href={MD_SOURCES.cosRequirements} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline">
                Maryland {p.board} — License Requirements <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          </ul>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          {related.map((r) => (
            <Link key={r.href} href={r.href}
              className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300">
              <span className="min-w-0">
                <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">{r.label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{r.why}</span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
