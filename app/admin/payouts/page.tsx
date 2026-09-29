import { notFound } from "next/navigation";
import { Wallet } from "lucide-react";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { payoutQueue } from "@/lib/commissions";
import { COMMISSION_TERMS, dollars } from "@/lib/commission-rules";
import { MarkPaidButton, PayViaStripeButton, ResyncButton } from "@/components/admin/payout-buttons";

/**
 * Agency payouts, made by hand: what each agency is owed, and a button to
 * record a payout once the money has been sent. The ledger is written by the
 * Stripe webhook (lib/commissions.ts); nothing here moves money.
 */
export const dynamic = "force-dynamic";
export const metadata = { title: "Payouts | Admin", robots: { index: false, follow: false } };

export default async function PayoutsAdminPage() {
  if (!(await isAdmin())) notFound();
  const rows = await payoutQueue();
  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-4xl px-5 pt-28 pb-20 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-black"><Wallet className="h-6 w-6" /> Agency payouts</h1>
          <ResyncButton />
        </div>
        <p className="mt-2 text-sm text-slate-600">{COMMISSION_TERMS}</p>
        <p className="mt-2 text-sm text-slate-600">
          Agencies set up with Stripe are paid with one click. For the rest, send the money by hand first, then record it here. A payout covers everything past the refund window, minus anything a later refund took back.
        </p>
        {rows.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500">No agency has earned anything yet.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {rows.map((r) => (
              <section key={r.agencyMemberId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black">{r.name}</p>
                    <p className="text-xs text-slate-500">{r.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black">{dollars(r.readyCents)}</p>
                    <p className="text-xs text-slate-500">ready</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {dollars(r.pendingCents)} in the refund window · {dollars(r.paidCents)} paid to date · {dollars(r.earnedCents)} earned in all
                </p>
                <div className="mt-3">
                  {!r.canPayOut ? (
                    <p className="text-xs text-slate-500">Below the payout minimum.</p>
                  ) : r.stripeReady ? (
                    <PayViaStripeButton agencyMemberId={r.agencyMemberId} amount={dollars(r.readyCents)} />
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">{r.stripeConnected ? "Their Stripe payout setup isn't finished — pay by hand, or wait for them to finish." : "They haven't set up Stripe payouts — pay by hand, then record it."}</p>
                      <MarkPaidButton agencyMemberId={r.agencyMemberId} amount={dollars(r.readyCents)} />
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
