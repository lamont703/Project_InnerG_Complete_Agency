"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Move a booking from the texted link: pick a day, then one of the pro's real open times. */
export function RescheduleAppointment({ token, providerId, serviceId, timezone, windowDays }: { token: string; providerId: string; serviceId: string; timezone: string; windowDays: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [slots, setSlots] = useState<{ iso: string; label: string }[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = (() => {
    const out: { key: string; label: string }[] = [];
    const fmtKey = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
    const fmtLabel = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", month: "short", day: "numeric" });
    const seen = new Set<string>();
    for (let i = 0; out.length < Math.min(14, windowDays) && i < 16; i++) {
      const d = new Date(Date.now() + i * 86400_000);
      const key = fmtKey.format(d);
      if (!seen.has(key)) { seen.add(key); out.push({ key, label: fmtLabel.format(d) }); }
    }
    return out;
  })();

  useEffect(() => {
    if (!day) return;
    setSlots(null); setSlot(null);
    fetch(`/api/calendar/public/slots?provider=${providerId}&service=${serviceId}&date=${day}`, { cache: "no-store" })
      .then((r) => r.json()).then((j) => setSlots(j.slots || [])).catch(() => setSlots([]));
  }, [day, providerId, serviceId]);

  if (!open) {
    return <button onClick={() => setOpen(true)} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white">Reschedule</button>;
  }
  return (
    <div className="space-y-3">
      <p className="text-sm font-bold">Pick a new day</p>
      <div className="flex flex-wrap gap-2">
        {days.map((d) => (
          <button key={d.key} onClick={() => setDay(d.key)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${day === d.key ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"}`}>{d.label}</button>
        ))}
      </div>
      {day && (slots === null ? <p className="text-sm text-slate-500">Finding open times…</p> : slots.length === 0 ? <p className="text-sm text-slate-500">Nothing open that day. Try another.</p> : (
        <div className="flex flex-wrap gap-2">
          {slots.map((s) => (
            <button key={s.iso} onClick={() => setSlot(s.iso)} className={`rounded-lg border px-3 py-1.5 text-sm ${slot === s.iso ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"}`}>{s.label}</button>
          ))}
        </div>
      ))}
      {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={!slot || busy}
          onClick={async () => {
            setBusy(true); setError(null);
            const r = await fetch("/api/calendar/public/reschedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, start: slot }) });
            const j = await r.json().catch(() => ({}));
            setBusy(false);
            if (j.ok) { setOpen(false); router.refresh(); } else setError(j.error || "Couldn't move it.");
          }}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
        >
          {busy ? "Moving…" : "Move my appointment"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Never mind</button>
      </div>
    </div>
  );
}
