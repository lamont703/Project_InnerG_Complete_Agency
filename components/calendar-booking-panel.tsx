"use client";

import * as React from "react";
import { Check, Loader2, ArrowLeft } from "lucide-react";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Real booking, for listings whose pro runs a ShearQuery calendar.
 *
 * Rendered inside the Book Appointment dialog in place of the request form
 * when /api/calendar/public/lookup says the listing is bookable. Unlike the
 * request form, every time offered here is actually free, and the confirmation
 * says "you're booked" — because it is.
 *
 * Steps: service → day → time → name and phone → text code → booked. The code
 * is checked at the moment of booking (api/calendar/public/book), so a proven
 * phone is spent on exactly one appointment.
 */

export interface CalendarInfo {
  providerId: string;
  name: string;
  listing: string | null;
  timezone: string;
  windowDays: number;
  services: { id: string; name: string; minutes: number; priceCents: number | null }[];
}

type Step = "pick" | "details" | "code" | "done";

const price = (c: number | null) => (c == null ? "" : ` · $${(c / 100).toFixed(c % 100 ? 2 : 0)}`);

/** The next N calendar dates in the pro's zone, as YYYY-MM-DD with a short label. */
function upcomingDays(tz: string, n: number) {
  const out: { key: string; label: string }[] = [];
  const fmtKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const fmtLabel = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" });
  const seen = new Set<string>();
  for (let i = 0; out.length < n && i < n + 2; i++) {
    const d = new Date(Date.now() + i * 86400_000);
    const key = fmtKey.format(d);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, label: fmtLabel.format(d) });
  }
  return out;
}

/**
 * Inside the Book dialog the headings are the dialog's own title and
 * description, which Radix requires to be inside a Dialog — outside one they
 * throw in the browser. `standalone` (the /book/<handle> page) uses plain
 * headings instead.
 */
export function CalendarBookingPanel({ info, onClose, standalone = false }: { info: CalendarInfo; onClose: () => void; standalone?: boolean }) {
  const Title = (standalone ? "h2" : DialogTitle) as React.ElementType;
  const Description = (standalone ? "p" : DialogDescription) as React.ElementType;
  const Header = (standalone ? "div" : DialogHeader) as React.ElementType;
  const [step, setStep] = React.useState<Step>("pick");
  const [serviceId, setServiceId] = React.useState(info.services[0]?.id || "");
  const days = React.useMemo(() => upcomingDays(info.timezone, Math.min(info.windowDays, 21)), [info]);
  const [day, setDay] = React.useState(days[0]?.key || "");
  const [slots, setSlots] = React.useState<{ iso: string; label: string }[] | null>(null);
  const [slot, setSlot] = React.useState<{ iso: string; label: string } | null>(null);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const service = info.services.find((s) => s.id === serviceId);
  const dayLabel = days.find((d) => d.key === day)?.label || day;

  React.useEffect(() => {
    if (!serviceId || !day) return;
    let cancelled = false;
    setSlots(null);
    setSlot(null);
    fetch(`/api/calendar/public/slots?provider=${info.providerId}&service=${serviceId}&date=${day}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setSlots(j.slots || []); })
      .catch(() => { if (!cancelled) setSlots([]); });
    return () => { cancelled = true; };
  }, [info.providerId, serviceId, day]);

  const sendCode = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/calendar/public/code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setStep("code");
    } catch (e: any) {
      setError(e.message || "Couldn't send the code.");
    } finally {
      setBusy(false);
    }
  };

  const book = async () => {
    if (!slot) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/calendar/public/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: info.providerId, serviceId, start: slot.iso, name, phone, code, notes }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setStep("done");
    } catch (e: any) {
      setError(e.message || "Couldn't book that.");
    } finally {
      setBusy(false);
    }
  };

  const who = `${info.name}${info.listing ? ` at ${info.listing}` : ""}`;

  if (step === "done") {
    return (
      <div className="py-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-6 w-6 text-emerald-700" />
        </div>
        <Title className="mt-4 text-xl font-black">You&apos;re booked</Title>
        <Description className="mt-2 text-sm text-slate-600">
          {service?.name} with {who}, {dayLabel} at {slot?.label}. We texted you a confirmation with a link to view or cancel it.
        </Description>
        <button onClick={onClose} className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white">Done</button>
      </div>
    );
  }

  return (
    <div>
      <Header>
        <Title className="text-xl font-black">Book with {info.name}</Title>
        <Description className="text-sm text-slate-600">
          {info.listing ? `${info.listing} · ` : ""}Real open times — you&apos;re booked when you finish.
        </Description>
      </Header>

      {step === "pick" && (
        <div className="mt-5 space-y-5">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Service</span>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
              {info.services.map((s) => (
                <option key={s.id} value={s.id}>{s.name} · {s.minutes} min{price(s.priceCents)}</option>
              ))}
            </select>
          </label>

          <div>
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Day</span>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {days.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setDay(d.key)}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold ${d.key === day ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Time ({info.timezone.split("/").pop()?.replace(/_/g, " ")} time)</span>
            {slots === null ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Checking…</p>
            ) : slots.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Nothing open that day. Try another.</p>
            ) : (
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => (
                  <button
                    key={s.iso}
                    onClick={() => setSlot(s)}
                    className={`rounded-xl border px-2 py-2 text-sm font-bold ${slot?.iso === s.iso ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            disabled={!slot}
            onClick={() => setStep("details")}
            className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      )}

      {step === "details" && (
        <div className="mt-5 space-y-4">
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{service?.name} · {dayLabel} at {slot?.label}</p>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Your name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Mobile number</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            <span className="mt-1 block text-xs text-slate-500">We&apos;ll text a code to confirm it&apos;s you, then your confirmation.</span>
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Anything they should know? (optional)</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          </label>
          {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => { setError(null); setStep("pick"); }} className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold"><ArrowLeft className="h-4 w-4" /> Back</button>
            <button disabled={busy || !name.trim() || phone.replace(/\D/g, "").length < 10} onClick={sendCode} className="flex-1 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white disabled:opacity-40">
              {busy ? "Sending…" : "Text me a code"}
            </button>
          </div>
        </div>
      )}

      {step === "code" && (
        <div className="mt-5 space-y-4">
          <p className="text-sm text-slate-700">Enter the 6-digit code we texted to {phone}.</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="w-full rounded-xl border border-slate-300 px-3 py-3 text-center text-lg font-black tracking-[0.4em]"
          />
          {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => { setError(null); setCode(""); setStep("details"); }} className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold"><ArrowLeft className="h-4 w-4" /> Back</button>
            <button disabled={busy || code.length !== 6} onClick={book} className="flex-1 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white disabled:opacity-40">
              {busy ? "Booking…" : `Book ${slot?.label}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
