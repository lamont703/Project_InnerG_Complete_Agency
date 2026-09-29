import { redirect } from "next/navigation";
import { Check, CreditCard } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { resolveMemberContext } from "@/lib/account/view-as";
import { getMemberPlan, publishesThisMonth } from "@/lib/member-plan";
import { FREE_PUBLISHES_PER_MONTH, PLAN_LABEL, PRICES, hasPaidPlans, planStatusLine, type Plan } from "@/lib/plans";
import { AUDIENCES } from "@/lib/audiences";
import { checkoutOpenFor, isTestMode, liveSubscription } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlanButton } from "@/components/account/plan-buttons";

/**
 * A member's plan: what they're on, what each plan includes at their account
 * type's price, and the way to buy, switch or cancel. Stripe runs the money;
 * this page only starts checkout or opens Stripe's billing page.
 */
export const dynamic = "force-dynamic";
export const metadata = { title: "Your plan | ShearQuery", robots: { index: false, follow: false } };

const INCLUDES: Record<Plan, string[]> = {
  free: ["Your listing and verified badge", "The full Google profile audit", "Claude drafts any fix to your profile", `${FREE_PUBLISHES_PER_MONTH} Google publishes a month`],
  manage: ["Everything in Free", "Unlimited Google publishing, from Claude or here", "The appointment book, run from Claude (when it opens)", "Instagram insights in Claude (when it opens)"],
  autopilot: ["Everything in Manage", "Things that run without you asking — replies to good reviews, a posting schedule, reminders and a weekly report (arriving over the coming months)"],
};

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) {
    if (ctx.status === 401) redirect("/login?redirect=/account/plan");
    return null;
  }
  const { checkout } = await searchParams;
  const [mp, used, live, { data: member }] = await Promise.all([
    getMemberPlan(ctx.memberId),
    publishesThisMonth(ctx.memberId),
    liveSubscription(ctx.memberId),
    (createAdminClient().from("community_members") as any).select("plan_source, stripe_customer_id").eq("id", ctx.memberId).maybeSingle(),
  ]);
  const type = mp.type;
  const paidPlans = hasPaidPlans(type);
  const canBuy = checkoutOpenFor(mp.email) && !ctx.impersonating;
  const byHand = member?.plan_source === "admin" && !live;

  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-4xl px-5 pt-28 pb-20 sm:px-6">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl"><CreditCard className="h-6 w-6" /> Your plan</h1>

        {checkout === "done" && (
          <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Payment received. Your plan updates here within a few seconds — refresh if it hasn&apos;t yet.</p>
        )}
        {checkout === "cancelled" && <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Checkout cancelled. Nothing was charged.</p>}
        {canBuy && isTestMode() && (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Stripe is in <strong>test mode</strong>: no real card is charged. Use Stripe&apos;s test card 4242 4242 4242 4242.</p>
        )}

        <section className="mt-6 rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-slate-500">Now</p>
          <p className="mt-1 text-lg font-bold">{paidPlans ? planStatusLine(mp.plan, used) : type ? `${AUDIENCES[type].label} accounts are always free.` : "Choose your account type to see plans."}</p>
          {live && (
            <p className="mt-1 text-sm text-slate-600">
              ${((live.amount_cents ?? 0) / 100).toFixed(0)}/month · {live.cancel_at_period_end ? "ends" : "renews"} {live.current_period_end ? new Date(live.current_period_end).toLocaleDateString() : "—"}
              {live.status === "past_due" ? " · the last payment didn't go through — update your card" : ""}
            </p>
          )}
          {byHand && <p className="mt-1 text-sm text-slate-600">Set by ShearQuery — nothing is billed.</p>}
          {live && canBuy && <div className="mt-4 max-w-xs"><PlanButton action="portal" label="Card, invoices and cancelling" /></div>}
        </section>

        {paidPlans && type && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {(["free", "manage", "autopilot"] as Plan[]).map((p) => {
              const price = p === "free" ? 0 : PRICES[type]![p as "manage" | "autopilot"];
              const current = mp.plan === p;
              return (
                <section key={p} className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${current ? "border-emerald-500" : "border-slate-200"}`}>
                  <p className="font-black">{PLAN_LABEL[p]}</p>
                  <p className="mt-1 text-2xl font-black">${price}<span className="text-sm font-bold text-slate-500">/month</span></p>
                  <ul className="mt-3 flex-1 space-y-1.5 text-sm text-slate-700">
                    {INCLUDES[p].map((i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{i}</li>)}
                  </ul>
                  <div className="mt-4">
                    {current ? (
                      <p className="text-center text-xs font-black uppercase text-emerald-700">Your plan</p>
                    ) : p === "free" ? (
                      live && canBuy ? <PlanButton action="portal" label="Cancel in billing" /> : null
                    ) : !canBuy ? (
                      <p className="text-center text-xs text-slate-500">Checkout opens soon</p>
                    ) : byHand ? null : live ? (
                      <PlanButton action="change" plan={p as "manage" | "autopilot"} label={`Switch to ${PLAN_LABEL[p]}`} primary />
                    ) : (
                      <PlanButton action="checkout" plan={p as "manage" | "autopilot"} label={`Choose ${PLAN_LABEL[p]}`} primary />
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <p className="mt-6 text-xs text-slate-500">
          Using ShearQuery inside Claude also needs your own Claude subscription, about $20 a month, paid to Anthropic. Plans are billed monthly by Stripe and can be cancelled any time; you keep the plan until the end of the month you paid for.
        </p>
      </main>
    </div>
  );
}
