"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

async function post(body: unknown) {
  const r = await fetch("/api/admin/payouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(j.error || "Something went wrong.");
  return j;
}

/** Record that an agency's ready balance has been paid — after sending the money, not before. */
export function MarkPaidButton({ agencyMemberId, amount }: { agencyMemberId: string; amount: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="How it was paid (optional)" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const j = await post({ action: "paid", agencyMemberId, note });
            toast.success(`Recorded a payout of $${(j.amountCents / 100).toFixed(2)}.`);
            router.refresh();
          } catch (e: any) {
            toast.error(e.message);
          } finally {
            setBusy(false);
          }
        }}
        className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
      >
        I&apos;ve paid {amount}
      </button>
    </div>
  );
}

export function ResyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const j = await post({ action: "resync" });
          toast.success(`Ledger checked: ${j.accrued} added, ${j.updated} updated.`);
          router.refresh();
        } catch (e: any) {
          toast.error(e.message);
        } finally {
          setBusy(false);
        }
      }}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black disabled:opacity-50"
    >
      Re-check every payment
    </button>
  );
}

/** Send the ready balance to the agency's Stripe account as one transfer. */
export function PayViaStripeButton({ agencyMemberId, amount }: { agencyMemberId: string; amount: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const j = await post({ action: "stripe", agencyMemberId });
          toast.success(`Sent $${(j.amountCents / 100).toFixed(2)} through Stripe.`);
          router.refresh();
        } catch (e: any) {
          toast.error(e.message);
        } finally {
          setBusy(false);
        }
      }}
      className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
    >
      {busy ? "Sending…" : `Pay ${amount} through Stripe`}
    </button>
  );
}
