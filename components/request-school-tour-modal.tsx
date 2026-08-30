"use client";

import * as React from "react";
import { PostConversionAccountOffer } from "@/components/account/post-conversion-offer";
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
import {
  bookableTourSlots,
  isWeekday,
  TOUR_SLOTS,
  TOUR_WINDOW_DAYS,
} from "@/lib/school-tour-slots";

/**
 * Request A School Tour — the conversion point on /schools/[slug].
 *
 * WHY A TOUR AND NOT AN APPLICATION. Search Console says ~95% of visitors to
 * these pages arrive searching ONE school by name: they have already narrowed
 * and are checking it out. Across 23,792 impressions there were FIVE cost
 * queries and ZERO enrollment queries. An Apply CTA would compete with the
 * school's own site and lose; a tour is the step those visitors are actually
 * at, and it is one the directory can own.
 *
 * IT REQUESTS, IT DOES NOT BOOK. No school maintains availability with us, so
 * no time here is checked and none is confirmed. The copy says "request sent"
 * and never implies a reserved slot — same contract as the appointment modal.
 *
 * THE REVEAL IS THE SAFETY NET. On success the school's own phone and website
 * are handed over, so a visitor whose request goes unanswered is never left
 * with no way to reach the school. That is what makes it safe for this CTA to
 * sit above the Call button rather than beside it.
 *
 * THE PICKER IS THE REAL 48-HOUR GATE. The server guard is deliberately
 * permissive about timezones (see lib/school-tour-slots.ts), so unbookable
 * slots must be removed here rather than rejected after submit. Weekends are
 * disabled outright — an admissions office is not open Saturday, and offering
 * one produces a request nobody can honour.
 */

export interface RequestSchoolTourButtonProps {
  schoolId: string;
  schoolName: string;
  fallbackPhone?: string | null;
  fallbackWebsite?: string | null;
  className?: string;
  /**
   * The `data-ig-click` value on the trigger — what the pixel records as
   * element_name. Distinct values are the only way to tell two entry points
   * apart in pixel_events. Do not rename the visible copy to achieve this.
   */
  trackingId?: string;
}

type Step = "details" | "contact" | "done";

export function RequestSchoolTourButton({
  schoolId,
  schoolName,
  fallbackPhone,
  fallbackWebsite,
  className,
  trackingId = "school_tour_request",
}: RequestSchoolTourButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>("details");
  const [date, setDate] = React.useState<Date | undefined>();
  const [time, setTime] = React.useState("");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [company, setCompany] = React.useState(""); // honeypot
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reveal, setReveal] = React.useState<{ phone: string | null; website: string | null }>({
    phone: null,
    website: null,
  });
  // Handed to the account offer below. Not an email — see that component.
  const [tourId, setTourId] = React.useState<string | null>(null);

  /**
   * `now` is state, not a render-time Date. Reading the clock during render
   * makes server and client output differ and throws a hydration mismatch —
   * the same reason the appointment modal defers it.
   */
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const dateStr = date ? format(date, "yyyy-MM-dd") : "";
  const slots = React.useMemo(
    () => (now && dateStr ? bookableTourSlots(dateStr, now) : TOUR_SLOTS),
    [now, dateStr]
  );

  // A slot that was legal when picked can age out while the modal sits open.
  React.useEffect(() => {
    if (time && !slots.includes(time)) setTime("");
  }, [slots, time]);

  const today = startOfDay(new Date());

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/school-tours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_id: schoolId,
          requested_date: dateStr,
          requested_time: time,
          customer_name: name,
          customer_phone: phone,
          customer_email: email,
          customer_notes: notes || null,
          company_website: company,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Something went wrong. Please try again.");
        return;
      }
      setTourId(json.tour_id ?? null);
      setReveal({
        phone: json.school_phone ?? fallbackPhone ?? null,
        website: json.school_website ?? fallbackWebsite ?? null,
      });
      setStep("done");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const canContinue = Boolean(dateStr && time);
  const canSubmit = Boolean(name.trim() && phone.trim() && email.trim());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          data-ig-click={trackingId}
          /**
           * `bg-primary`, not a hardcoded blue. app/globals.css defines
           * --primary per theme, so the token tracks the brand blue everywhere
           * it is used; a literal hex here would drift the first time that
           * token changes and nobody would think to look in this file.
           */
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm transition-colors shadow-sm",
            className
          )}
        >
          <CalendarDays className="h-4 w-4" />
          Request a School Tour
        </button>
      </DialogTrigger>

      {/* `light` is load-bearing, not decoration — the same trap
          book-appointment-modal.tsx documents, and this component fell into it.
          app/globals.css defines the DARK palette on :root and overrides it in
          `.light`; entity pages opt in via `light` on their own wrapper. A Radix
          dialog portals into document.body, OUTSIDE that wrapper, so without
          this class the modal inherits the dark :root and the calendar renders
          near-white text on near-white surfaces. Anything portalled out of a
          page must carry this. */}
      <DialogContent className="light sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white text-slate-900 border-slate-200">
        {step === "details" && (
          <>
            <DialogHeader>
              <DialogTitle>Request a tour of {schoolName}</DialogTitle>
              <DialogDescription>
                Tours run Monday to Friday, 10:00 AM to 4:00 PM, and need at least
                48 hours&apos; notice.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/*
                `flex justify-center` on the WRAPPER, not a width on the
                Calendar. components/ui/calendar.tsx sets `w-fit` on its root,
                so a calendar dropped straight into this column hugs the left
                edge and leaves dead space to its right — while the time-slot
                grid below spans the full width. The two then disagree about
                where the content starts, which is the misalignment.
                book-appointment-modal.tsx already wraps it this way; this is
                the same fix, not a new idea.
              */}
              <div className="rounded-xl border border-slate-200 p-1 flex justify-center">
                <Calendar
                  /**
                   * `bg-transparent` so the calendar takes the white of the box
                   * around it. components/ui/calendar.tsx paints `bg-background`
                   * on its root, which inside this bordered container renders as
                   * a pale panel narrower than the box — a nested frame that
                   * reads as misalignment even though it is perfectly centred.
                   * It only shows up at mobile widths, where the calendar is
                   * narrow relative to the dialog.
                   */
                  className="bg-transparent"
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(day) =>
                    day < today ||
                    day > addDays(today, TOUR_WINDOW_DAYS) ||
                    !isWeekday(format(day, "yyyy-MM-dd")) ||
                    (now ? bookableTourSlots(format(day, "yyyy-MM-dd"), now).length === 0 : false)
                  }
                />
              </div>

              {date && slots.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No times left on that day — tours need 48 hours&apos; notice. Try a
                  later date.
                </p>
              ) : (
                // Same responsive step as book-appointment-modal.tsx: three
                // across on mobile, four on desktop. With seven slots that is
                // 3+3+1 on a phone and 4+3 on a laptop — a ragged last row is
                // unavoidable at any column count for an odd number of slots,
                // and the count varies anyway as lead time filters them.
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTime(s)}
                      className={cn(
                        "px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                        time === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white text-slate-700 border-slate-200 hover:border-primary/60"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                disabled={!canContinue}
                onClick={() => setStep("contact")}
                className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-sm disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === "contact" && (
          <>
            <DialogHeader>
              <DialogTitle>Your details</DialogTitle>
              <DialogDescription>
                {dateStr && time ? `${format(date!, "EEEE d MMMM")} at ${time}` : null}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                inputMode="tel"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                inputMode="email"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything you want to ask about? (optional)"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />

              {/* Honeypot — hidden from people, irresistible to bots. */}
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                name="company_website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={!canSubmit || busy}
                  onClick={submit}
                  className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm disabled:opacity-40 inline-flex items-center justify-center gap-2"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Send tour request
                </button>
              </div>
            </div>
          </>
        )}

        {step === "done" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-600" />
                Tour request sent
              </DialogTitle>
              <DialogDescription>
                {/*
                  Says what actually happens next. The school has NOT been
                  contacted at this point — a person has to call them, because we
                  hold four email addresses across 1,185 schools. Implying the
                  school already knows would be the one promise this flow cannot
                  keep.
                */}
                We&apos;ll contact {schoolName} to arrange it and follow up with you
                to confirm. This isn&apos;t a confirmed booking yet.
              </DialogDescription>
            </DialogHeader>

            {/* Post-conversion, same rule as the appointment modal. A tour
                request is the clearest student signal on the site, so this is
                also where `audience` gets stamped — see lib/account-invite. */}
            {tourId && <PostConversionAccountOffer source="school_tour" id={tourId} />}

            <div className="space-y-2">
              {reveal.phone && (
                <a
                  href={`tel:${reveal.phone}`}
                  data-ig-click="school_tour_reveal_phone"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold"
                >
                  <Phone className="h-4 w-4" />
                  {reveal.phone}
                </a>
              )}
              {reveal.website && (
                <a
                  href={reveal.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-ig-click="school_tour_reveal_website"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold"
                >
                  <Globe className="h-4 w-4" />
                  Visit website
                </a>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
