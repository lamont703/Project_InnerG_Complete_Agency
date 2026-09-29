"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/** Choose an account type when none is set. It can't be changed afterwards from here, so it asks to confirm. */
export function AccountTypePicker({ options }: { options: { id: string; label: string; who: string }[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const chosen = options.find((o) => o.id === picked);
  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => setPicked(o.id)}
            className={`rounded-xl border p-3 text-left text-sm ${picked === o.id ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"}`}
          >
            <span className="font-bold">{o.label}</span>
            <span className="block text-xs text-slate-500">&ldquo;{o.who}&rdquo;</span>
          </button>
        ))}
      </div>
      {chosen && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="flex-1 text-sm text-slate-600">Set this account as <strong>{chosen.label}</strong>? You won&apos;t be able to change it yourself afterwards.</p>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const r = await fetch("/api/account/type", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: chosen.id }) });
              const j = await r.json().catch(() => ({}));
              setBusy(false);
              if (j.ok) { toast.success(`This is now a ${chosen.label} account.`); router.refresh(); }
              else toast.error(j.error || "Couldn't set the type.");
            }}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Yes, set it"}
          </button>
        </div>
      )}
    </div>
  );
}
