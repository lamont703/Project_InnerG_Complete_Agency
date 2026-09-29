"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

/** Invite one client by email. The invite link credits the agency when they join. */
export function AgencyInviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [business, setBusiness] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/account/agency/invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, business_name: business }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      toast.success(`Invite sent to ${email}.`);
      setEmail(""); setBusiness("");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Couldn't send the invite.");
    } finally {
      setBusy(false);
    }
  };

  const field = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm";
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <input value={business} onChange={(e) => setBusiness(e.target.value)} maxLength={120} placeholder="Business name (optional)" className={field} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="owner@theirshop.com" className={field} />
      <button onClick={send} disabled={busy || !email.includes("@")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white disabled:opacity-40">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Invite
      </button>
    </div>
  );
}
