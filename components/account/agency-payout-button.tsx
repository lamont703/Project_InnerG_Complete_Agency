"use client";

import { useState } from "react";
import { toast } from "sonner";

/** Opens Stripe: onboarding to set up payouts, or the Express dashboard once set up. */
export function AgencyPayoutButton({ action, label, primary }: { action: "setup" | "dashboard"; label: string; primary?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await fetch("/api/account/agency/payouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
          const j = await r.json();
          if (!j.ok) throw new Error(j.error);
          window.location.href = j.url;
        } catch (e: any) {
          toast.error(e.message || "Couldn't open Stripe.");
          setBusy(false);
        }
      }}
      className={`rounded-xl px-4 py-2 text-sm font-black disabled:opacity-50 ${primary ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-900"}`}
    >
      {busy ? "Opening Stripe…" : label}
    </button>
  );
}
