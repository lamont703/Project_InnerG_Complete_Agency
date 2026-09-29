"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const PLANS = [["free", "Free"], ["manage", "Manage"], ["autopilot", "Autopilot"]] as const;

/** Set one member's plan by hand. Saves on change. */
export function PlanSelect({ memberId, plan }: { memberId: string; plan: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const save = async (next: string) => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId, plan: next }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      toast.success(`Plan set to ${next}.`);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Couldn't set the plan.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <select
      defaultValue={plan}
      disabled={busy}
      onChange={(e) => save(e.target.value)}
      aria-label="Plan"
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50"
    >
      {PLANS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
