"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/** The owner's switch for their agency's read-only access. */
export function AgencyAccessToggle({ on, agency }: { on: boolean; agency: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const set = async (next: boolean) => {
    setBusy(true);
    try {
      const r = await fetch("/api/account/agency-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ on: next }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      toast.success(next ? `${agency} can now see your account status.` : `${agency} can no longer see your account.`);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Couldn't save that.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      disabled={busy}
      onClick={() => set(!on)}
      className={`rounded-xl px-4 py-2.5 text-sm font-black disabled:opacity-50 ${on ? "border border-slate-200 bg-white text-slate-900" : "bg-slate-900 text-white"}`}
    >
      {on ? `Stop sharing with ${agency}` : `Let ${agency} see my account`}
    </button>
  );
}
