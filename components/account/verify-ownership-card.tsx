"use client";

import * as React from "react";
import { ShieldCheck, Loader2, MessageSquare } from "lucide-react";

/**
 * The two-step "prove you own this" card.
 *
 * WHY IT IS PHRASED AS AN UNLOCK RATHER THAN A CHALLENGE. The person reading it
 * has already claimed the listing and, in almost every case, genuinely owns it.
 * Framing this as suspicion of them ("we don't believe you") is both unpleasant
 * and inaccurate — the check exists because someone ELSE could have claimed it,
 * which is a reason to protect their customers, not to doubt them.
 *
 * The card never shows or accepts the destination number. It says which phone
 * we texted by its last four digits only, because a claimant who does not own
 * the business must not learn the business's number from this page.
 */
export function VerifyOwnershipCard({ listingName }: { listingName: string }) {
  const [stage, setStage] = React.useState<"idle" | "sent">("idle");
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [noPhone, setNoPhone] = React.useState(false);

  async function post(payload: Record<string, unknown>) {
    const res = await fetch("/api/account/verify-listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw Object.assign(new Error(json?.error || "Something went wrong."), json);
    return json;
  }

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const json = await post({ action: "send" });
      setSentTo(json.sentTo ?? null);
      setStage("sent");
    } catch (e: any) {
      setError(e.message);
      if (e.noPhone) setNoPhone(true);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await post({ action: "confirm", code });
      // Full reload rather than local state: verification changes what the
      // SERVER is willing to send for every request on the page. Flipping a
      // boolean here would show empty fields that were never fetched.
      window.location.reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-xl bg-white p-2 border border-indigo-100">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-black text-slate-900">Unlock customer contact details</h2>
          <p className="mt-1 text-sm text-slate-600">
            We can show you who is asking once we know the account belongs to {listingName}. We&apos;ll
            text a 6-digit code to the phone number already on the listing — you don&apos;t type the
            number, we already have it.
          </p>

          {stage === "idle" ? (
            <button
              type="button"
              onClick={send}
              disabled={busy || noPhone}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
              Text me the code
            </button>
          ) : (
            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-500">
                {sentTo ? `Sent to the number ending ${sentTo}.` : "Code sent."} It expires in 10 minutes.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={7}
                  placeholder="123456"
                  className="w-32 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold tracking-widest text-slate-900 placeholder:text-slate-300"
                />
                <button
                  type="button"
                  onClick={confirm}
                  disabled={busy || code.replace(/\D/g, "").length !== 6}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-40"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Verify
                </button>
                <button
                  type="button"
                  onClick={send}
                  disabled={busy}
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-800"
                >
                  Resend
                </button>
              </div>
            </div>
          )}

          {error && <p className="mt-2 text-sm font-semibold text-rose-700">{error}</p>}

          <p className="mt-3 text-xs text-slate-500">
            No phone on the listing, or the number has changed?{" "}
            <a href="/account/gbp-audit" className="font-semibold text-indigo-700 hover:underline">
              Connect your Google Business Profile
            </a>{" "}
            instead — that proves ownership too.
          </p>
        </div>
      </div>
    </div>
  );
}
