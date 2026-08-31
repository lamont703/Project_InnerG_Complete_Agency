"use client";

import { useState, useTransition } from "react";
import { Check, Copy, KeyRound, Loader2, UserCheck } from "lucide-react";
import { issueClaimLinkAction } from "./actions";

/**
 * The student's way into their own account.
 *
 * SHOWS THE LINK, NOT A "SEND" BUTTON. There is no messaging wired to student
 * records yet, and a button that looked like it sent something while sending
 * nothing is worse than no button — the school would believe the student had
 * been contacted. Copying it and pasting it into a text is honest about where
 * the work is.
 */
export function PortalAccess({
  studentId,
  claimUrl,
  claimedAt,
}: {
  studentId: string;
  claimUrl: string | null;
  claimedAt: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState(claimUrl);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const issue = () => {
    setError(null);
    startTransition(async () => {
      const res = await issueClaimLinkAction(studentId);
      if (res.ok && res.token) setUrl(`${window.location.origin}/student?claim=${res.token}`);
      else setError(res.error ?? "Could not create a link.");
    });
  };

  const copy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (claimedAt) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="flex items-center gap-2 font-black text-emerald-900">
          <UserCheck className="h-4 w-4" />
          Student account is set up
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-emerald-800">
          They can see their own hours, their online headroom and their lessons. Linked{" "}
          {new Date(claimedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="flex items-center gap-2 font-black text-slate-900">
        <KeyRound className="h-4 w-4 text-slate-400" />
        Student account not set up yet
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
        Send this student their link and they can sign in to see their hours and work through the
        online lessons. Until they do, they can only clock in at the door.
      </p>

      {url ? (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
              {url}
            </code>
            <button
              onClick={copy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Anyone holding this link can claim the record, so send it to the student directly rather
            than to a group. Issuing a new one below cancels this one.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          This student was enrolled before student accounts existed, so they have no link yet.
        </p>
      )}

      {error && <p className="mt-3 text-sm font-bold text-rose-700">{error}</p>}

      <button
        onClick={issue}
        disabled={pending}
        className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {url ? "Issue a new link" : "Create their link"}
      </button>
    </section>
  );
}
