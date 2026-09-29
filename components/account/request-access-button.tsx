"use client";

import { useState } from "react";
import { toast } from "sonner";

/** Ask a client, by email, to share their account health with the agency. */
export function RequestAccessButton({ clientMemberId }: { clientMemberId: string }) {
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  if (state === "sent") return <span className="text-slate-500">Asked</span>;
  return (
    <button
      disabled={state === "busy"}
      onClick={async () => {
        setState("busy");
        const r = await fetch("/api/account/agency/request-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientMemberId }) });
        const j = await r.json().catch(() => ({}));
        if (j.ok) { toast.success("Request sent. The support view opens once they switch it on."); setState("sent"); }
        else { toast.error(j.error || "Couldn't send the request."); setState("idle"); }
      }}
      className="font-bold text-slate-700 underline disabled:opacity-50"
    >
      Ask
    </button>
  );
}
