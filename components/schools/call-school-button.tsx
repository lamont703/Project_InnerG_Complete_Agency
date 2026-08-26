"use client";

import { useState } from "react";
import { Phone, Loader2, CheckCircle2, X } from "lucide-react";

/**
 * Connect a student to a school without either side guessing anything.
 *
 * THE POINT: the school and the department are known HERE, on the page, before
 * a phone is involved. A tel: link cannot carry them — a call delivers only a
 * caller ID and a dialled number — so tapping to dial forces the voice agent to
 * ask which school, over a phone line, against school names that differ by one
 * word. Collecting it in the browser removes that failure entirely.
 *
 * A MODAL, NOT AN INLINE FORM, and that is the fix for a real bug rather than a
 * preference. The first version expanded its steps in place, which works in a
 * page body and breaks in the scroll banner: a slim dark bar cannot hold a
 * growing three-step form, so the button rendered off-centre with its own light
 * styling against a dark background and the text was unreadable. Every other
 * CTA that appears in both places — Book Appointment, Request a Tour — is a
 * trigger plus a modal for exactly this reason.
 *
 * The trigger takes className so each host styles it: the banner's gradient
 * pill, or the page's outline button. The modal looks the same from both.
 *
 * The department is three BUTTONS, not a voice prompt. It is a three-way
 * choice: a tap is instant, silent, needs no microphone permission, and is
 * never misheard.
 */
function track(event: string, meta: Record<string, unknown>) {
  try {
    (window as any).innerG?.track?.(event, meta);
  } catch {
    /* pixel not loaded — ignore */
  }
}

const DEPARTMENTS = [
  { value: "admissions", label: "Admissions" },
  { value: "financial_aid", label: "Financial Aid" },
  { value: "education", label: "Current Students" },
] as const;

const DEFAULT_TRIGGER =
  "w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50";

type Step = "department" | "phone" | "calling" | "done" | "error";

export function CallSchoolButton({
  routingId,
  schoolName,
  source = "page",
  className,
}: {
  routingId: string;
  schoolName: string;
  /** Distinguishes the banner from the page header in pixel_events. */
  source?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("department");
  const [intent, setIntent] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const base = { routing_id: routingId, school_name: schoolName, source };

  function openModal() {
    track("school_call_opened", base);
    setStep("department");
    setIntent(null);
    setMessage(null);
    setOpen(true);
  }

  async function placeCall() {
    setStep("calling");
    setMessage(null);
    // Fired BEFORE the request. Fired after, a Twilio outage would read as
    // nobody wanting to call — demand would appear to vanish at exactly the
    // moment the system broke.
    track("school_call_requested", { ...base, department: intent });
    try {
      const res = await fetch("/api/voice/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routingId, intent, phone }),
      });
      const json = await res.json();
      if (json?.ok) {
        track("school_call_connected", { ...base, department: intent, call_sid: json.callSid ?? null });
        setStep("done");
        return;
      }
      track("school_call_failed", { ...base, department: intent, reason: json?.error ?? "unknown" });
      setStep("error");
      setMessage(
        json?.error === "rate_limited"
          ? "That number has been called a few times just now. Give it a little while."
          : json?.error === "invalid_phone"
            ? "That doesn't look like a US phone number."
            : "We couldn't place the call. Please try again.",
      );
    } catch {
      track("school_call_failed", { ...base, department: intent, reason: "network" });
      setStep("error");
      setMessage("We couldn't place the call. Please try again.");
    }
  }

  return (
    <>
      <button type="button" onClick={openModal} className={className ?? DEFAULT_TRIGGER}>
        <Phone className="h-4 w-4" />
        Call {schoolName}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-base font-bold text-slate-900">
                {step === "done" ? "Calling you now" : `Call ${schoolName}`}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {step === "done" ? (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Answer your phone and we&apos;ll connect you to {schoolName}.</span>
              </div>
            ) : step === "department" ? (
              <>
                <p className="mb-2 text-sm text-slate-600">What&apos;s it about?</p>
                <div className="grid gap-2">
                  {DEPARTMENTS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => {
                        track("school_call_department", { ...base, department: d.value });
                        setIntent(d.value);
                        setStep("phone");
                      }}
                      className="rounded-lg border border-slate-200 px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <label htmlFor="callback-phone" className="mb-1 block text-sm font-semibold text-slate-900">
                  Your phone number
                </label>
                <p className="mb-2 text-xs text-slate-500">
                  We&apos;ll ring you and connect you straight through.
                </p>
                <input
                  id="callback-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
                {message && <p className="mt-2 text-xs font-medium text-rose-600">{message}</p>}
                <button
                  type="button"
                  disabled={step === "calling" || phone.replace(/\D/g, "").length < 10}
                  onClick={placeCall}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {step === "calling" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                  {step === "calling" ? "Calling you…" : "Call me now"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
