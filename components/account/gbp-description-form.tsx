"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { validateDescription, DESCRIPTION_MAX, type DescriptionIssue } from "@/lib/gbp-description";

/**
 * The description editor.
 *
 * Validates as the owner types, because this is the field where the mistake is
 * expensive and invisible: a keyword-stuffed description looks like effort and
 * reads to Google like manipulation. Showing the rule the moment it's broken is
 * more useful than a rejection after they press save.
 */
export function GbpDescriptionForm() {
  const [current, setCurrent] = useState("");
  const [text, setText] = useState("");
  const [draft, setDraft] = useState("");
  const [source, setSource] = useState<"generated" | "template">("template");
  const [currentIssues, setCurrentIssues] = useState<DescriptionIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/account/gbp-description", { cache: "no-store" });
        const json = await res.json();
        if (!json.success) { setError(json.error || "Could not load your description."); return; }
        setCurrent(json.current || "");
        setDraft(json.draft || "");
        setSource(json.source);
        setCurrentIssues(json.currentIssues || []);
        setText(json.current || json.draft || "");
      } catch { setError("Could not load your description."); }
      finally { setLoading(false); }
    })();
  }, []);

  const check = validateDescription(text);
  const unchanged = text.trim() === current.trim();

  const save = async () => {
    setSaving(true); setError(null); setSaved(false);
    try {
      const res = await fetch("/api/account/gbp-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text.trim(), generatedDraft: draft }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error || "Could not save."); return; }
      setCurrent(text.trim());
      setCurrentIssues([]);
      setSaved(true);
    } catch { setError("Could not save."); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Reading your profile…</p>;
  if (error && !text) return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-sm font-semibold text-amber-900">{error}</p>
      <Link href="/account/gbp-audit" className="mt-3 inline-block text-sm font-bold text-primary hover:underline">Back to my audit</Link>
    </div>
  );

  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-bold text-slate-900">
          {current ? `${current.length} of ${DESCRIPTION_MAX} characters used` : "No description yet"}
        </p>
        {currentIssues.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-xs font-bold text-amber-900">Your current description has problems:</p>
            <ul className="mt-1 space-y-0.5">
              {currentIssues.map((i) => (
                <li key={i.code} className="text-xs text-amber-900">• {i.message}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Google doesn&apos;t allow links, phone numbers, prices or offers here, and repeating your
          trade and city over and over is what gets listings suspended. We only draft from what&apos;s
          already on your profile — we won&apos;t invent awards or years in business.
        </p>
      </div>

      {draft && draft !== text && (
        <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary">
            <Sparkles className="h-3 w-3" /> Suggested {source === "template" ? "(assembled from your profile)" : ""}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{draft}</p>
          <button
            onClick={() => setText(draft)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-white px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5"
          >
            <RefreshCw className="h-3 w-3" /> Use this
          </button>
        </div>
      )}

      <label className="mt-6 block">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your description</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm leading-relaxed text-slate-800 outline-none focus:border-slate-400"
        />
      </label>

      <div className="mt-1 flex items-center justify-between gap-3">
        <span className={`text-xs tabular-nums ${text.length > DESCRIPTION_MAX ? "font-bold text-rose-600" : "text-slate-400"}`}>
          {text.length} / {DESCRIPTION_MAX}
        </span>
        {check.ok && text.trim() && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <Check className="h-3.5 w-3.5" /> Follows Google&apos;s rules
          </span>
        )}
      </div>

      {!check.ok && text.trim() && (
        <ul className="mt-3 space-y-1 rounded-xl border border-rose-200 bg-rose-50 p-3">
          {check.issues.map((i) => (
            <li key={i.code} className="flex items-start gap-2 text-xs text-rose-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {i.message}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
      {saved && (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <Check className="h-4 w-4" /> Saved to your Google profile.
        </p>
      )}

      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-xs text-slate-400">Your previous description is recorded before any change.</p>
        <button
          onClick={save}
          disabled={saving || !check.ok || unchanged}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save to Google
        </button>
      </div>

      <p className="mt-8">
        <Link href="/account/gbp-audit" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
          Back to my audit <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </p>
    </div>
  );
}
