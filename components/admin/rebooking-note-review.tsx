"use client";

import React from "react";
import { Sparkles, Loader2, Check, X, AlertTriangle } from "lucide-react";
import type { NoteProposal } from "@/lib/rebooking/note-agent";
import { reviewClientNotes, applyProposal } from "@/app/admin/rebooking/actions";
import { useRouter } from "next/navigation";

/**
 * "Re-read my notes" — the agent pass over the free text.
 *
 * NOTHING IS APPLIED AUTOMATICALLY. Each proposal is shown with the model's
 * reasoning and its confidence, and applying is a separate click. Amber C.
 * Flynn is the case that settled that: her note says she "may need to" start
 * seeing someone else and in the same breath asks to keep coming for her
 * eyebrows. Auto-marking her gone would end a relationship she was trying to
 * keep; leaving her active would have texted her "you're about due" days after
 * she wrote it. Only a person can pick between those.
 */

const ACTION_LABEL: Record<string, string> = {
  merge: "Same person as",
  snooze: "Snooze",
  inactive: "No longer a client",
  reduced: "Coming less often",
  cadence: "Change cadence",
};

const CONFIDENCE_CHIP: Record<string, string> = {
  high: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

export function NoteReview() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [proposals, setProposals] = React.useState<NoteProposal[] | null>(null);
  const [reviewed, setReviewed] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [applying, setApplying] = React.useState<string | null>(null);
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());

  async function run() {
    setBusy(true);
    setError(null);
    const r = await reviewClientNotes();
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      setProposals(null);
      return;
    }
    setProposals(r.proposals);
    setReviewed(r.reviewed);
    setDismissed(new Set());
  }

  async function apply(p: NoteProposal) {
    setApplying(p.customerId);
    const r = await applyProposal(p);
    setApplying(null);
    if (r.ok) {
      setDismissed((d) => new Set(d).add(p.customerId));
      router.refresh();
    } else {
      setError(r.error);
    }
  }

  const visible = (proposals ?? []).filter((p) => !dismissed.has(p.customerId));

  return (
    <div className="mb-6 bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-black uppercase tracking-widest text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Re-read my notes
          </h2>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Checks whether anything you wrote implies an action that isn&apos;t set yet.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 rounded-md px-3.5 py-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {busy ? "Reading…" : "Run"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {proposals !== null && !error && (
        <div className="mt-3">
          {visible.length === 0 ? (
            <p className="text-[12px] text-slate-500">
              Read {reviewed} note{reviewed === 1 ? "" : "s"} — nothing needs changing.
            </p>
          ) : (
            <>
              <p className="text-[12px] text-slate-500 mb-2">
                Read {reviewed} note{reviewed === 1 ? "" : "s"} — {visible.length} suggestion
                {visible.length === 1 ? "" : "s"}. Nothing is applied until you say so.
              </p>
              <div className="space-y-2">
                {visible.map((p) => (
                  <div
                    key={p.customerId}
                    className="border border-slate-200 rounded-lg px-3.5 py-3 bg-slate-50"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900 text-[14px]">{p.clientName}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5">
                        {ACTION_LABEL[p.action] ?? p.action}
                        {p.mergeTargetName ? ` ${p.mergeTargetName}` : ""}
                        {p.snoozeUntil ? ` until ${p.snoozeUntil}` : ""}
                        {p.cadenceDays ? ` ~${p.cadenceDays}d` : ""}
                        {p.reducedServices ? ` — ${p.reducedServices}` : ""}
                        {p.inactiveReason ? ` (${p.inactiveReason.replace(/_/g, " ")})` : ""}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider border rounded px-1.5 py-0.5 ${CONFIDENCE_CHIP[p.confidence]}`}
                      >
                        {p.confidence} confidence
                      </span>
                    </div>

                    <p className="text-[13px] text-slate-700 mb-2.5">{p.reasoning}</p>

                    {p.confidence !== "high" && (
                      <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 mb-2.5 flex items-start gap-1.5">
                        <AlertTriangle className="w-3 h-3 shrink-0 mt-px" />
                        Read the note yourself before applying this one.
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={applying === p.customerId}
                        onClick={() => apply(p)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 rounded-md px-3 py-1.5 disabled:opacity-50"
                      >
                        {applying === p.customerId ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => setDismissed((d) => new Set(d).add(p.customerId))}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 border border-slate-200 bg-white rounded-md px-3 py-1.5"
                      >
                        <X className="w-3 h-3" />
                        Not this
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Dismissals last for this visit only — a suggestion you skip will come back next run.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
