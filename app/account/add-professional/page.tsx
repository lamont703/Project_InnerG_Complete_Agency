"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { BadgeCheck, CheckCircle2, Scissors, Sparkles } from "lucide-react";

/**
 * A licensed barber or cosmetologist creating their own directory listing.
 *
 * Separate from /account/add-business because the two shapes genuinely differ: a
 * professional has a metro area and specialties, not a street address and a
 * business category. Address is optional here on purpose — plenty of barbers
 * rent a chair inside someone else's shop and have no address of their own.
 *
 * The submission is staged for review like every other listing, so this page
 * promises review rather than instant publication. And if their phone number is
 * already in the directory they're sent to claim that profile instead of
 * creating a second one.
 */

const TYPES = [
  { key: "barber", label: "Barber", hint: "Texas barber license — clippers, fades, beard work" },
  { key: "cosmetologist", label: "Cosmetologist / Stylist", hint: "Texas cosmetology license — cutting, colour, chemical services" },
];

const LICENSE_STATES = [
  "Licensed — active",
  "Licensed — recently passed state boards",
  "In school / completing hours",
  "Apprentice",
];

const inputCls =
  "w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 focus:ring-0 transition-all outline-none";

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
        {label} {required && <span className="text-indigo-600">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

export default function AddProfessionalListingPage() {
  const [form, setForm] = useState({
    entityType: "barber",
    name: "",
    phone: "",
    metroArea: "",
    address: "",
    email: "",
    website: "",
    specialty: "",
    licensureStatus: LICENSE_STATES[0],
    schoolName: "",
    instagram: "",
  });
  const [state, setState] = useState<"idle" | "sending" | "done" | "already">("idle");
  const [error, setError] = useState<string | null>(null);
  const [claim, setClaim] = useState<{ name: string; claimHref: string; href: string | null } | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setState("sending");
    try {
      const res = await fetch("/api/account/add-professional", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not submit your listing.");
      if (data.alreadyListed) {
        setClaim(data.claim);
        setState("already");
        return;
      }
      setState("done");
    } catch (err: any) {
      setError(err.message || "Could not submit your listing.");
      setState("idle");
    }
  };

  if (state === "already" && claim) {
    return (
      <main className="min-h-screen bg-slate-50 light">
        <Navbar />
        <div className="mx-auto max-w-xl px-6 pt-32 pb-20 text-center">
          <BadgeCheck className="mx-auto mb-4 h-10 w-10 text-emerald-600" />
          <h1 className="text-2xl font-black text-slate-900">You&apos;re already in the directory</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            We found a listing with your phone number — <strong>{claim.name}</strong>. Claim it instead of creating a
            second one, and it becomes yours to edit with the verified badge on it.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={claim.claimHref}
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-indigo-700"
            >
              Claim my listing
            </Link>
            {claim.href && (
              <Link
                href={claim.href}
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:border-indigo-300"
              >
                View the listing
              </Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (state === "done") {
    return (
      <main className="min-h-screen bg-slate-50 light">
        <Navbar />
        <div className="mx-auto max-w-xl px-6 pt-32 pb-20 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-600" />
          <h1 className="text-2xl font-black text-slate-900">Submitted for review</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            We review every listing before it goes live — usually within a couple of business days. Once it&apos;s
            published it&apos;s linked to your account automatically, with the verified badge, and you can use it when
            approaching shops and salons.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/compare-shops"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-indigo-700"
            >
              Compare shops meanwhile
            </Link>
            <Link
              href="/account/manage-listing"
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:border-indigo-300"
            >
              Back to my account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 light">
      <Navbar />
      <div className="mx-auto max-w-2xl px-6 pt-28 pb-20">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-700">
          <Sparkles className="h-3 w-3" />
          Free professional listing
        </span>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Create your professional listing</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
          This is the profile shops and salons look at when they have a chair to fill — your license, your specialties,
          and where you work. It&apos;s free, and it stays yours to edit.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <Field label="I am a" required>
            <div className="grid gap-3 sm:grid-cols-2">
              {TYPES.map((t) => (
                <button
                  type="button"
                  key={t.key}
                  onClick={() => set("entityType", t.key)}
                  className={`rounded-xl border-2 p-3 text-left transition-colors ${
                    form.entityType === t.key
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-100 bg-slate-50 hover:border-slate-200"
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                    <Scissors className="h-3.5 w-3.5 text-indigo-600" />
                    {t.label}
                  </span>
                  <span className="mt-1 block text-[11px] leading-snug text-slate-500">{t.hint}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Full name" required>
            <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" required hint="Used to check you're not already listed">
              <input required value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Metro area" required hint="e.g. Houston">
              <input required value={form.metroArea} onChange={(e) => set("metroArea", e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Shop address" hint="Optional — leave blank if you rent a chair or work mobile">
            <input value={form.address} onChange={(e) => set("address", e.target.value)} className={inputCls} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="License status" required>
              <select value={form.licensureStatus} onChange={(e) => set("licensureStatus", e.target.value)} className={inputCls}>
                {LICENSE_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="School" hint="Where you trained — optional">
              <input value={form.schoolName} onChange={(e) => set("schoolName", e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Specialties" hint="Comma separated — e.g. fades, beard work, colour, silk press">
            <input value={form.specialty} onChange={(e) => set("specialty", e.target.value)} className={inputCls} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" hint="Optional">
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Instagram" hint="Optional — handle without the @">
              <input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Website or booking link" hint="Optional">
            <input value={form.website} onChange={(e) => set("website", e.target.value)} className={inputCls} />
          </Field>

          {error && <p className="text-xs font-bold text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={state === "sending"}
            className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {state === "sending" ? "Submitting…" : "Submit my listing"}
          </button>
          <p className="text-center text-[11px] text-slate-400">
            Reviewed before it goes live, usually within a couple of business days.
          </p>
        </form>
      </div>
    </main>
  );
}
