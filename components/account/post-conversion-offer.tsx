"use client";

import * as React from "react";
import { Loader2, MailCheck, UserPlus } from "lucide-react";
import { INVITE_SOURCES, type InviteSource } from "@/lib/account-invite";

/**
 * The account offer, shown only after a conversion has already succeeded.
 *
 * IT SENDS NO EMAIL ADDRESS. The caller passes the id of the thing that just
 * happened; the route reads the address from that row. A component that posted
 * `{ email }` would make the endpoint an open relay — see the route header.
 *
 * IT IS NEVER A BLOCKER. Rendered below a completed confirmation, dismissible
 * by ignoring it, and nothing about the conversion depends on it. The whole
 * argument for putting the ask here rather than in the flow is that a signup
 * must never cost a booking; a component that nagged would give that back.
 *
 * NO PASSWORD FIELD, DELIBERATELY. These people never chose a password and
 * never will. One tap, a link in the inbox they already gave us, done.
 */
export function PostConversionAccountOffer({
  source,
  id,
  className = "",
  tone = "light",
}: {
  source: InviteSource;
  /** The row that just got created. Never an email — see above. */
  id: string;
  className?: string;
  /**
   * Some confirmations live on dark surfaces — the pass-rate alert banner is
   * bg-slate-900. A light card dropped into one reads as a rendering fault, so
   * the palette is a prop rather than an assumption.
   */
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  const cfg = INVITE_SOURCES[source];
  const [state, setState] = React.useState<"idle" | "sending" | "sent" | "member">("idle");
  const [error, setError] = React.useState<string | null>(null);

  async function send() {
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/account/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || "Couldn't send that.");
      setState(json.alreadyMember ? "member" : "sent");
    } catch (e: any) {
      setError(e?.message || "Couldn't send that.");
      setState("idle");
    }
  }

  if (state === "member") {
    return (
      <div
        className={`rounded-xl border p-3 text-sm ${
          dark ? "border-slate-700 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"
        } ${className}`}
      >
        You already have an account with that email — just log in to see this.
      </div>
    );
  }

  if (state === "sent") {
    return (
      <div
        className={`rounded-xl border p-3 ${
          dark ? "border-emerald-700/50 bg-emerald-900/30" : "border-emerald-200 bg-emerald-50"
        } ${className}`}
      >
        <p className={`flex items-center gap-2 text-sm font-bold ${dark ? "text-emerald-300" : "text-emerald-900"}`}>
          <MailCheck className="w-4 h-4" />
          Check your email
        </p>
        <p className={`mt-1 text-sm ${dark ? "text-emerald-200/90" : "text-emerald-800"}`}>
          We sent a link to the address you just used. Tap it and you&apos;re in — no password to
          make up.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-3 ${
        dark ? "border-indigo-500/40 bg-indigo-500/10" : "border-indigo-200 bg-indigo-50/70"
      } ${className}`}
    >
      <p className={`text-sm font-bold ${dark ? "text-white" : "text-slate-900"}`}>{cfg.headline}</p>
      <p className={`mt-0.5 text-sm ${dark ? "text-slate-300" : "text-slate-600"}`}>
        Free account, no password — it opens with {cfg.opensWith}.
      </p>
      <button
        type="button"
        onClick={send}
        disabled={state === "sending"}
        data-ig-click={`account_offer_${source}`}
        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {state === "sending" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <UserPlus className="w-4 h-4" />
        )}
        Email me a link
      </button>
      {error && <p className="mt-2 text-sm font-semibold text-rose-700">{error}</p>}
    </div>
  );
}
