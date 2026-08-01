"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, Info, Loader2, Lock, Plus, Search, X } from "lucide-react";
import { SUGGESTED_SEARCHES, type CategorySearchResult, type CategoryAdvice } from "@/lib/gbp-categories";
import type { Category } from "@/lib/gbp-services";

/**
 * The category picker.
 *
 * Google's category is a claim about what a business IS. The screen is built to
 * make adding deliberate rather than easy: the primary category is shown but
 * locked, results are ranked so the right answer is at the top instead of buried
 * in noise, and anything already on the listing that doesn't fit the trade is
 * questioned rather than left sitting there.
 */
export function GbpCategoryForm() {
  const [primary, setPrimary] = useState<Category | null>(null);
  const [additional, setAdditional] = useState<Category[]>([]);
  const [advice, setAdvice] = useState<CategoryAdvice[]>([]);
  const [remaining, setRemaining] = useState(9);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CategorySearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const hydrate = (json: any) => {
    setPrimary(json.primaryCategory);
    setAdditional(json.additionalCategories || []);
    setAdvice(json.advice || []);
    setRemaining(json.remaining ?? 9);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/account/gbp-categories", { cache: "no-store" });
        const json = await res.json();
        if (!json.success) setError(json.error || "Could not load your categories.");
        else hydrate(json);
      } catch { setError("Could not load your categories."); }
      finally { setLoading(false); }
    })();
  }, []);

  const search = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults(null); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/account/gbp-categories?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const json = await res.json();
      setResults(json.success ? json.results : []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  const change = async (payload: Record<string, unknown>, message: string) => {
    setBusy(true); setError(null); setDone(null);
    try {
      const res = await fetch("/api/account/gbp-categories", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error || "That didn't work."); return; }
      hydrate(json);
      setResults(null); setQuery("");
      setDone(json.dropped?.length ? `${message} ${json.dropped.length} didn't fit under Google's limit of 9.` : message);
    } catch { setError("That didn't work."); }
    finally { setBusy(false); }
  };

  if (loading) return <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Reading your categories…</p>;
  if (error && !primary) return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-sm font-semibold text-amber-900">{error}</p>
      <Link href="/account/gbp-audit" className="mt-3 inline-block text-sm font-bold text-primary hover:underline">Back to my audit</Link>
    </div>
  );

  const alreadyHave = new Set([primary?.name, ...additional.map((c) => c.name)].filter(Boolean));

  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <Lock className="h-3 w-3" /> Main category
        </p>
        <p className="mt-1 text-lg font-black text-slate-900">{primary?.displayName || "Not set"}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
          This one isn&apos;t changed here. It&apos;s the single biggest signal on your listing, and
          changing it is a decision to make deliberately in Google rather than in passing.
        </p>
      </div>

      {advice.map((a, i) => (
        <p key={i} className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm leading-relaxed ${
          a.level === "warning" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-slate-50 text-slate-600"
        }`}>
          {a.level === "warning" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <Info className="mt-0.5 h-4 w-4 shrink-0" />}
          {a.message}
        </p>
      ))}

      {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
      {done && (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <Check className="h-4 w-4" /> {done}
        </p>
      )}

      <section className="mt-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
          Additional categories · {additional.length} of 9
        </h2>
        {additional.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">None yet.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {additional.map((c) => (
              <span key={c.name} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700">
                {c.displayName}
                <button
                  onClick={() => change({ remove: [c.name] }, `Removed ${c.displayName}.`)}
                  disabled={busy}
                  aria-label={`Remove ${c.displayName}`}
                  className="text-slate-400 hover:text-rose-600 disabled:opacity-40"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Add a category</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
          Only add what your business genuinely is. Each one that isn&apos;t makes the others count
          for less.
        </p>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder="Search Google's list — locs, wigs, nails…"
            aria-label="Search categories"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {searching && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
        </div>

        {!results && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SUGGESTED_SEARCHES.map((s) => (
              <button key={s} onClick={() => search(s)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50">
                {s}
              </button>
            ))}
          </div>
        )}

        {results && results.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">Nothing in Google&apos;s list matches “{query}”.</p>
        )}

        {results && results.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {results.map((r) => {
              const have = alreadyHave.has(r.name);
              return (
                <div key={r.name} className="flex items-center justify-between gap-3 border-b border-slate-50 px-4 py-2.5 last:border-0">
                  <span className="text-sm text-slate-700">{r.displayName}</span>
                  {have ? (
                    <span className="text-xs font-semibold text-slate-400">already on your listing</span>
                  ) : (
                    <button
                      onClick={() => change({ add: [{ name: r.name, displayName: r.displayName }] }, `Added ${r.displayName}.`)}
                      disabled={busy || remaining <= 0}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {remaining <= 0 && (
          <p className="mt-3 text-xs font-semibold text-amber-700">
            You&apos;re at Google&apos;s limit of 9. Remove one before adding another.
          </p>
        )}
      </section>

      <p className="mt-8">
        <Link href="/account/gbp-audit" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
          Back to my audit <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </p>
    </div>
  );
}
