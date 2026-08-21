"use client";

import React from "react";
import { MessageSquarePlus, Loader2, Send, RefreshCw, AlertTriangle } from "lucide-react";
import type { ConsentStatus } from "@/lib/sms-consent/store";
import { sendSmsConsentCampaign, retryConsentSync } from "@/app/admin/rebooking/actions";
import { useRouter } from "next/navigation";

/**
 * The SMS opt-in campaign, run from the rebooking page.
 *
 * SMALL BATCHES ARE THE DEFAULT AND THE DEFAULT IS THE POINT. A wording problem
 * found on twenty people is a lesson; the same problem found on the whole list
 * has spent the whole list, and there is no second first-ask. The input starts
 * at 20 and is capped at 200 by the server action.
 *
 * The counts along the top are a funnel, not a total: an invite that never gets
 * a reply is not consent, and only "synced" means Shopify agrees the person can
 * be texted.
 */

const STEP_LABEL: { key: ConsentStatus; label: string; blurb: string }[] = [
  { key: "invited", label: "Invited", blurb: "email sent" },
  { key: "submitted", label: "Filled in", blurb: "awaiting their YES" },
  { key: "confirmed", label: "Confirmed", blurb: "replied YES" },
  { key: "synced", label: "In Shopify", blurb: "agent can text them" },
  { key: "declined", label: "Declined", blurb: "said no or STOP" },
];

export function SmsConsentCampaign({
  stats,
  eligible,
}: {
  stats: Record<ConsentStatus, number>;
  eligible: number;
}) {
  const router = useRouter();
  const [limit, setLimit] = React.useState(20);
  const [dryRun, setDryRun] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function send() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const r = await sendSmsConsentCampaign({ limit, dryRun });
    setBusy(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    const x = r.result;
    setMsg(
      `${dryRun ? "Dry run" : "Sent"} — ${x.sent} ${dryRun ? "would go out" : "emails sent"}, ` +
        `${x.skipped} skipped (already asked or no email)${x.failed ? `, ${x.failed} failed` : ""}.` +
        (x.errors.length ? ` First error: ${x.errors[0]}` : ""),
    );
    router.refresh();
  }

  async function retry() {
    setSyncing(true);
    setErr(null);
    setMsg(null);
    const r = await retryConsentSync();
    setSyncing(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    setMsg(`Retried ${r.result.attempted}: ${r.result.synced} synced, ${r.result.failed} still failing.`);
    router.refresh();
  }

  const stuck = stats.confirmed;

  return (
    <div className="mb-6 bg-white border border-slate-200 rounded-xl p-4">
      <h2 className="text-[13px] font-black uppercase tracking-widest text-slate-700 flex items-center gap-1.5 mb-0.5">
        <MessageSquarePlus className="w-3.5 h-3.5 text-violet-600" />
        Text opt-in campaign
      </h2>
      <p className="text-[12px] text-slate-500 mb-3">
        Emails clients who haven&apos;t consented to texts and asks if they want a message when
        they&apos;re due. <strong>{eligible}</strong> could still be asked.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
        {STEP_LABEL.map((s) => (
          <div key={s.key} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <div className="text-lg font-black tabular-nums text-slate-900">{stats[s.key] ?? 0}</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
              {s.label}
            </div>
            <div className="text-[10px] text-slate-500">{s.blurb}</div>
          </div>
        ))}
      </div>

      {stuck > 0 && (
        <div className="text-[12px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 mb-3 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span className="flex-1">
            <strong>{stuck} confirmed but not in Shopify.</strong> They said yes; the write hasn&apos;t
            landed. Their consent is recorded either way — retry the sync.
          </span>
          <button
            type="button"
            onClick={retry}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-900 border border-amber-300 bg-white rounded-md px-2.5 py-1.5 disabled:opacity-50 shrink-0"
          >
            {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-[13px] text-slate-700">
          Send to
          <input
            type="number"
            min={1}
            max={200}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="mx-2 w-20 text-[13px] border border-slate-200 rounded px-2 py-1"
          />
          people
        </label>

        <label className="flex items-center gap-1.5 text-[13px] text-slate-700">
          <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
          Dry run
        </label>

        <button
          type="button"
          onClick={send}
          disabled={busy}
          className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md px-3.5 py-2 disabled:opacity-50 ${
            dryRun
              ? "text-slate-700 border border-slate-200 bg-white hover:border-slate-300"
              : "text-white bg-slate-900 hover:bg-slate-800"
          }`}
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {dryRun ? "Preview batch" : `Email ${limit} clients`}
        </button>
      </div>

      {(msg || err) && (
        <p
          className={`mt-3 text-[12px] rounded-md px-3 py-2 ${err ? "text-red-700 bg-red-50 border border-red-200" : "text-emerald-800 bg-emerald-50 border border-emerald-200"}`}
        >
          {err ?? msg}
        </p>
      )}

      <p className="mt-3 text-[11px] text-slate-400">
        Each person gets their own link. Consent isn&apos;t real until they reply YES to the
        confirmation text — the form alone doesn&apos;t subscribe anyone.
      </p>
    </div>
  );
}
