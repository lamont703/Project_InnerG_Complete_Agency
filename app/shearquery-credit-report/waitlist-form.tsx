"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { joinReportingWaitlistAction } from "./actions";

/**
 * Ask to be told when reporting reaches the bureaus.
 *
 * NO ACCOUNT REQUIRED, unlike enrollment. Enrolling means making written
 * statements about named people and has to be attributable; asking a question
 * about something that does not exist yet is not a claim about anybody, and a
 * signup wall in front of a question costs answers and protects nothing.
 */
const BUREAUS = [
  { key: "experian", label: "Experian" },
  { key: "equifax", label: "Equifax" },
  { key: "transunion", label: "TransUnion" },
  { key: "dnb", label: "Dun & Bradstreet" },
] as const;

export function WaitlistForm() {
  const [picked, setPicked] = useState<string[]>(BUREAUS.map((b) => b.key));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div className="text-sm text-emerald-900">
          <p className="font-black">You&apos;re on the list.</p>
          <p className="mt-1">
            We&apos;ll write when bureau reporting is licensed and open — not before, and with no
            date promised. Meanwhile you can enroll above and start building the record inside
            ShearQuery today, free.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const f = new FormData(e.currentTarget as HTMLFormElement);
        const res = await joinReportingWaitlistAction({
          shopName: String(f.get("shopName") || ""),
          contactName: String(f.get("contactName") || ""),
          email: String(f.get("email") || ""),
          phone: String(f.get("phone") || ""),
          city: String(f.get("city") || ""),
          chairCount: Number(f.get("chairCount")) || null,
          bureaus: picked,
          notes: String(f.get("notes") || ""),
        });
        setBusy(false);
        if (res.ok) setDone(true);
        else setError(res.error ?? "Something went wrong.");
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="shopName" label="Shop or salon name" required />
        <Field name="contactName" label="Your name" />
        <Field name="email" label="Email" type="email" required />
        <Field name="phone" label="Mobile" type="tel" />
        <Field name="city" label="City" />
        <Field name="chairCount" label="How many chairs?" type="number" />
      </div>

      <fieldset>
        <legend className="text-xs font-black uppercase tracking-wide text-slate-500">
          Which would you want to report to?
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {BUREAUS.map((b) => {
            const on = picked.includes(b.key);
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => setPicked((p) => (on ? p.filter((k) => k !== b.key) : [...p, b.key]))}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  on
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-500 hover:border-slate-400"
                }`}
              >
                {b.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500">
          Anything else? (optional)
        </span>
        <textarea
          name="notes"
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
        />
      </label>

      {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Join the bureau reporting waitlist
      </button>
      <p className="text-[11px] leading-relaxed text-slate-500">
        This is a waitlist, not a signup. Bureau reporting does not exist yet and we are not
        promising a date. Enrolling in ShearQuery reporting above is separate, live, and free.
      </p>
    </form>
  );
}

function Field({
  name, label, type = "text", required,
}: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
      />
    </label>
  );
}
