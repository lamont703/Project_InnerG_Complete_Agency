"use client";

import { useState } from "react";

/** The single deliberate click. Posts the token, never the raw address. */
export function UnsubscribeButton({ token, email }: { token: string; email: string }) {
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");

  if (state === "done") {
    return (
      <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
        Done — {email} has been removed. You won&apos;t hear from us again.
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={state === "working"}
        onClick={async () => {
          setState("working");
          try {
            const res = await fetch("/api/outreach/unsubscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            });
            setState(res.ok ? "done" : "error");
          } catch {
            setState("error");
          }
        }}
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
      >
        {state === "working" ? "Removing…" : "Confirm unsubscribe"}
      </button>
      {state === "error" && (
        <p className="mt-3 text-sm text-rose-600">
          That didn&apos;t go through. Reply to the email with &quot;unsubscribe&quot; and
          we&apos;ll do it by hand.
        </p>
      )}
    </>
  );
}
