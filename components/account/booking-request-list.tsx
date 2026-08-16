"use client";

import * as React from "react";
import { Phone, Mail, Check, X, PhoneCall, Loader2, ShieldCheck, Lock } from "lucide-react";
import type { OwnerBookingRequest } from "@/lib/account/booking-requests";

/**
 * The owner's list of booking requests.
 *
 * IT RENDERS WHAT IT IS GIVEN AND HIDES NOTHING ITSELF. Redaction happens in
 * lib/account/booking-requests.ts, at the fetch. A component that has to
 * remember to hide a field will eventually forget, and the failure is silent:
 * the page looks right and shows a stranger someone's phone number. Here, an
 * unverified viewer's row simply has nulls in it — there is nothing to leak.
 */

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  new:         { label: "Just in",   cls: "bg-blue-50 text-blue-700 border-blue-200" },
  notified:    { label: "Waiting on you", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  contacted:   { label: "You called", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  booked:      { label: "Booked",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  declined:    { label: "Declined",  cls: "bg-rose-50 text-rose-700 border-rose-200" },
  no_response: { label: "Expired",   cls: "bg-slate-100 text-slate-500 border-slate-200" },
  cancelled:   { label: "Cancelled", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

const prettyDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
  });

export function BookingRequestList({
  requests,
  verified,
  readOnly,
}: {
  requests: OwnerBookingRequest[];
  verified: boolean;
  /** True under admin View As — the buttons would be rejected server-side. */
  readOnly: boolean;
}) {
  const [rows, setRows] = React.useState(requests);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function setStatus(id: string, status: "contacted" | "booked" | "declined") {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch("/api/account/booking-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Couldn't save that.");
      // Optimism only AFTER the server agreed — this status is what the
      // customer gets emailed about, so showing it before it is stored would
      // be showing something that might never be true.
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (e: any) {
      setError(e?.message || "Couldn't save that.");
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-slate-900">No booking requests yet</p>
        <p className="mt-1 text-sm text-slate-500">
          When someone requests an appointment from your listing, it appears here and we text you
          straight away.
        </p>
      </div>
    );
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-800">{error}</p>
      )}

      {rows.map((r) => {
        const st = STATUS_STYLE[r.status] || { label: r.status, cls: "bg-slate-100 text-slate-600 border-slate-200" };
        const settled = r.status === "booked" || r.status === "declined";
        return (
          <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-black text-slate-900">
                  {prettyDate(r.requestedDate)} at {r.requestedTime}
                </p>
                <p className="mt-0.5 text-sm text-slate-600">
                  {r.serviceName || "Appointment"}
                  {r.servicePrice ? ` · $${r.servicePrice}` : ""}
                </p>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${st.cls}`}>
                {st.label}
              </span>
            </div>

            {verified ? (
              <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-sm font-bold text-slate-900">{r.customerName || "Customer"}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {r.customerPhone && (
                    <a href={`tel:${r.customerPhone}`} className="inline-flex items-center gap-1.5 font-semibold text-indigo-700 hover:underline">
                      <Phone className="w-3.5 h-3.5" /> {r.customerPhone}
                    </a>
                  )}
                  {r.customerEmail && (
                    <a href={`mailto:${r.customerEmail}`} className="inline-flex items-center gap-1.5 text-slate-600 hover:underline">
                      <Mail className="w-3.5 h-3.5" /> {r.customerEmail}
                    </a>
                  )}
                </div>
                {r.notes && <p className="mt-2 text-sm text-slate-600 italic">“{r.notes}”</p>}
              </div>
            ) : (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900">
                  <span className="font-bold">Customer details are hidden.</span> Verify that you own this
                  listing to see who is asking and how to reach them.
                </p>
              </div>
            )}

            {!settled && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === r.id || readOnly}
                  onClick={() => setStatus(r.id, "booked")}
                  className={`${btn} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
                >
                  {busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Booked
                </button>
                <button
                  type="button"
                  disabled={busy === r.id || readOnly}
                  onClick={() => setStatus(r.id, "declined")}
                  className={`${btn} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`}
                >
                  <X className="w-3.5 h-3.5" />
                  Can&apos;t take it
                </button>
                <button
                  type="button"
                  disabled={busy === r.id || readOnly}
                  onClick={() => setStatus(r.id, "contacted")}
                  className={`${btn} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  I called them
                </button>
              </div>
            )}

            {r.status === "booked" && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                We let the customer know this is confirmed.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
