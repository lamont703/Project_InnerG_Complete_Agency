"use client";

import * as React from "react";
import { Phone, Mail, Check, Loader2, AlertTriangle, School, Clock } from "lucide-react";
import type { TourQueue, TourQueueRow } from "@/lib/admin/school-tour-queue";

/**
 * The staff view of the school tour call queue.
 *
 * THE CALL SCRIPT IS PART OF THE UI, not a document someone is meant to
 * remember. The reason these requests are worked by hand is that the call is
 * the only conversation we get with an unclaimed school — so the two questions
 * worth asking are printed on the row. A queue that only captures the outcome
 * of the tour throws away the reason it was staffed.
 *
 * A ROW LEAVES THE PENDING LIST ONLY WHEN A HUMAN REACHED THE SCHOOL. Opening
 * it, reading it or copying the number does nothing. "Tried, no answer" is a
 * real outcome and stamps the row too — it moves to attempted rather than
 * sitting in pending looking untouched.
 */

const prettyDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

const OUTCOMES = [
  { value: "contacted", label: "Spoke to them" },
  { value: "booked", label: "Tour confirmed" },
  { value: "no_response", label: "Tried, no answer" },
  { value: "cancelled", label: "Can't host it" },
] as const;

function Row({
  row,
  onDone,
  tone,
}: {
  row: TourQueueRow;
  onDone: (id: string) => void;
  tone: "pending" | "missed" | "done";
}) {
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState<string>("contacted");
  const [calledBy, setCalledBy] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/school-tour-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, status, called_by: calledBy, call_notes: notes }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Couldn't save.");
        return;
      }
      onDone(row.id);
    } catch {
      setError("Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={
        "rounded-xl border p-4 " +
        (tone === "missed"
          ? "border-rose-200 bg-rose-50"
          : tone === "done"
          ? "border-slate-200 bg-slate-50"
          : "border-slate-200 bg-white")
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <School className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="truncate">{row.schoolName || "(unnamed school)"}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1 font-medium text-slate-900">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {prettyDate(row.requestedDate)} at {row.requestedTime}
            </span>
            {row.schoolPhone && (
              <a href={`tel:${row.schoolPhone}`} className="inline-flex items-center gap-1 text-indigo-700 font-semibold">
                <Phone className="h-3.5 w-3.5" />
                {row.schoolPhone}
              </a>
            )}
          </div>
        </div>
        {tone === "missed" && (
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-rose-700">
            <AlertTriangle className="h-3 w-3" />
            Date passed, never called
          </span>
        )}
      </div>

      <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
        <div className="font-semibold text-slate-900">{row.customerName || "(no name)"}</div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
          {row.customerPhone && (
            <a href={`tel:${row.customerPhone}`} className="inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              {row.customerPhone}
            </a>
          )}
          {row.customerEmail && (
            <a href={`mailto:${row.customerEmail}`} className="inline-flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              {row.customerEmail}
            </a>
          )}
        </div>
        {row.customerNotes && <p className="mt-2 text-slate-700 italic">“{row.customerNotes}”</p>}
      </div>

      {tone === "done" ? (
        <div className="mt-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-900 capitalize">{row.status.replace("_", " ")}</span>
          {row.calledBy ? ` · ${row.calledBy}` : ""}
          {row.callNotes ? <p className="mt-1 italic">“{row.callNotes}”</p> : null}
        </div>
      ) : !open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
        >
          Log this call
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          {/*
            The two questions that justify staffing this by hand. Printed, not
            remembered — see the component note.
          */}
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-[13px] text-indigo-900">
            <p className="font-bold uppercase tracking-wide text-[10px] mb-1">While you have them</p>
            <p>1. Do they want to claim their listing? (free, and it opens their dashboard)</p>
            <p>2. Are they interested in advertising to students in their area?</p>
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {OUTCOMES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            value={calledBy}
            onChange={(e) => setCalledBy(e.target.value)}
            placeholder="Who called?"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="What did they say? Claim / advertising interest, who to ask for next time…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save call
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SchoolTourQueue({ queue }: { queue: TourQueue }) {
  const [pending, setPending] = React.useState(queue.pending);
  const [missed, setMissed] = React.useState(queue.missed);

  const clear = (id: string) => {
    setPending((p) => p.filter((r) => r.id !== id));
    setMissed((m) => m.filter((r) => r.id !== id));
  };

  const Section = ({
    title,
    rows,
    tone,
    empty,
  }: {
    title: string;
    rows: TourQueueRow[];
    tone: "pending" | "missed" | "done";
    empty: string;
  }) => (
    <section className="mb-10">
      <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-500">
        {title} {rows.length > 0 && <span className="text-slate-900">({rows.length})</span>}
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Row key={r.id} row={r} tone={tone} onDone={clear} />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <>
      <Section
        title="Missed — call these first"
        rows={missed}
        tone="missed"
        empty="Nothing missed."
      />
      <Section
        title="To call"
        rows={pending}
        tone="pending"
        empty="Queue is clear."
      />
      <Section
        title="Recently called"
        rows={queue.done}
        tone="done"
        empty="No calls logged yet."
      />
    </>
  );
}
