"use client";

import React from "react";
import { StickyNote, Check, Loader2, RotateCcw } from "lucide-react";
import type { DueClient } from "@/lib/rebooking/queue";
import type { InactiveReason, NoteStatus } from "@/lib/rebooking/notes";
import { saveClientNote, markClientContacted, reactivateClient } from "@/app/admin/rebooking/actions";

/**
 * Where the barber writes down what the order history cannot show.
 *
 * The three cases this was built around, all spotted in seconds on the first
 * look at the queue:
 *   "Justin moved to Vegas"                  -> no longer a client
 *   "Alicia's son went off to college"       -> snooze to the holidays
 *   "Anthony comes in on another account"    -> same person as
 *
 * NOTES ARE NEVER SENT. They exist to correct the model and to remind a human.
 * lib/rebooking/messages.ts composes only from the cadence result, so nothing
 * typed here can reach a client.
 */

const REASONS: { value: InactiveReason; label: string }[] = [
  { value: "moved", label: "Moved away" },
  { value: "switched_barber", label: "Goes elsewhere now" },
  { value: "no_longer_local", label: "Not local any more" },
  { value: "passed_away", label: "Passed away" },
  { value: "other", label: "Other" },
];

type Mode = "note" | "snooze" | "reduced" | "inactive" | "cadence" | "merge";

export function NoteEditor({
  client,
  allClients,
}: {
  client: DueClient;
  allClients: { customerId: string; name: string }[];
}) {
  const note = client.note;
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>("note");
  const [text, setText] = React.useState(note?.note ?? "");
  const [snoozeUntil, setSnoozeUntil] = React.useState(note?.snoozeUntil ?? "");
  const [reason, setReason] = React.useState<InactiveReason>(note?.inactiveReason ?? "moved");
  const [cadence, setCadence] = React.useState(
    note?.cadenceOverrideDays != null ? String(note.cadenceOverrideDays) : "",
  );
  const [mergeInto, setMergeInto] = React.useState(note?.mergedIntoCustomerId ?? "");
  const [reducedServices, setReducedServices] = React.useState(note?.reducedServices ?? "");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setMsg(null);
    const r = await fn();
    setBusy(false);
    if (r.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setOpen(false);
    } else {
      setMsg(r.error ?? "Something went wrong.");
    }
  }

  function submit() {
    const base = { shopifyCustomerId: client.customerId, clientName: client.name, note: text || null };

    if (mode === "snooze") {
      return run(() =>
        saveClientNote({ ...base, status: "snoozed" as NoteStatus, snoozeUntil: snoozeUntil || null }),
      );
    }
    if (mode === "reduced") {
      const n = cadence.trim() === "" ? null : Number(cadence);
      return run(() =>
        saveClientNote({
          ...base,
          status: "reduced" as NoteStatus,
          reducedServices: reducedServices || null,
          cadenceOverrideDays: n,
        }),
      );
    }
    if (mode === "inactive") {
      return run(() =>
        saveClientNote({ ...base, status: "inactive" as NoteStatus, inactiveReason: reason }),
      );
    }
    if (mode === "cadence") {
      const n = cadence.trim() === "" ? null : Number(cadence);
      return run(() => saveClientNote({ ...base, cadenceOverrideDays: n }));
    }
    if (mode === "merge") {
      return run(() => saveClientNote({ ...base, mergedIntoCustomerId: mergeInto || null }));
    }
    return run(() => saveClientNote(base));
  }

  const others = allClients.filter((c) => c.customerId !== client.customerId);

  return (
    <div className="border-t border-slate-200 pt-3 mt-1">
      {note?.note && !open && (
        <p className="text-[13px] text-slate-700 bg-white border border-slate-200 rounded-md px-3 py-2 mb-2 whitespace-pre-wrap">
          <StickyNote className="w-3 h-3 inline-block mr-1.5 -mt-0.5 text-amber-500" />
          {note.note}
        </p>
      )}

      {!open ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 bg-white rounded-md px-2.5 py-1.5"
          >
            <StickyNote className="w-3 h-3" />
            {note?.note ? "Edit note" : "Add note"}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(() =>
                // Frozen state travels with the send so attribution can compare
                // it against the right historical bucket later.
                markClientContacted(client.customerId, client.name, {
                  channel: client.reachableBy === "none" ? "manual" : client.reachableBy,
                  cadenceDays: client.cadenceDays,
                  daysOverdue: client.daysOverdue,
                  annualValue: client.annualValue,
                  averageTicket: client.averageTicket,
                }),
              )
            }
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 bg-white rounded-md px-2.5 py-1.5 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            I reached out
          </button>

          {(note?.status === "snoozed" ||
            note?.status === "inactive" ||
            note?.status === "reduced" ||
            note?.mergedIntoCustomerId) && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => reactivateClient(client.customerId))}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 hover:text-emerald-900 border border-emerald-200 bg-emerald-50 rounded-md px-2.5 py-1.5 disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" />
              Put back in queue
            </button>
          )}

          {saved && <span className="text-[11px] font-bold text-emerald-600">Saved</span>}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-3">
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["note", "Note"],
                ["snooze", "Snooze"],
                ["reduced", "Coming less often"],
                ["inactive", "No longer a client"],
                ["cadence", "Fix cadence"],
                ["merge", "Same person as"],
              ] as [Mode, string][]
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`text-[10px] font-black uppercase tracking-wider rounded px-2 py-1 border ${
                  mode === m
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="What's going on with them? e.g. moved to Vegas, son went off to college…"
            className="w-full text-[13px] text-slate-800 border border-slate-200 rounded-md px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />

          {mode === "snooze" && (
            <label className="block text-[12px] text-slate-600">
              Bring back on
              <input
                type="date"
                value={snoozeUntil}
                onChange={(e) => setSnoozeUntil(e.target.value)}
                className="ml-2 text-[13px] border border-slate-200 rounded px-2 py-1"
              />
            </label>
          )}

          {mode === "reduced" && (
            <div className="space-y-2">
              <label className="block text-[12px] text-slate-600">
                Still comes in for
                <input
                  type="text"
                  maxLength={200}
                  value={reducedServices}
                  onChange={(e) => setReducedServices(e.target.value)}
                  placeholder="eyebrows, beard trims, before holidays…"
                  className="ml-2 text-[13px] border border-slate-200 rounded px-2 py-1 w-64 max-w-full"
                />
              </label>
              <label className="block text-[12px] text-slate-600">
                Roughly every
                <input
                  type="number"
                  min={1}
                  max={730}
                  value={cadence}
                  onChange={(e) => setCadence(e.target.value)}
                  className="mx-2 w-20 text-[13px] border border-slate-200 rounded px-2 py-1"
                />
                days
              </label>
              <p className="text-[11px] text-slate-400">
                Still a client, off their old rhythm. Drops out of revenue-at-risk and gets a
                message with no urgency in it. Leave the interval blank and they won&apos;t be
                chased at all — they&apos;ll just sit in the reduced list.
              </p>
            </div>
          )}

          {mode === "inactive" && (
            <label className="block text-[12px] text-slate-600">
              Why
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as InactiveReason)}
                className="ml-2 text-[13px] border border-slate-200 rounded px-2 py-1"
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {mode === "cadence" && (
            <label className="block text-[12px] text-slate-600">
              Actually comes every
              <input
                type="number"
                min={1}
                max={730}
                value={cadence}
                onChange={(e) => setCadence(e.target.value)}
                placeholder={String(client.cadenceDays)}
                className="mx-2 w-20 text-[13px] border border-slate-200 rounded px-2 py-1"
              />
              days <span className="text-slate-400">(blank to go back to the computed {client.cadenceDays})</span>
            </label>
          )}

          {mode === "merge" && (
            <label className="block text-[12px] text-slate-600">
              Same person as
              <select
                value={mergeInto}
                onChange={(e) => setMergeInto(e.target.value)}
                className="ml-2 text-[13px] border border-slate-200 rounded px-2 py-1 max-w-full"
              >
                <option value="">— pick a record —</option>
                {others.map((o) => (
                  <option key={o.customerId} value={o.customerId}>
                    {o.name}
                  </option>
                ))}
              </select>
              <span className="block mt-1 text-slate-400">
                Hides this record so they aren&apos;t chased twice. Merge properly in Shopify when you
                get a chance — this app only has read access to customers.
              </span>
            </label>
          )}

          {msg && <p className="text-[12px] text-red-700">{msg}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 rounded-md px-3 py-1.5 disabled:opacity-50"
            >
              {busy && <Loader2 className="w-3 h-3 animate-spin" />}
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setMsg(null);
              }}
              className="text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 px-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
