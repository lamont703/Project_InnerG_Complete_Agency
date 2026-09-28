"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/** Two taps, like every other disconnect on the account pages. */
export function DisconnectInstagramButton() {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (!armed) return setArmed(true);
    setBusy(true);
    try {
      const res = await fetch("/api/instagram/member/disconnect", { method: "POST" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      toast.success("Instagram disconnected. Claude can no longer read it.");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Could not disconnect.");
    } finally {
      setBusy(false);
      setArmed(false);
    }
  };

  return (
    <button
      onClick={go}
      disabled={busy}
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
    >
      {armed ? "Confirm disconnect" : "Disconnect"}
    </button>
  );
}
