"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Cancel from the texted link. Two taps: a client-side slip should not cancel a haircut. */
export function CancelAppointmentButton({ token }: { token: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    if (!armed) return setArmed(true);
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/calendar/public/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Couldn't cancel.");
      setArmed(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button onClick={go} disabled={busy} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 hover:bg-red-100 disabled:opacity-50">
        {armed ? "Yes, cancel it" : "Cancel appointment"}
      </button>
      {error && <p className="mt-2 text-sm font-semibold text-rose-700">{error}</p>}
    </div>
  );
}
