"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

/** Set up (or refresh) an agency's demo shop. Refresh wipes and refills the demo — only the demo. */
export function AgencyDemoButton({ memberId, ready }: { memberId: string; ready: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/agencies/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      toast.success(`Demo ready: ${j.summary}.`);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Couldn't set up the demo.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button onClick={go} disabled={busy} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-black ${ready ? "border border-slate-300 bg-white text-slate-700" : "bg-slate-900 text-white"} disabled:opacity-50`}>
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {ready ? "Refresh demo" : "Set up demo"}
    </button>
  );
}
