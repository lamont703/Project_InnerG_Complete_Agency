"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { claimInviteAction } from "./actions";

/**
 * Claiming an invited record.
 *
 * A BUTTON, NOT AN AUTOMATIC CLAIM ON PAGE LOAD. Following a link is not the
 * same as agreeing to take ownership of a record about yourself, and a claim
 * that fires on GET would also be triggered by any link preview or prefetch
 * that touches the URL. One deliberate tap, from the person the record is about.
 */
export function ClaimBanner({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div className="flex-1">
          <p className="font-black text-emerald-900">A shop has a payment record under your name.</p>
          <p className="mt-1 text-sm leading-relaxed text-emerald-800">
            Claim it and it becomes yours: the shop can keep reporting weeks, but from then on you
            are the only person who can show it to anybody.
          </p>
          {error && <p className="mt-2 text-sm font-bold text-rose-700">{error}</p>}
          <button
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const res = await claimInviteAction(token);
                if (res.ok) router.replace("/account/credit-report");
                else setError(res.error ?? "Could not claim that record.");
              })
            }
            disabled={pending}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Claim my record
          </button>
        </div>
      </div>
    </div>
  );
}
