"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock, Loader2, PartyPopper } from "lucide-react";
import { formatTime, parseTime, type HolidayPlanItem, type HolidayDecision } from "@/lib/gbp-special-hours";

/**
 * Holiday hours.
 *
 * Closures and busy days are treated differently because the mistake differs.
 * On Christmas Day the risk is a customer arriving at a locked shop; on Mother's
 * Day it's a salon quietly working extended hours that Google never shows. So
 * closures default to "Closed" and busy days default to the shop's usual hours,
 * ready to be stretched.
 */
type Choice = { mode: "closed" | "hours" | "clear"; open: string; close: string } | undefined;

export function GbpHoursForm() {
  const [plan, setPlan] = useState<HolidayPlanItem[]>([]);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [hasRegular, setHasRegular] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = (json: any) => { setPlan(json.plan || []); setHasRegular(json.hasRegularHours); setChoices({}); };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/account/gbp-hours", { cache: "no-store" });
        const json = await res.json();
        if (!json.success) setError(json.error || "Could not load your hours.");
        else load(json);
      } catch { setError("Could not load your hours."); }
      finally { setLoading(false); }
    })();
  }, []);

  const set = (date: string, next: Choice) => setChoices((c) => ({ ...c, [date]: next }));

  const decisions = (): HolidayDecision[] =>
    Object.entries(choices).flatMap(([date, c]): HolidayDecision[] => {
      if (!c) return [];
      if (c.mode === "clear") return [{ date, mode: "clear" }];
      if (c.mode === "closed") return [{ date, mode: "closed" }];
      const openTime = parseTime(c.open);
      const closeTime = parseTime(c.close);
      // An incomplete pair isn't a statement anyone can act on, so it's dropped
      // rather than sent as half a change.
      if (!openTime || !closeTime) return [];
      return [{ date, mode: "hours", openTime, closeTime }];
    });

  const pending = decisions();

  const save = async () => {
    setSaving(true); setError(null); setSaved(null);
    try {
      const res = await fetch("/api/account/gbp-hours", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisions: pending }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error || "Could not save."); return; }
      setSaved(json.saved); load(json);
    } catch { setError("Could not save."); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Checking the calendar…</p>;
  if (error && !plan.length) return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-sm font-semibold text-amber-900">{error}</p>
      <Link href="/account/gbp-audit" className="mt-3 inline-block text-sm font-bold text-primary hover:underline">Back to my audit</Link>
    </div>
  );

  return (
    <div>
      {!hasRegular && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your regular opening hours aren&apos;t set, so there&apos;s nothing to suggest from. Holiday
          hours still work, you&apos;ll just be typing them in.
        </p>
      )}

      {plan.map((item) => {
        const c = choices[item.holiday.date];
        const suggestedOpen = formatTime(item.suggested?.openTime);
        const suggestedClose = formatTime(item.suggested?.closeTime);
        const currentOpen = formatTime(item.openTime) || suggestedOpen;
        const currentClose = formatTime(item.closeTime) || suggestedClose;
        const mode = c?.mode ?? (item.mode === "unset" ? undefined : item.mode);

        return (
          <article key={item.holiday.id} className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                  {item.holiday.kind === "busy" ? <PartyPopper className="h-3.5 w-3.5 text-amber-500" /> : <Clock className="h-3.5 w-3.5 text-slate-400" />}
                  {item.holiday.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {new Date(`${item.holiday.date}T00:00:00Z`).toLocaleDateString(undefined, {
                    weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
                  })}
                  {item.mode !== "unset" && (
                    <span className="ml-2 font-semibold text-emerald-600">
                      · currently {item.mode === "closed" ? "closed" : `${currentOpen}–${currentClose}`}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-1.5">
                {(["closed", "hours"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => set(item.holiday.date, { mode: m, open: c?.open ?? currentOpen ?? "09:00", close: c?.close ?? currentClose ?? "17:00" })}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                      mode === m ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {m === "closed" ? "Closed" : "Special hours"}
                  </button>
                ))}
                {item.mode !== "unset" && (
                  <button
                    onClick={() => set(item.holiday.date, { mode: "clear", open: "", close: "" })}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                      mode === "clear" ? "border-rose-500 bg-rose-500 text-white" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Normal
                  </button>
                )}
              </div>
            </header>

            {mode === "hours" && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <input type="time" value={c?.open ?? currentOpen} onChange={(e) => set(item.holiday.date, { mode: "hours", open: e.target.value, close: c?.close ?? currentClose })} aria-label={`${item.holiday.name} opening time`} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                <span className="text-slate-400">to</span>
                <input type="time" value={c?.close ?? currentClose} onChange={(e) => set(item.holiday.date, { mode: "hours", open: c?.open ?? currentOpen, close: e.target.value })} aria-label={`${item.holiday.name} closing time`} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                {item.suggested && (
                  <span className="text-xs text-slate-400">usually {suggestedOpen}–{suggestedClose}</span>
                )}
              </div>
            )}
          </article>
        );
      })}

      {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
      {saved !== null && (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <Check className="h-4 w-4" /> Saved {saved} date{saved === 1 ? "" : "s"} to your Google profile.
        </p>
      )}

      <div className="sticky bottom-4 mt-6">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <p className="text-sm text-slate-600">
            {pending.length === 0 ? "Set the dates you know about" : `${pending.length} date${pending.length === 1 ? "" : "s"} ready`}
          </p>
          <button onClick={save} disabled={saving || pending.length === 0} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save to Google
          </button>
        </div>
      </div>

      <p className="mt-8 text-xs leading-relaxed text-slate-400">
        Dates you don&apos;t touch are left exactly as they are, including holidays already past.
      </p>
      <p className="mt-4">
        <Link href="/account/gbp-audit" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
          Back to my audit <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </p>
    </div>
  );
}
