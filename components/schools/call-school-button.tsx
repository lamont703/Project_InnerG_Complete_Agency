"use client";

import { useState } from "react";
import { Phone, Loader2, CheckCircle2 } from "lucide-react";

/**
 * Connect a student to a school without either side guessing anything.
 *
 * THE POINT: the school and the department are known HERE, on the page, before
 * a phone is involved. A tel: link cannot carry them — a call delivers only a
 * caller ID and a dialled number — so tapping to dial forces the voice agent to
 * ask which school, over a phone line, against school names that differ by one
 * word. Collecting it in the browser removes that failure entirely.
 *
 * The department is three BUTTONS, not a voice prompt. It is a three-way
 * choice: a tap is instant, silent, needs no microphone permission, and is
 * never misheard.
 */
/**
 * Fires into pixel_events via the global tracker, same shape AdTracker uses.
 * Silent when the pixel has not loaded — a missing analytics call must never be
 * the reason somebody cannot phone a school.
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

type Step = "idle" | "department" | "phone" | "calling" | "done" | "error";

export function CallSchoolButton({
  routingId,
  schoolName,
}: {
  routingId: string;
  schoolName: string;
}) {
  const [step, setStep] = useState<Step>("idle");
  const [intent, setIntent] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function placeCall() {
    setStep("calling");
    setMessage(null);
    // Fired BEFORE the request, so the funnel records the intent to call even
    // when the call itself fails. Without this a Twilio outage would look like
    // nobody wanted to call.
    track("school_call_requested", {
      routing_id: routingId,
      school_name: schoolName,
      department: intent,
    });
    try {
      const res = await fetch("/api/voice/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routingId, intent, phone }),
      });
      const json = await res.json();
      if (json?.ok) {
        track("school_call_connected", {
          routing_id: routingId,
          school_name: schoolName,
          department: intent,
          call_sid: json.callSid ?? null,
        });
        setStep("done");
        return;
      }
      track("school_call_failed", {
        routing_id: routingId,
        school_name: schoolName,
        department: intent,
        reason: json?.error ?? "unknown",
      });
      setStep("error");
      setMessage(
        json?.error === "rate_limited"
          ? "That number has been called a few times just now. Give it a little while."
          : json?.error === "invalid_phone"
            ? "That doesn't look like a US phone number."
            : "We couldn't place the call. Please try again.",
      );
    } catch {
      track("school_call_failed", {
        routing_id: routingId,
        school_name: schoolName,
        department: intent,
        reason: "network",
      });
      setStep("error");
      setMessage("We couldn't place the call. Please try again.");
    }
  }

  if (step === "done") {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Calling you now — answer and we&apos;ll connect you to {schoolName}.
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2">
      {step === "idle" && (
        <button
          type="button"
          onClick={() => {
            track("school_call_opened", { routing_id: routingId, school_name: schoolName });
            setStep("department");
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          <Phone className="h-4 w-4" />
          Call {schoolName}
        </button>
      )}

      {step === "department" && (
        <div className="rounded-lg border border-slate-300 p-3">
          <p className="mb-2 text-sm font-semibold text-slate-900">What&apos;s it about?</p>
          <div className="grid gap-2">
            {DEPARTMENTS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => {
                  track("school_call_department", {
                    routing_id: routingId,
                    school_name: schoolName,
                    department: d.value,
                  });
                  setIntent(d.value);
                  setStep("phone");
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {(step === "phone" || step === "calling" || step === "error") && (
        <div className="rounded-lg border border-slate-300 p-3">
          <label htmlFor="callback-phone" className="mb-1 block text-sm font-semibold text-slate-900">
            Your phone number
          </label>
          <p className="mb-2 text-xs text-slate-500">
            We&apos;ll ring you and connect you straight through. We read your number
            out to {schoolName} so they can call you back.
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
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {step === "calling" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
            {step === "calling" ? "Calling you…" : "Call me now"}
          </button>
        </div>
      )}
    </div>
  );
}
