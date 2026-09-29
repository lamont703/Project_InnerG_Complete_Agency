"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AgencyProfile } from "@/lib/agency";

export function AgencyProfileForm({ initial }: { initial: AgencyProfile | null }) {
  const router = useRouter();
  const [f, setF] = useState({
    agency_name: initial?.agency_name ?? "",
    website: initial?.website ?? "",
    what_they_build: initial?.what_they_build ?? "",
    client_count: initial?.client_count?.toString() ?? "",
    markets: initial?.markets ?? "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/account/agency", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      toast.success(initial ? "Saved." : "Thanks — we'll set up your demo shop.");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };

  const field = "mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm";
  const label = "block text-xs font-black uppercase tracking-wide text-slate-500";
  return (
    <div className="space-y-4">
      <label className={label}>Agency name<input value={f.agency_name} onChange={set("agency_name")} maxLength={120} className={field} /></label>
      <label className={label}>Website<input value={f.website} onChange={set("website")} maxLength={200} className={field} placeholder="youragency.com" /></label>
      <label className={label}>What you build for barbers and stylists
        <textarea value={f.what_they_build} onChange={set("what_they_build")} maxLength={1000} rows={3} className={field} placeholder="AI receptionists, booking automations, Google and Instagram marketing…" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>Clients in the trade now<input value={f.client_count} onChange={set("client_count")} inputMode="numeric" className={field} placeholder="e.g. 12" /></label>
        <label className={label}>Cities or states<input value={f.markets} onChange={set("markets")} maxLength={300} className={field} placeholder="Houston, Dallas" /></label>
      </div>
      <button onClick={save} disabled={busy || !f.agency_name.trim()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white disabled:opacity-40">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} {initial ? "Save" : "Send"}
      </button>
    </div>
  );
}
