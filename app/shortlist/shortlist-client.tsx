"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, Link2, Loader2, Scale } from "lucide-react";
import type { ComparisonRow, ShortlistItem } from "@/lib/shortlist";
import { clearShortlist, onShortlistChange, readShortlist } from "@/lib/shortlist-store";
import { CompareTable } from "@/components/shortlist/compare-table";

/**
 * The compare page, driven by localStorage.
 *
 * The list lives in the browser, so the rows have to be hydrated by asking the
 * server about the slugs this browser holds — the page cannot be rendered on the
 * server from a request alone. Ratings are re-read every time rather than taken
 * from the stored copy: a comparison built on a month-old snapshot is worse than
 * no comparison.
 */
export function ShortlistClient() {
  const [items, setItems] = useState<ShortlistItem[] | null>(null);
  const [rows, setRows] = useState<ComparisonRow[]>([]);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async (list: ShortlistItem[]) => {
    if (list.length === 0) { setRows([]); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/shortlist/hydrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: list }),
      });
      const json = await res.json();
      setRows(json.rows || []);
    } catch {
      setRows([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const list = readShortlist();
    setItems(list);
    void hydrate(list);
    return onShortlistChange((next) => { setItems(next); void hydrate(next); });
  }, [hydrate]);

  if (items === null || loading) {
    return <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading your shortlist…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
        <Scale className="mx-auto mb-3 h-8 w-8 text-slate-300" />
        <p className="text-base font-black text-slate-900">Nothing saved yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-600">
          Open any barbershop or salon and hit <strong>Add to shortlist</strong>. Once two are
          saved you can see them side by side — rating, review count and how far apart they are.
        </p>
        <Link href="/tools/barbershop-search" className="mt-5 inline-block rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800">
          Find a shop or salon
        </Link>
      </div>
    );
  }

  return (
    <>
      <CompareTable rows={rows} />
      <SaveBox items={items} onCleared={() => clearShortlist()} />
    </>
  );
}

/**
 * The email ask, and the only one on this page.
 *
 * It comes AFTER the comparison, not before it — the visitor has already got
 * what they came for, and the address buys them the list surviving a closed tab.
 * Saving without an address is allowed and produces the same link, because a
 * shareable artifact behind a form is not a shareable artifact.
 */
function SaveBox({ items, onCleared }: { items: ShortlistItem[]; onCleared: () => void }) {
  const [email, setEmail] = useState("");
  const [followUp, setFollowUp] = useState(true);
  const [saving, setSaving] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, email: email || undefined, followUp: followUp && !!email }),
      });
      const json = await res.json();
      if (!json.ok) setError(json.error || "Could not save that.");
      else setUrl(`${window.location.origin}${json.url}`);
    } catch {
      setError("Could not save that.");
    }
    setSaving(false);
  };

  if (url) {
    return (
      <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-900"><Check className="h-4 w-4" /> Saved.</p>
        <p className="mt-1 text-sm leading-relaxed text-emerald-800">
          This link is your shortlist. Bookmark it, or send it to whoever you&apos;re deciding with.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="flex-1 truncate rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-slate-700">{url}</code>
          <button type="button"
            onClick={() => { void navigator.clipboard.writeText(url); setCopied(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-black text-white hover:bg-emerald-800">
            <Link2 className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy link"}
          </button>
        </div>
        <button type="button" onClick={onCleared} className="mt-4 text-xs font-bold text-emerald-800 underline">
          Start a new shortlist
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <h2 className="text-sm font-black text-slate-900">Save this shortlist</h2>
      <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
        Get a link you can come back to or send to someone. An email is optional — it&apos;s only
        used for the check-in below.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com (optional)"
          className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
        />
        <button type="button" onClick={save} disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save &amp; get a link
        </button>
      </div>
      {email && (
        <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm leading-relaxed text-slate-700">
          <input type="checkbox" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} className="mt-0.5 h-4 w-4" />
          <span>
            Check in with me in a few days to ask how it went. One email, and your answer becomes
            a review that helps the next person deciding.
          </span>
        </label>
      )}
      {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
    </div>
  );
}
