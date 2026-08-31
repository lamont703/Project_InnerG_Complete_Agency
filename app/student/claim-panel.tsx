"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2 } from "lucide-react";
import { claimStudentAction } from "./actions";

/**
 * Linking a signed-in account to an enrollment.
 *
 * ACCEPTS THE WHOLE LINK, not just the token. People paste what they were sent,
 * and a field that rejects "https://…/student?claim=abc" for containing a URL
 * is a field that fails for everyone who did the obvious thing.
 */
export function ClaimPanel({ presetToken }: { presetToken: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(presetToken);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Pull the token out if they pasted the whole link.
    let token = value.trim();
    const match = token.match(/[?&]claim=([^&\s]+)/);
    if (match) token = decodeURIComponent(match[1]);

    startTransition(async () => {
      const res = await claimStudentAction(token);
      if (res.ok) router.push("/student?claimed=1");
      else setError(res.error ?? "That did not work.");
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <GraduationCap className="h-8 w-8 text-blue-600" />
      <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
        Link your enrollment
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        You&apos;re signed in, but this account isn&apos;t connected to a student record yet. Paste
        the link your school sent you and it will be.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          autoFocus={!presetToken}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste your link here"
          className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
        />
        {error && <p className="text-sm font-bold text-rose-700">{error}</p>}
        <button
          type="submit"
          disabled={pending || !value.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Link my enrollment
        </button>
      </form>

      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        Don&apos;t have a link? Ask your school&mdash;they can send you a new one. Your four-digit
        clock code is for the screen at the door and won&apos;t work here.
      </p>
    </div>
  );
}
