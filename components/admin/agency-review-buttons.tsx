"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/** Approve or reject an agency as a partner. Approval issues its referral code and emails it. */
export function AgencyReviewButtons({ memberId, status }: { memberId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const act = async (action: "approve" | "reject") => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/agencies/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId, action }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      toast.success(action === "approve" ? `Approved — code ${j.code}. They've been emailed.` : "Rejected.");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Couldn't update.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {status !== "approved" && (
        <button onClick={() => act("approve")} disabled={busy} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50">Approve</button>
      )}
      {status !== "rejected" && (
        <button onClick={() => act("reject")} disabled={busy} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 disabled:opacity-50">Reject</button>
      )}
    </>
  );
}
