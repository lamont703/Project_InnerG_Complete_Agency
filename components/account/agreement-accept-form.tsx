"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/** Accept the partner agreement: a typed name and an explicit tick. */
export function AgreementAcceptForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await fetch("/api/account/agency/agreement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, agree }) });
        const j = await r.json().catch(() => ({}));
        setBusy(false);
        if (j.ok) { toast.success("Thanks — you've accepted the partner agreement."); router.refresh(); }
        else toast.error(j.error || "Couldn't record that.");
      }}
      className="space-y-3"
    >
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-4 w-4" />
        <span>I have read this agreement and agree to it on behalf of my agency.</span>
      </label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" aria-label="Your full name" className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm" />
      <button disabled={busy || !agree || name.trim().length < 2} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">
        {busy ? "Saving…" : "I agree"}
      </button>
    </form>
  );
}
