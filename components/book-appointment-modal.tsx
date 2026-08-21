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
import { bookableSlots, bookableSlotsForDate } from "@/lib/booking-lead-time";
import { PostConversionAccountOffer } from "@/components/account/post-conversion-offer";

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
  /**
   * Open with this service already chosen.
   *
   * WHY IT EXISTS. Each row in an entity's Services list has its own Book pill,
   * and those pills used to be `<a href={profile_url}>` straight out to Booksy
   * — the request had already been made by the time the modal existed, and the
   * per-service links were never converted. Sending someone into the modal on
   * the default first service after they clicked "Beard Trim" is its own small
   * betrayal, so the row passes what was clicked.
   *
   * Matched by name against `services`; an unrecognised value falls back to the
   * first entry rather than leaving the select empty, because the modal cannot
   * submit without one.
   */
  preselectService?: string;
  className?: string;
  /**
   * `inline` is the small pill used inside a Services row. It carries no base
   * styling of its own and no icon — the row supplies the colour, which differs
   * per entity type — and its label is just "Book", because the service name is
   * already the thing sitting next to it.
   */
  variant?: "primary" | "block" | "inline";
  /**
   * The `data-ig-click` value on the trigger, which is what the site-wide pixel
   * tracker records as element_name. Distinct values are the ONLY way to tell
   * two entry points apart in pixel_events — without one, the scroll banner's
   * button and the entity page's button are the same row and neither can be
   * credited. Do not rename the visible copy to achieve this; the tracker falls
   * back to button text, so copy changes silently break historical funnels.
   */
  trackingId?: string;
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
  preselectService,
  fallbackPhone = null,
  fallbackWebsite = null,
  className,
  variant = "primary",
  trackingId = "book_appointment",
}: BookAppointmentButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>("details");

  /**
   * The service the modal opens on. `preselectService` wins when it names one
   * we actually offer — see the prop's note — and the first entry is the
   * fallback so the form is never in an unsubmittable state.
   */
  const initialService = React.useMemo(() => {
    /*
     * Compared loosely on purpose. The Services list on an entity page renders
     * the RAW booksy_services name, while this list has been through
     * normalizeBooksyServices, which trims. An exact === would therefore miss
     * on any row whose scraped name carries stray whitespace — and it would
     * miss silently, landing the visitor on the first service with nothing to
     * indicate the preselect had failed.
     */
    const wanted = preselectService?.trim().toLowerCase();
    const match = wanted ? services.find((s) => s.name.trim().toLowerCase() === wanted) : undefined;
    return (match ? match.name : services[0]?.name) ?? "";
  }, [preselectService, services]);

  const [service, setService] = React.useState<string>(initialService);
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
  // Kept only to hand the account offer a reference to the row that was just
  // created. Never the email — see the offer component.
  const [bookingId, setBookingId] = React.useState<string | null>(null);

  const today = React.useMemo(() => startOfDay(new Date()), []);
  const lastDay = React.useMemo(() => addDays(today, BOOKING_WINDOW_DAYS), [today]);

  /**
   * The clock the lead-time floor is measured against.
   *
   * Null until mounted, on purpose. Reading `new Date()` during render would
   * make the server and client produce different slot lists and hydrate
   * mismatched — and a null `now` simply shows every slot, which is exactly
   * what the pre-mount markup should say. The server guard is the backstop.
   *
   * It ticks while the picker is open so someone who lingers is not offered a
   * slot that has since fallen inside the floor. Only while the picker is open:
   * a re-render every minute behind the contact form would be waste.
   */
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    if (!open || step !== "details") return;
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [open, step]);

  const dateStr = date ? format(date, "yyyy-MM-dd") : "";
  // The empty-date case lives in bookableSlotsForDate so it is tested rather
  // than re-derived here — see that function for what went wrong before.
  const slots = React.useMemo(
    () => bookableSlotsForDate(SLOTS, dateStr, now),
    [now, dateStr]
  );

  /**
   * A chosen slot can stop being bookable — the modal sat open past the
   * lead-time floor, or the day changed underneath it. Dropping the selection
   * is right; dropping it SILENTLY was not.
   *
   * Someone picked 9:30 AM, then picked today, and their highlighted choice
   * simply vanished with nothing on screen to explain it. The existing amber
   * notice only fires when EVERY slot on the day has gone, which is a different
   * situation and left this one unexplained. Now the reason is stated and
   * cleared as soon as they choose again.
   */
  const [droppedTime, setDroppedTime] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (time && !slots.includes(time)) {
      setDroppedTime(time);
      setTime("");
    }
  }, [slots, time]);

  // Reset only after the dialog has fully closed, so the confirmation does not
  // flicker back to step one on the way out.
  React.useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setStep("details");
      setService(initialService);
      setDate(undefined);
      setTime("");
      setDroppedTime(null);
      setName("");
      setPhone("");
      setEmail("");
      setNotes("");
      setError(null);
      setBusiness(null);
      setBookingId(null);
    }, 200);
    return () => clearTimeout(t);
  }, [open, services, initialService]);

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
      setBookingId(data.booking_id ?? null);
      setStep("done");
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * THE TOKEN, NOT A LITERAL — same reasoning as the claim CTA. This has to
   * match "Search ShearQuery" in the navbar, which is bg-primary. A hardcoded
   * blue matches today and drifts the first time the brand colour moves, in a
   * component rendered on four page types.
   *
   * --primary is context-dependent (#00b2de under the dark :root, #0051bd
   * under .light) and every entity page wraps itself — navbar included — in
   * `light`, so both buttons resolve to the same value on the same page.
   *
   * NOTE for anyone rendering this somewhere new: the scroll banner passes its
   * own gradient because it sits OUTSIDE that wrapper, in the root layout,
   * where bg-primary resolves to the dark-context cyan instead.
   */
  const triggerClass =
    variant === "inline"
      ? ""
      : variant === "block"
      ? "w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm rounded-xl transition-colors shadow-sm px-6 py-3"
      : "flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm rounded-xl transition-colors shadow-sm px-6 py-3";

  const phoneOut = business?.phone ?? fallbackPhone;
  const siteOut = business?.website ?? fallbackWebsite;
  const siteHref = siteOut ? (siteOut.startsWith("http") ? siteOut : `https://${siteOut}`) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" data-ig-click={trackingId} className={cn(triggerClass, className)}>
          {variant !== "inline" && <CalendarDays className="w-4 h-4" />}
          {variant === "inline" ? "Book" : "Book Appointment"}
        </button>
      </DialogTrigger>

      {/* `light` is load-bearing, not decoration. app/globals.css defines the
          DARK palette on :root and overrides it in `.light`, and every entity
          page opts in by putting `light` on its own wrapper div. A Radix
          dialog renders through a portal into document.body — outside that
          wrapper — so without this class the modal inherits the dark :root and
          the calendar renders near-white text on near-white surfaces. Anything
          else portalled out of a page must carry this too. */}
      <DialogContent className="light sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white text-slate-900 border-slate-200">
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

            {/* AFTER the conversion, never before it. The request is already
                sent and nothing here can undo it — that is the whole reason
                the ask lives at this step. */}
            {bookingId && <PostConversionAccountOffer source="booking" id={bookingId} className="mt-3" />}

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
                    className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                      disabled={[
                        { before: today, after: lastDay },
                        // Today disappears once its last bookable slot has
                        // passed, rather than offering a day with no times.
                        (day: Date) =>
                          now !== null &&
                          bookableSlots(SLOTS, format(day, "yyyy-MM-dd"), now).length === 0,
                      ]}
                      // The calendar root carries bg-background, which under
                      // `light` is a faint grey — fine on its own, muddy inside
                      // this white bordered card. The surrounding div supplies
                      // the surface instead.
                      className="p-0 bg-transparent"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Appointments can be requested up to {BOOKING_WINDOW_DAYS} days ahead.
                  </p>
                </div>

                <div>
                  <span className="block text-sm font-semibold text-slate-900 mb-1.5">Time</span>
                  {!date ? (
                    /*
                     * NO DAY, NO TIMES. The grid used to render the full
                     * unfiltered slot list before a date existed, because
                     * `slots` falls back to SLOTS when dateStr is empty — so
                     * every button was live, clicking one highlighted it, and
                     * Continue stayed disabled because canContinue also needs a
                     * date.
                     *
                     * One real visitor clicked seven different times in twelve
                     * seconds, closed the modal, reopened it and started again.
                     * They were not indecisive; they were pressing the only
                     * controls that responded. Offering a choice that cannot
                     * count is worse than offering none.
                     */
                    <p className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
                      Pick a day above and the available times will appear here.
                    </p>
                  ) : slots.length === 0 ? (
                    <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
                      No times left today — the salon needs a few hours&apos; notice to call you
                      back. Pick another day.
                    </p>
                  ) : (
                  <>
                  {droppedTime && (
                    <p className="mb-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
                      {droppedTime} isn&apos;t available on that day any more — the salon needs a few
                      hours&apos; notice. Pick another time below.
                    </p>
                  )}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setTime(s);
                          setDroppedTime(null);
                        }}
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
                  </>
                  )}
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
                    className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                    className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                    className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                    className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
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
