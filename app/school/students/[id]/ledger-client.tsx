"use client";

import { useState, useTransition } from "react";
import { Ban, Loader2, Monitor, PenLine, School } from "lucide-react";
import { voidPunchAction } from "./actions";

export interface LedgerRow {
  id: string;
  date: string;
  inAt: string;
  outAt: string | null;
  minutes: number;
  kind: "theory" | "practical";
  modality: "campus" | "distance";
  segment: "core" | "specialty";
  blockLabel: string | null;
  source: string;
  validated: boolean;
  autoClosed: boolean;
  validatedBy: string | null;
  validatedAt: string | null;
  voidedAt: string | null;
  voidedBy: string | null;
  voidReason: string | null;
}

/**
 * The punch trail.
 *
 * VOIDED ROWS STAY IN PLACE, struck through, with who voided them and why.
 * They are not moved to a separate list and not hidden behind a toggle, because
 * the correction belongs next to the thing it corrected — that adjacency is the
 * whole explanation. A trail with the corrections filtered out is just a
 * different set of numbers with nothing to account for them.
 *
 * AN AUTO-CLOSED PUNCH SAYS SO. Nobody clocked out; the system ended it at the
 * end of the scheduled class. The clock-out time is real either way, so a bare
 * timestamp would read as a student who happened to tap out at exactly 9:00:00
 * — which is a stronger claim than anybody can make about that hour.
 *
 * A SIGNED DISTANCE HOUR NAMES ITS SIGNER, right on the row. "validated" as a
 * bare badge would be the weaker record — the point of the signature is that
 * somebody specific stands behind it, and a badge that hides the name reads as
 * though the system validated the hour, which it did not.
 *
 * VOIDING ASKS FOR A REASON AND WILL NOT PROCEED WITHOUT ONE. A void with no
 * explanation is indistinguishable from a quiet deletion, which is the exact
 * thing this design exists to prevent.
 */
const hm = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;

export function LedgerClient({ rows }: { rows: LedgerRow[] }) {
  const [pending, startTransition] = useTransition();
  const [voiding, setVoiding] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submitVoid = (punchId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await voidPunchAction(punchId, reason);
      if (res.ok) {
        setVoiding(null);
        setReason("");
      } else setError(res.error ?? "Could not void that punch.");
    });
  };

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-600">
        No punches yet. Hours appear here the moment this student clocks in at the door.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const dead = Boolean(r.voidedAt);
        return (
          <div
            key={r.id}
            className={`rounded-xl border p-4 ${dead ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white"}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-sm font-black ${dead ? "text-slate-400 line-through" : "text-slate-900"}`}>
                  {r.date} · {r.inAt} – {r.outAt ?? "still in"}
                  {r.outAt && <span className="ml-2 font-bold tabular-nums">{hm(r.minutes)}</span>}
                </p>
                <p className={`mt-1 flex flex-wrap items-center gap-x-2 text-xs ${dead ? "text-slate-400" : "text-slate-600"}`}>
                  {r.modality === "distance" ? (
                    <span className="inline-flex items-center gap-1 font-bold text-sky-700">
                      <Monitor className="h-3 w-3" /> online
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                      <School className="h-3 w-3" /> campus
                    </span>
                  )}
                  <span>·</span>
                  <span>{r.segment} {r.kind}</span>
                  {r.blockLabel && (<><span>·</span><span>{r.blockLabel}</span></>)}
                  <span>·</span>
                  <span>{r.source}</span>
                  {r.autoClosed && !dead && (
                    <span
                      className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-black text-slate-700"
                      title="Nobody clocked out. The system closed this at the end of the scheduled class."
                    >
                      auto-closed
                    </span>
                  )}
                  {r.modality === "distance" && !dead && (
                    r.validated ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-900">
                        <PenLine className="h-2.5 w-2.5" />
                        signed{r.validatedBy ? ` — ${r.validatedBy}` : ""}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-900">
                        not validated
                      </span>
                    )
                  )}
                </p>
              </div>

              {!dead && (
                <button
                  onClick={() => { setVoiding(voiding === r.id ? null : r.id); setReason(""); setError(null); }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Void
                </button>
              )}
            </div>

            {dead && (
              <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-600">
                <span className="font-black text-slate-800">Voided</span>
                {r.voidedBy ? ` by ${r.voidedBy}` : ""} — {r.voidReason || "no reason recorded"}
              </p>
            )}

            {voiding === r.id && (
              <div className="mt-3 rounded-lg border-2 border-amber-200 bg-amber-50 p-3">
                <label className="text-[11px] font-black uppercase tracking-widest text-amber-900">
                  Why is this wrong?
                </label>
                <input
                  autoFocus
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Clocked in for the wrong block"
                  className="mt-1.5 w-full rounded-lg border-2 border-amber-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-amber-400"
                />
                <p className="mt-1.5 text-[11px] leading-relaxed text-amber-800">
                  The punch is kept exactly as recorded and marked void. It is never edited or
                  deleted.
                </p>
                {error && <p className="mt-2 text-xs font-bold text-rose-700">{error}</p>}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => submitVoid(r.id)}
                    disabled={pending || !reason.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-black text-white hover:bg-amber-700 disabled:opacity-40"
                  >
                    {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Void this punch
                  </button>
                  <button
                    onClick={() => setVoiding(null)}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
