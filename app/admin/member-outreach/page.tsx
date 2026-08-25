import { notFound } from "next/navigation";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { outreachSuggestions, signalLabel, stepLabel } from "@/lib/admin/member-outreach";
import { OutreachBoard } from "@/components/admin/outreach-board";
import { Send } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Member Engagement Outreach | Inner G Complete",
  robots: { index: false, follow: false },
};

/**
 * Drafted messages to members, for a human to read and send.
 *
 * Gated by middleware plus isAdmin() here, because middleware fails OPEN on an
 * auth exception and this page can send messages to real people.
 */
export default async function MemberOutreachPage() {
  if (!(await isAdmin())) notFound();

  const suggestions = await outreachSuggestions();
  const bySignal = suggestions.reduce<Record<string, number>>((acc, s) => {
    acc[s.signal] = (acc[s.signal] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 pt-28 pb-16 sm:px-6">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-700">
          <Send className="h-3 w-3" />
          Internal · Member Engagement Outreach
        </span>

        <h1 className="mb-2 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          {suggestions.length === 0 ? "Nobody to reach out to" : `${suggestions.length} to reach out to`}
        </h1>

        <p className="mb-8 max-w-2xl text-sm text-slate-500">
          Every one of these is here because something happened — an offer followed and
          abandoned, a listing claimed without Google connected. Nothing is queued because
          time has passed. Each draft is written for that member from what we know about
          their business and pushes them to one next step, never a list of features.
          Read it, change it to sound like you, then send. Anyone contacted in the last 10
          days is left out, and a draft you edit is kept and never rewritten.
        </p>

        {Object.keys(bySignal).length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {Object.entries(bySignal).map(([signal, count]) => (
              <span
                key={signal}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-600"
              >
                {signalLabel(signal as any)} · {count}
              </span>
            ))}
            {[...new Set(suggestions.map((s) => s.step))].map((step) => (
              <span
                key={step}
                className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-700"
              >
                → {stepLabel(step)}
              </span>
            ))}
          </div>
        )}

        <OutreachBoard suggestions={suggestions} />
      </div>
    </div>
  );
}
