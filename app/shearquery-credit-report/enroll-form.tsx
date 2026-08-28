"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { enrollShopAction } from "./actions";

const DUE_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const FIELD =
  "w-full rounded-xl border-2 border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-500";
const LABEL = "text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1";

export function EnrollForm({ signedIn }: { signedIn: boolean }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [smsPhone, setSmsPhone] = useState("");
  const [shopLicenseNumber, setShopLicenseNumber] = useState("");
  const [dueDay, setDueDay] = useState("Monday");
  const [consented, setConsented] = useState(false);

  if (!signedIn) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-black text-slate-900">Create a free account first</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Reporting means putting your name to statements about other people&apos;s payments, so the
          shop behind them has to be someone we can reach. The account is free and takes about a
          minute — come back here afterwards and the form below will be waiting.
        </p>
        <Link
          href="/membership/owners?src=credit-report"
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-blue-700"
        >
          Create my free account
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <h3 className="text-lg font-black text-emerald-900">You&apos;re enrolled.</h3>
            <p className="mt-2 text-sm leading-relaxed text-emerald-800">
              Your first check-in text goes out in two weeks. Before then, add the people renting
              chairs from you — the record starts from the week you add them, so there is nothing to
              backfill unless you want to.
            </p>
            <Link
              href="/account/credit-reporting"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-emerald-800"
            >
              Set up my roster
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await enrollShopAction({
        shopName,
        address,
        email,
        smsPhone,
        shopLicenseNumber,
        dueDay,
        consented,
      });
      if (res.ok) setDone(true);
      else setError(res.error ?? "Something went wrong.");
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-1.5">
        <label htmlFor="cr-shop" className={LABEL}>Shop name</label>
        <input id="cr-shop" required value={shopName} onChange={(e) => setShopName(e.target.value)} className={FIELD} placeholder="Northside Barber Co." />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cr-address" className={LABEL}>Shop address</label>
        <input id="cr-address" required value={address} onChange={(e) => setAddress(e.target.value)} className={FIELD} placeholder="1420 W 19th St, Houston, TX 77008" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="cr-email" className={LABEL}>Email</label>
          <input id="cr-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} placeholder="you@shop.com" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cr-sms" className={LABEL}>SMS number for check-ins</label>
          <input id="cr-sms" type="tel" required value={smsPhone} onChange={(e) => setSmsPhone(e.target.value)} className={FIELD} placeholder="(713) 555-0142" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="cr-licence" className={LABEL}>Shop licence number</label>
          <input id="cr-licence" required value={shopLicenseNumber} onChange={(e) => setShopLicenseNumber(e.target.value)} className={FIELD} placeholder="Establishment licence" />
          {/* The shop licence, not an operator licence. TDLR issues them
              separately and the numbers are not interchangeable. */}
          <p className="ml-1 text-[11px] leading-relaxed text-slate-500">
            The establishment licence for the shop itself — not your personal barber licence.
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cr-due" className={LABEL}>Rent is due on</label>
          <select id="cr-due" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className={FIELD}>
            {DUE_DAYS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <p className="ml-1 text-[11px] leading-relaxed text-slate-500">
            Late is measured from this day, so it decides what counts as late.
          </p>
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => setConsented(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-xs leading-relaxed text-slate-600">
          Text this number every two weeks to confirm who paid. Reply STOP any time and the messages
          end — your record stays, we just stop asking.
        </span>
      </label>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? (<><Loader2 className="h-4 w-4 animate-spin" /> Enrolling…</>) : "Enrol my shop"}
      </button>
      <p className="text-center text-[11px] text-slate-500">Free. No card.</p>
    </form>
  );
}
