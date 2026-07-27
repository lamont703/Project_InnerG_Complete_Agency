"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Store, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { createBrowserClient } from "@/lib/supabase/browser";

// Door 3: an owner whose business was never scraped adds it themselves. Only
// business fields — the person (name/email/phone) already came from membership.
// Submits to /api/account/add-business, which stages it for review; on approval
// it publishes and auto-links to this member.
const BUSINESS_TYPES = [
  { key: "shop", label: "Barbershop" },
  { key: "salon", label: "Salon" },
  { key: "barber_school", label: "Barber School" },
  { key: "cosmetology_school", label: "Cosmetology School" },
  { key: "barber_supply_store", label: "Barber Supply Store" },
  { key: "beauty_supply_store", label: "Beauty Supply Store" },
];

const inputCls =
  "w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 focus:ring-0 transition-all outline-none";

export default function AddBusinessPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    entityType: "shop",
    name: "",
    street: "",
    city: "",
    state: "TX",
    zip: "",
    phone: "",
    website: "",
  });

  useEffect(() => {
    createBrowserClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (!user) router.push("/login?redirect=/account/add-business");
        else setAuthChecked(true);
      });
  }, [router]);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/add-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Submission failed.");
      setDone(true);
      if (data.alreadySubmitted) toast.info("This business was already submitted — it's in review.");
      else toast.success("Business submitted for review.");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />
      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/account/manage-listing" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to my listing
          </Link>

          {!authChecked ? (
            <div className="flex items-center justify-center py-24 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading…
            </div>
          ) : done ? (
            <div className="bg-white border border-emerald-200 rounded-2xl shadow-sm p-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-4" />
              <h1 className="text-lg font-black text-slate-900 mb-2">Submitted for review</h1>
              <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                Thanks! We&apos;ll review <span className="font-bold text-slate-700">{form.name}</span> and publish it
                shortly. Once it&apos;s live, it&apos;s automatically linked to your account so you can manage it.
              </p>
              <Link href="/account/manage-listing" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white font-bold text-sm px-5 py-2.5 hover:bg-indigo-700 transition-colors">
                Back to my listing
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-3">
                  <Store className="w-3 h-3" />
                  Add your business
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Not in our directory yet?</h1>
                <p className="text-sm text-slate-500 mt-1 max-w-lg">
                  Add your business and we&apos;ll review it, publish it, and link it to your account. Already on Google?{" "}
                  <Link href="/account/manage-listing" className="font-bold text-indigo-600 hover:underline">Connect your Google Business Profile</Link>{" "}
                  instead — it&apos;s instant.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-5">
                <Field label="Business Type" required>
                  <select value={form.entityType} onChange={(e) => set("entityType", e.target.value)} className={inputCls}>
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Business Name" required>
                  <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
                </Field>

                <Field label="Street Address" required>
                  <input required value={form.street} onChange={(e) => set("street", e.target.value)} className={inputCls} />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-4">
                  <Field label="City" required>
                    <input required value={form.city} onChange={(e) => set("city", e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="State" required>
                    <input required maxLength={2} value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
                  </Field>
                  <Field label="Zip">
                    <input inputMode="numeric" maxLength={5} value={form.zip} onChange={(e) => set("zip", e.target.value.replace(/\D/g, ""))} className={inputCls} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Phone" required>
                    <input required type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Website">
                    <input placeholder="yourshop.com" value={form.website} onChange={(e) => set("website", e.target.value)} className={inputCls} />
                  </Field>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-3 text-sm font-black uppercase tracking-[0.15em] rounded-xl transition-all shadow-lg"
                >
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit for review"}
                </button>
                <p className="text-[11px] text-slate-400 text-center">
                  We review submissions before publishing to keep the directory accurate.
                </p>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
