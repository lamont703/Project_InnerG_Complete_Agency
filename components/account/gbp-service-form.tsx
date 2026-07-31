"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, Loader2, Plus, X } from "lucide-react";
import type { ServiceSelection, Category } from "@/lib/gbp-services";

/**
 * Service and category selection.
 *
 * Services are a fixed catalogue from Google, keyed to the listing's categories
 * — 32 for "Barber shop" — plus free-form entries for the things Google has no
 * id for, which is where locs, silk press and braiding belong.
 *
 * The screen shows the current state as already-selected rather than starting
 * blank, because the submitted value replaces the whole list. A blank start
 * would invite an owner to "select a few" and delete the rest.
 */
export function GbpServiceForm() {
  const [data, setData] = useState<{
    selection: ServiceSelection;
    primaryCategory: Category | null;
    additionalCategories: Category[];
  } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newServices, setNewServices] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const hydrate = (json: any) => {
    setData({
      selection: json.selection,
      primaryCategory: json.primaryCategory,
      additionalCategories: json.additionalCategories || [],
    });
    setSelected(new Set(json.selection.options.filter((o: any) => o.selected).map((o: any) => o.serviceTypeId)));
    setNewServices([]);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/account/gbp-services", { cache: "no-store" });
        const json = await res.json();
        if (!json.success) setError(json.error || "Could not load your services.");
        else hydrate(json);
      } catch { setError("Could not load your services."); }
      finally { setLoading(false); }
    })();
  }, []);

  const toggle = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const addDraft = () => {
    const v = draft.trim();
    if (!v) return;
    setNewServices((n) => (n.some((x) => x.toLowerCase() === v.toLowerCase()) ? n : [...n, v]));
    setDraft("");
  };

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/account/gbp-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedTypeIds: [...selected], newFreeForm: newServices }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.results?.services?.error || json.error || "Could not save."); return; }
      setSavedCount(json.results?.services?.count ?? null);
      hydrate(json);
    } catch { setError("Could not save."); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading your services…</p>;
  if (error && !data) return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-sm font-semibold text-amber-900">{error}</p>
      <Link href="/account/gbp-audit" className="mt-3 inline-block text-sm font-bold text-primary hover:underline">Back to my audit</Link>
    </div>
  );
  if (!data) return null;

  const { selection } = data;
  const totalAfter = selected.size + selection.freeForm.length + newServices.length;

  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-bold text-slate-900">
          {selection.offeredCount} listed now · {totalAfter} after saving
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Google offers {selection.availableCount} services for your categories
          {data.primaryCategory ? ` (${[data.primaryCategory, ...data.additionalCategories].map((c) => c.displayName).join(", ")})` : ""}.
          Anything Google has no name for — locs, silk press, braiding — goes in the box below.
        </p>
      </div>

      {savedCount !== null && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Saved. Your profile now lists {savedCount} service{savedCount === 1 ? "" : "s"}.
        </p>
      )}
      {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

      <section className="mt-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">From Google's list</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {selection.options.map((o) => {
            const on = selected.has(o.serviceTypeId);
            return (
              <button
                key={o.serviceTypeId}
                onClick={() => toggle(o.serviceTypeId)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  on ? "border-primary bg-primary text-primary-foreground" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {on && <Check className="h-3 w-3" />}
                {o.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Your own services</h2>
        {(selection.freeForm.length > 0 || newServices.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selection.freeForm.map((f) => (
              <span key={f} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                <Check className="h-3 w-3 text-emerald-600" /> {f}
              </span>
            ))}
            {newServices.map((f) => (
              <span key={f} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                {f}
                <button onClick={() => setNewServices((n) => n.filter((x) => x !== f))} aria-label={`Remove ${f}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDraft(); } }}
            placeholder="e.g. Locs retwist, Silk press, Kids' cut"
            aria-label="Add a service"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
          <button onClick={addDraft} disabled={!draft.trim()} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </section>

      <div className="sticky bottom-4 mt-6">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <p className="text-sm text-slate-600">{totalAfter} service{totalAfter === 1 ? "" : "s"} will be listed</p>
          <button onClick={save} disabled={saving} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save to Google
          </button>
        </div>
      </div>

      <p className="mt-8 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Saving replaces the service list on your profile with what&apos;s selected here, so anything
        you deselect is removed. We record the previous list before every change.
      </p>
      <p className="mt-4">
        <Link href="/account/gbp-audit" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
          Back to my audit <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </p>
    </div>
  );
}
