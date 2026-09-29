"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

async function post(path: string, body?: unknown) {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(j.error || "Something went wrong.");
  return j;
}

/** Start a Stripe Checkout, switch plans, or open Stripe's billing page. */
export function PlanButton({ action, plan, label, primary }: { action: "checkout" | "change" | "portal"; plan?: "manage" | "autopilot"; label: string; primary?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      if (action === "checkout") window.location.href = (await post("/api/billing/checkout", { plan })).url;
      else if (action === "portal") window.location.href = (await post("/api/billing/portal")).url;
      else {
        await post("/api/billing/change-plan", { plan });
        toast.success("Plan changed. The difference is prorated on your next bill.");
        router.refresh();
        setBusy(false);
      }
    } catch (e: any) {
      toast.error(e.message);
      setBusy(false);
    }
  };
  return (
    <button
      onClick={go}
      disabled={busy}
      className={`w-full rounded-xl px-4 py-2.5 text-sm font-black disabled:opacity-50 ${primary ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-900"}`}
    >
      {busy ? "One moment…" : label}
    </button>
  );
}
