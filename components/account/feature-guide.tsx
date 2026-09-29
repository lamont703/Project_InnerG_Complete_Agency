import Link from "next/link";
import { featureGuide, PRICING_NOTE, STATUS_LABEL } from "@/lib/account-features";

/**
 * What each account type gets, for an agency to read before a call. Built from
 * lib/account-features.ts, so the statuses are the ones the tools obey.
 * <details> rather than a client component: nothing here needs state.
 */
export function FeatureGuide() {
  const guides = featureGuide();
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">What each account type gets</h2>
      <p className="mt-2 text-sm text-slate-600">
        What to tell a business before they sign up. Anything marked <strong>In testing</strong> isn&apos;t open to your clients yet — don&apos;t sell it as available.
        In your Claude, ask &ldquo;what would a salon get from ShearQuery?&rdquo; for the same answer.
      </p>
      <p className="mt-2 text-xs text-slate-500"><strong>Pricing:</strong> {PRICING_NOTE}</p>
      <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100">
        {guides.map((g) => (
          <details key={g.id} className="group px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold">
              <span>{g.label} <span className="font-normal text-slate-500">— &ldquo;{g.who}&rdquo;</span></span>
              <span className="text-slate-400 group-open:rotate-90">›</span>
            </summary>
            <div className="mt-3 space-y-4 text-sm">
              {g.website.length > 0 && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">On the website</p>
                  <ul className="mt-1 space-y-1.5">
                    {g.website.map((w) => (
                      <li key={w.title}><strong>{w.title}.</strong> <span className="text-slate-600">{w.body}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">In Claude</p>
                <ul className="mt-1 space-y-2">
                  {g.claude.map((c) => (
                    <li key={c.title}>
                      <span className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${c.status === "live" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                      <strong>{c.title}.</strong> <span className="text-slate-600">{c.what}</span>
                      {c.needs && <p className="mt-0.5 text-xs text-slate-500">Needs: {c.needs}</p>}
                    </li>
                  ))}
                </ul>
              </div>
              {g.signupPath ? (
                <Link href={g.signupPath} className="inline-block text-xs font-bold text-blue-700 underline">Their signup page</Link>
              ) : g.id === "client" ? (
                <p className="text-xs text-slate-500">No signup: a client account is made when they book.</p>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
