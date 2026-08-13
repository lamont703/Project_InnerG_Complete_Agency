"use client";

import * as React from "react";
import { format, addDays, startOfDay } from "date-fns";
import { CalendarDays, Phone, Globe, Check, Loader2, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { formatServiceLabel, type BookableService, type BookingEntityType } from "@/lib/booking-services";

/**
 * The Book Appointment CTA and its modal — the single conversion point on the
 * four entity page types, replacing the Call and Website buttons that used to
 * hand the lead straight to the business.
 *
 * IT REQUESTS, IT DOES NOT BOOK. Nothing here reserves a slot, and the copy
 * must never suggest otherwise: 6 of 5,457 listings are claimed, so no
 * business is maintaining availability and a confirmed time is not ours to
 * promise. Every time slot is offered, none is checked, and the confirmation
 * says "request sent" rather than "you're booked".
 *
 * THE REVEAL IS THE SAFETY NET, and it is why removing the Call button is
 * survivable. Once the request is in — the lead captured, which is the whole
 * point — the confirmation step hands over the business's own phone and
 * website. A customer whose request goes unanswered is never left with no way
 * to reach the shop, which would be a worse outcome than the old Call button.
 */

export interface BookAppointmentButtonProps {
  entityType: BookingEntityType;
  entityId: string;
  entityName: string;
  services: BookableService[];
  /** Falls back into the confirmation step if the API response carries nothing. */
  fallbackPhone?: string | null;
  fallbackWebsite?: string | null;
  className?: string;
  variant?: "primary" | "block";
}

const BOOKING_WINDOW_DAYS = 30;

/**
 * A standard 9-to-7 grid at half-hour steps. NOT the business's real hours:
 * google_hours is populated on 1 of 2,541 shops and 0 of 2,672 salons, so
 * there is nothing to gate on. The business confirms the time, which is the
 * same reason none of these is checked for availability.
 */
function buildSlots(): string[] {
  const out: string[] = [];
  for (let m = 9 * 60; m <= 19 * 60; m += 30) {
    const h24 = Math.floor(m / 60);
    const min = m % 60;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    out.push(`${h12}:${String(min).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`);
  }
  return out;
}

const SLOTS = buildSlots();

type Step = "details" | "contact" | "done";

interface BusinessContact {
  name?: string | null;
  phone?: string | null;
  website?: string | null;
}

export function BookAppointmentButton({
  entityType,
  entityId,
  entityName,
  services,
  fallbackPhone = null,
  fallbackWebsite = null,
  className,
  variant = "primary",
}: BookAppointmentButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>("details");

  const [service, setService] = React.useState<string>(services[0]?.name ?? "");
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [time, setTime] = React.useState<string>("");

  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [honeypot, setHoneypot] = React.useState("");

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [business, setBusiness] = React.useState<BusinessContact | null>(null);

  const today = React.useMemo(() => startOfDay(new Date()), []);
  const lastDay = React.useMemo(() => addDays(today, BOOKING_WINDOW_DAYS), [today]);

  // Reset only after the dialog has fully closed, so the confirmation does not
  // flicker back to step one on the way out.
  React.useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setStep("details");
      setService(services[0]?.name ?? "");
      setDate(undefined);
      setTime("");
      setName("");
      setPhone("");
      setEmail("");
      setNotes("");
      setError(null);
      setBusiness(null);
    }, 200);
    return () => clearTimeout(t);
  }, [open, services]);

  const canContinue = Boolean(service && date && time);
  const canSubmit = Boolean(phone.trim() && email.trim()) && !submitting;

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!date || !canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          service_name: service,
          requested_date: format(date, "yyyy-MM-dd"),
          requested_time: time,
          customer_name: name,
          customer_phone: phone,
          customer_email: email,
          customer_notes: notes,
          company_website: honeypot,
          source: `${entityType}_page`,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      setBusiness(data.business ?? { name: entityName, phone: fallbackPhone, website: fallbackWebsite });
      setStep("done");
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const triggerClass =
    variant === "block"
      ? "w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors shadow-sm px-6 py-3"
      : "flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors shadow-sm px-6 py-3";

  const phoneOut = business?.phone ?? fallbackPhone;
  const siteOut = business?.website ?? fallbackWebsite;
  const siteHref = siteOut ? (siteOut.startsWith("http") ? siteOut : `https://${siteOut}`) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" data-ig-click="book_appointment" className={cn(triggerClass, className)}>
          <CalendarDays className="w-4 h-4" />
          Book Appointment
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {step === "done" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="w-4 h-4" />
                </span>
                Request sent
              </DialogTitle>
              <DialogDescription>
                {entityName} has been texted your request for{" "}
                <strong className="text-slate-900">{service}</strong>
                {date ? ` on ${format(date, "EEEE, MMMM d")}` : ""} at {time}. They'll contact you on{" "}
                {phone} to confirm.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              This is a request, not a confirmed appointment. The time is yours once the
              business confirms it.
            </div>

            {(phoneOut || siteHref) && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-900">Want to reach them now?</p>
                <div className="flex gap-2">
                  {phoneOut && (
                    <a
                      href={`tel:${phoneOut}`}
                      data-ig-click="outbound_lead"
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl border border-slate-200 shadow-sm px-4 py-2.5"
                    >
                      <Phone className="w-4 h-4 text-slate-500" />
                      Call
                    </a>
                  )}
                  {siteHref && (
                    <a
                      href={siteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-ig-click="outbound_lead"
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl border border-slate-200 shadow-sm px-4 py-2.5"
                    >
                      <Globe className="w-4 h-4 text-slate-500" />
                      Website
                    </a>
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-6 py-3"
            >
              Done
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Book with {entityName}</DialogTitle>
              <DialogDescription>
                {step === "details"
                  ? "Pick a service and a time that suits you. The business confirms it directly."
                  : "Where should they reach you?"}
              </DialogDescription>
            </DialogHeader>

            {step === "details" && (
              <div className="space-y-4 py-2">
                <div>
                  <label htmlFor="bk-service" className="block text-sm font-semibold text-slate-900 mb-1.5">
                    Service
                  </label>
                  <select
                    id="bk-service"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {services.map((s) => (
                      <option key={s.name} value={s.name}>
                        {formatServiceLabel(s)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="block text-sm font-semibold text-slate-900 mb-1.5">Date</span>
                  <div className="rounded-xl border border-slate-200 p-1 flex justify-center">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      startMonth={today}
                      endMonth={lastDay}
                      disabled={{ before: today, after: lastDay }}
                      className="p-0"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Appointments can be requested up to {BOOKING_WINDOW_DAYS} days ahead.
                  </p>
                </div>

                <div>
                  <span className="block text-sm font-semibold text-slate-900 mb-1.5">Time</span>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {SLOTS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setTime(s)}
                        aria-pressed={time === s}
                        className={cn(
                          "rounded-lg border px-2 py-2 text-xs font-semibold transition-colors",
                          time === s
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canContinue}
                  onClick={() => setStep("contact")}
                  className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm px-6 py-3"
                >
                  Continue
                </button>
              </div>
            )}

            {step === "contact" && (
              <div className="space-y-4 py-2">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm">
                  <div className="font-semibold text-slate-900">{service}</div>
                  <div className="text-slate-600">
                    {date ? format(date, "EEEE, MMMM d") : ""} at {time}
                  </div>
                </div>

                <div>
                  <label htmlFor="bk-name" className="block text-sm font-semibold text-slate-900 mb-1.5">
                    Your name
                  </label>
                  <input
                    id="bk-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label htmlFor="bk-phone" className="block text-sm font-semibold text-slate-900 mb-1.5">
                    Phone <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="bk-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    placeholder="(555) 555-5555"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label htmlFor="bk-email" className="block text-sm font-semibold text-slate-900 mb-1.5">
                    Email <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="bk-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label htmlFor="bk-notes" className="block text-sm font-semibold text-slate-900 mb-1.5">
                    Anything they should know?
                  </label>
                  <textarea
                    id="bk-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                {/* Honeypot — hidden from people, irresistible to bots. */}
                <input
                  type="text"
                  name="company_website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  className="absolute left-[-9999px] w-px h-px opacity-0"
                />

                {error && (
                  <p role="alert" className="text-sm text-rose-600 font-medium">
                    {error}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep("details")}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm px-4 py-3"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm px-6 py-3"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submitting ? "Sending…" : "Send request"}
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  Sending a request doesn't reserve the time — {entityName} confirms it with you
                  directly.
                </p>
              </div>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
