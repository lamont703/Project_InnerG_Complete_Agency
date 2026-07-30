"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ImagePlus, Loader2, Save, Scissors, ShieldCheck, X } from "lucide-react";

/**
 * Self-edit form for a claimed barber or cosmetologist profile.
 *
 * Rendered inside /account/manage-listing when the member's claim is a person
 * rather than a storefront. Kept as its own component because almost nothing is
 * shared with the business form — different fields, different required set, and
 * no address composition or geocoding.
 *
 * Phone is shown but not editable: it's the UNIQUE key both professional tables
 * dedupe on, so changing it here could collide with another professional's
 * record or quietly defeat the duplicate check that keeps one person from having
 * two profiles. The form says why rather than presenting a disabled box with no
 * explanation.
 */

interface ProfessionalListing {
  entityType: "barber" | "cosmetologist";
  id: string;
  slug: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  address: string | null;
  metro_area: string | null;
  specialty_type: string | null;
  licensure_status: string | null;
  school_name: string | null;
  instagram_handle: string | null;
  desired_pay_structure: string | null;
  is_actively_looking: boolean | null;
  portfolio_images: string[] | null;
}

const MAX_PHOTOS = 6;

const LICENSE_STATES = [
  "Licensed — active",
  "Licensed — recently passed state boards",
  "In school / completing hours",
  "Apprentice",
];

const PAY_STRUCTURES = ["No preference", "Hourly or salaried", "Commission", "Chair or booth rental", "Suite rental"];

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

export function ProfessionalListingForm({ onNotFound }: { onNotFound?: () => void }) {
  const [listing, setListing] = useState<ProfessionalListing | null>(null);
  const [form, setForm] = useState<Partial<ProfessionalListing>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Which slot a picked file replaces — null means append.
  const targetSlot = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/account/my-professional-listing", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setListing(d.data);
          setForm(d.data);
          setPhotos(Array.isArray(d.data.portfolio_images) ? d.data.portfolio_images : []);
        } else {
          onNotFound?.();
        }
      })
      .catch(() => onNotFound?.())
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: keyof ProfessionalListing, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const pickPhoto = (slot: number | null) => {
    targetSlot.current = slot;
    fileRef.current?.click();
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked later
    if (!file) return;
    const slot = targetSlot.current;
    setBusySlot(slot ?? photos.length);
    try {
      const body = new FormData();
      body.append("file", file);
      if (slot != null) body.append("slotIndex", String(slot));
      const res = await fetch("/api/account/my-professional-listing/images", {
        method: "POST",
        body,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Upload failed.");
      setPhotos(data.data.images);
      toast.success("Photo added.");
    } catch (err: any) {
      toast.error(err.message || "Upload failed.");
    } finally {
      setBusySlot(null);
      targetSlot.current = null;
    }
  };

  const removePhoto = async (index: number) => {
    setBusySlot(index);
    try {
      const res = await fetch("/api/account/my-professional-listing/images", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Couldn't remove that photo.");
      setPhotos(data.data.images);
      toast.success("Photo removed.");
    } catch (err: any) {
      toast.error(err.message || "Couldn't remove that photo.");
    } finally {
      setBusySlot(null);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/account/my-professional-listing", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Couldn't save your changes.");
      setListing(data.data);
      setForm(data.data);
      toast.success("Profile updated.");
    } catch (err: any) {
      toast.error(err.message || "Couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your profile…
      </div>
    );
  }
  if (!listing) return null;

  const label = listing.entityType === "barber" ? "Barber" : "Cosmetologist";
  const route = listing.entityType === "barber" ? "/barbers" : "/cosmetologists";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
          <ShieldCheck className="h-3 w-3" />
          Claimed {label}
        </span>
        {listing.slug && (
          <Link href={`${route}/${listing.slug}`} className="text-xs font-bold text-indigo-600 hover:underline">
            View your public profile →
          </Link>
        )}
      </div>

      <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Manage your profile</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
        This is what shops and salons see when they&apos;re filling a chair. Keep your license status and specialties
        current — those are the two things owners filter on.
      </p>

      <form onSubmit={save} className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Field label="Full name" required>
          <input required value={form.name || ""} onChange={(e) => set("name", e.target.value)} className={inputCls} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Metro area" required hint="Where you want to work — e.g. Houston">
            <input required value={form.metro_area || ""} onChange={(e) => set("metro_area", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Phone" hint="Contact us to change this — it's how we keep duplicate profiles out">
            <input value={listing.phone || ""} disabled className={`${inputCls} cursor-not-allowed opacity-60`} />
          </Field>
        </div>

        <Field label="Shop address" hint="Optional — leave blank if you rent a chair or work mobile">
          <input value={form.address || ""} onChange={(e) => set("address", e.target.value)} className={inputCls} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="License status">
            <select value={form.licensure_status || ""} onChange={(e) => set("licensure_status", e.target.value)} className={inputCls}>
              <option value="">Not specified</option>
              {LICENSE_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="School" hint="Where you trained">
            <input value={form.school_name || ""} onChange={(e) => set("school_name", e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="Specialties" hint="Comma separated — e.g. fades, beard work, colour, silk press">
          <input value={form.specialty_type || ""} onChange={(e) => set("specialty_type", e.target.value)} className={inputCls} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email">
            <input type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Instagram" hint="Handle without the @">
            <input value={form.instagram_handle || ""} onChange={(e) => set("instagram_handle", e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="Website or booking link">
          <input value={form.website_url || ""} onChange={(e) => set("website_url", e.target.value)} className={inputCls} />
        </Field>

        {/* The two fields that make this profile useful for matching rather than
            just a listing — what they want, and whether they're open to it. */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-indigo-700">
            <Scissors className="h-3 w-3" /> Placement preferences
          </p>
          <Field label="Preferred pay structure" hint="Shops see this before they reach out">
            <select
              value={form.desired_pay_structure || ""}
              onChange={(e) => set("desired_pay_structure", e.target.value)}
              className={inputCls}
            >
              <option value="">Not specified</option>
              {PAY_STRUCTURES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Field>
          <label className="mt-4 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={!!form.is_actively_looking}
              onChange={(e) => set("is_actively_looking", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
            />
            <span className="text-sm text-slate-700">
              <strong className="font-bold">I&apos;m open to a new chair right now.</strong>{" "}
              <span className="text-slate-500">
                We surface open-to-work professionals first when a shop tells us they&apos;re hiring.
              </span>
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving…" : "Save changes"}
          </button>
          <Link href="/compare-shops" className="text-xs font-bold text-indigo-600 hover:underline">
            Compare shops hiring near you →
          </Link>
        </div>
      </form>

      {/* Portfolio. Sits after the form rather than inside it because each
          upload saves immediately — there's no "unsaved photo" state to lose,
          and it would be confusing for Save to appear to govern them. */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-black text-slate-900">Your work</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Up to {MAX_PHOTOS} photos, shown first on your public profile — ahead of anything we found elsewhere. Owners
          filling a chair look at these before they read anything else. Each photo saves as soon as you add it.
        </p>

        <input ref={fileRef} type="file" accept="image/*" onChange={uploadPhoto} className="hidden" />

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: MAX_PHOTOS }).map((_, i) => {
            const url = photos[i];
            const busy = busySlot === i;
            return (
              <div
                key={i}
                className="relative aspect-square overflow-hidden rounded-xl border-2 border-slate-100 bg-slate-50"
              >
                {url ? (
                  <>
                    {/* Supabase-hosted and already sized by the uploader, so a
                        plain img avoids routing every portfolio shot through the
                        image optimizer. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Portfolio photo ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      disabled={busy}
                      aria-label={`Remove photo ${i + 1}`}
                      className="absolute right-1.5 top-1.5 rounded-lg bg-white/90 p-1 text-slate-600 shadow-sm transition-colors hover:text-red-600 disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => pickPhoto(i)}
                      disabled={busy}
                      className="absolute inset-x-1.5 bottom-1.5 rounded-lg bg-white/90 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-sm hover:text-indigo-600 disabled:opacity-50"
                    >
                      Replace
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => pickPhoto(null)}
                    disabled={busy || photos.length >= MAX_PHOTOS}
                    className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-slate-400 transition-colors hover:text-indigo-600 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {busy ? "Uploading" : "Add photo"}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
