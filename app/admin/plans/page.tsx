import { notFound } from "next/navigation";
import { CreditCard } from "lucide-react";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUDIENCES, storedAudience } from "@/lib/audiences";
import { FREE_PUBLISHES_PER_MONTH, PRICES, hasPaidPlans } from "@/lib/plans";
import { PlanSelect } from "@/components/admin/plan-select";

/**
 * Members' plans, set by hand until checkout exists (lib/plans.ts). Search by
 * email or name; members already on a paid plan are always listed.
 */
export const dynamic = "force-dynamic";
export const metadata = { title: "Plans | Admin", robots: { index: false, follow: false } };

const COLS = "id, first_name, last_name, email, audience, plan, plan_source, plan_updated_at";

export default async function PlansAdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  if (!(await isAdmin())) notFound();
  const q = String((await searchParams).q || "").trim().slice(0, 80);
  const db = createAdminClient() as any;
  const [{ data: paid }, { data: found }] = await Promise.all([
    db.from("community_members").select(COLS).eq("is_demo", false).neq("plan", "free").order("plan_updated_at", { ascending: false }).limit(200),
    q
      ? db.from("community_members").select(COLS).eq("is_demo", false)
          .or(`email.ilike.%${q.replace(/[%,()]/g, "")}%,first_name.ilike.%${q.replace(/[%,()]/g, "")}%,last_name.ilike.%${q.replace(/[%,()]/g, "")}%`)
          .limit(25)
      : { data: [] },
  ]);

  const row = (m: any) => {
    const t = storedAudience(m.audience);
    return (
      <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="min-w-0">
          <p className="font-bold">{[m.first_name, m.last_name].filter(Boolean).join(" ") || "—"} <span className="font-normal text-slate-500">· {m.email}</span></p>
          <p className="text-xs text-slate-500">
            {t ? AUDIENCES[t].label : "type not set"}
            {t && PRICES[t] ? ` · Manage $${PRICES[t]!.manage} · Autopilot $${PRICES[t]!.autopilot}` : ""}
            {m.plan_source !== "default" ? ` · set by ${m.plan_source}${m.plan_updated_at ? ` ${new Date(m.plan_updated_at).toLocaleDateString()}` : ""}` : ""}
          </p>
        </div>
        {hasPaidPlans(t) ? <PlanSelect memberId={m.id} plan={m.plan} /> : <span className="text-xs text-slate-500">Always free</span>}
      </li>
    );
  };

  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-4xl px-5 pt-28 pb-20 sm:px-6">
        <h1 className="flex items-center gap-2 text-2xl font-black"><CreditCard className="h-6 w-6" /> Plans</h1>
        <p className="mt-2 text-sm text-slate-600">
          Everyone starts on Free: {FREE_PUBLISHES_PER_MONTH} Google publishes a month, drafts unlimited. Manage publishes without a limit and unlocks the
          appointment book and Instagram once they open. Checkout isn&apos;t built yet, so plans are set here by hand. Admins and demo businesses always act as Autopilot.
        </p>

        <form className="mt-6 flex gap-2" action="/admin/plans">
          <input name="q" defaultValue={q} placeholder="Search by email or name" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm" />
          <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white">Search</button>
        </form>

        {q && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 shadow-sm">
            {(found || []).length ? <ul className="divide-y divide-slate-100">{found.map(row)}</ul> : <p className="py-4 text-sm text-slate-500">No member matches &ldquo;{q}&rdquo;.</p>}
          </section>
        )}

        <h2 className="mt-8 text-sm font-black uppercase tracking-wide text-slate-500">On a paid plan ({(paid || []).length})</h2>
        <section className="mt-2 rounded-2xl border border-slate-200 bg-white px-5 shadow-sm">
          {(paid || []).length ? <ul className="divide-y divide-slate-100">{paid.map(row)}</ul> : <p className="py-4 text-sm text-slate-500">Nobody yet.</p>}
        </section>
      </main>
    </div>
  );
}
