"use client";

import React from "react";
import { Power, Loader2, Play, ShieldAlert, ChevronDown, Clock } from "lucide-react";
import type { AgentSettings } from "@/lib/rebooking/agent";
import type { AuditRun } from "@/lib/rebooking/audit";
import { saveAgentSettings, runAgentNow } from "@/app/admin/rebooking/actions";
import { useRouter } from "next/navigation";

/**
 * The switch, and the trail of what it did.
 *
 * THE TRAIL SHOWS SKIPS, NOT JUST SENDS. A list of messages sent looks tidy and
 * cannot answer the question actually asked when something seems wrong — why
 * wasn't this person contacted. Every client the agent considered appears, with
 * the reason it passed them over.
 */

const REASON_LABEL: Record<string, string> = {
  agent_disabled: "Agent is switched off",
  outside_send_window: "Outside sending hours",
  daily_cap_reached: "Daily cap reached",
  no_consented_channel: "No consented channel",
  email_sending_off: "Email sending is off",
  recently_contacted: "Contacted recently",
  set_aside_by_note: "Set aside by a note",
  send_failed: "Send failed",
  no_settings: "Not configured",
};

const DECISION_CHIP: Record<string, string> = {
  sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  would_send: "bg-indigo-50 text-indigo-700 border-indigo-200",
  skipped: "bg-slate-100 text-slate-600 border-slate-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  run_halted: "bg-amber-50 text-amber-800 border-amber-200",
};

function hourLabel(h: number) {
  const am = h < 12;
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}${am ? "am" : "pm"}`;
}

export function AgentControls({ settings, runs }: { settings: AgentSettings; runs: AuditRun[] }) {
  const router = useRouter();
  const [enabled, setEnabled] = React.useState(settings.enabled);
  const [dryRun, setDryRun] = React.useState(settings.dryRun);
  const [dailyCap, setDailyCap] = React.useState(settings.dailyCap);
  const [channels, setChannels] = React.useState(settings.channels);
  const [startHour, setStartHour] = React.useState(settings.window.startHour);
  const [endHour, setEndHour] = React.useState(settings.window.endHour);
  const [busy, setBusy] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [openRun, setOpenRun] = React.useState<string | null>(runs[0]?.runId ?? null);

  const dirty =
    enabled !== settings.enabled ||
    dryRun !== settings.dryRun ||
    dailyCap !== settings.dailyCap ||
    channels !== settings.channels ||
    startHour !== settings.window.startHour ||
    endHour !== settings.window.endHour;

  async function save() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const r = await saveAgentSettings({ enabled, dryRun, dailyCap, channels, startHour, endHour });
    setBusy(false);
    if (r.ok) {
      setMsg("Saved.");
      router.refresh();
    } else setErr(r.error);
  }

  async function runNow() {
    setRunning(true);
    setErr(null);
    setMsg(null);
    const r = await runAgentNow();
    setRunning(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    const x = r.result;
    setMsg(
      x.halted
        ? `Run halted: ${REASON_LABEL[x.haltReason ?? ""] ?? x.haltReason}.`
        : `${x.dryRun ? "Dry run" : "Live run"} — ${x.dryRun ? x.wouldSend : x.sent} ${x.dryRun ? "would send" : "sent"}, ${x.skipped} skipped, ${x.failed} failed.`,
    );
    router.refresh();
  }

  const live = enabled && !dryRun;

  return (
    <div className="mb-6 bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-[13px] font-black uppercase tracking-widest text-slate-700 flex items-center gap-1.5">
            <Power className={`w-3.5 h-3.5 ${live ? "text-emerald-600" : "text-slate-400"}`} />
            Autonomous sending
          </h2>
          <p className="text-[12px] text-slate-500 mt-0.5">
            {!enabled
              ? "Off. Nothing sends; the queue is yours to work by hand."
              : dryRun
                ? "On, in dry run. It picks who it would message and logs it — but sends nothing."
                : `LIVE. It sends on its own between ${hourLabel(startHour)} and ${hourLabel(endHour)} Eastern.`}
          </p>
        </div>

        <button
          type="button"
          onClick={runNow}
          disabled={running}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700 border border-slate-200 hover:border-slate-300 bg-white rounded-md px-3 py-2 disabled:opacity-50"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Run now
        </button>
      </div>

      {live && (
        <p className="text-[12px] text-red-800 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 mb-3 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-px" />
          <span>
            <strong>This is live.</strong> Real messages go to real clients without you seeing them
            first. Turning <em>Dry run</em> back on stops that immediately.
          </span>
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <label className="flex items-center gap-2 text-[13px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span>
            <strong>Agent enabled</strong>
            <span className="block text-[11px] text-slate-500">The kill switch. Off means no runs at all.</span>
          </span>
        </label>

        <label className="flex items-center gap-2 text-[13px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
          <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
          <span>
            <strong>Dry run</strong>
            <span className="block text-[11px] text-slate-500">Decides and logs, sends nothing.</span>
          </span>
        </label>

        <label className="text-[13px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
          <strong>Most per day</strong>
          <input
            type="number"
            min={0}
            max={50}
            value={dailyCap}
            onChange={(e) => setDailyCap(Number(e.target.value))}
            className="ml-2 w-16 text-[13px] border border-slate-200 rounded px-2 py-1"
          />
          <span className="block text-[11px] text-slate-500 mt-0.5">
            The blast radius if something goes wrong.
          </span>
        </label>

        <label className="text-[13px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
          <strong>Channels</strong>
          <select
            value={channels}
            onChange={(e) => setChannels(e.target.value as typeof channels)}
            className="ml-2 text-[13px] border border-slate-200 rounded px-2 py-1"
          >
            <option value="sms">SMS only</option>
            <option value="sms_and_email">SMS and email</option>
          </select>
          <span className="block text-[11px] text-slate-500 mt-0.5">
            Rebooking is a phone behaviour; email is the weaker half.
          </span>
        </label>
      </div>

      <div className="text-[13px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 mb-3">
        <Clock className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5 text-slate-400" />
        <strong>Only send between</strong>
        <select
          value={startHour}
          onChange={(e) => setStartHour(Number(e.target.value))}
          className="mx-1.5 text-[13px] border border-slate-200 rounded px-2 py-1"
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {hourLabel(h)}
            </option>
          ))}
        </select>
        and
        <select
          value={endHour}
          onChange={(e) => setEndHour(Number(e.target.value))}
          className="mx-1.5 text-[13px] border border-slate-200 rounded px-2 py-1"
        >
          {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => (
            <option key={h} value={h}>
              {hourLabel(h % 24)}
            </option>
          ))}
        </select>
        <span className="text-slate-500">Eastern — daylight saving handled automatically.</span>
      </div>

      {(msg || err) && (
        <p
          className={`text-[12px] rounded-md px-3 py-2 mb-3 ${err ? "text-red-700 bg-red-50 border border-red-200" : "text-emerald-800 bg-emerald-50 border border-emerald-200"}`}
        >
          {err ?? msg}
        </p>
      )}

      {dirty && (
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 rounded-md px-3.5 py-2 disabled:opacity-50 mb-3"
        >
          {busy && <Loader2 className="w-3 h-3 animate-spin" />}
          Save settings
        </button>
      )}

      <div className="border-t border-slate-100 pt-3">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
          What it did — every decision, including the skips
        </h3>

        {runs.length === 0 ? (
          <p className="text-[12px] text-slate-500">No runs yet.</p>
        ) : (
          <div className="space-y-1.5">
            {runs.map((run) => (
              <div key={run.runId} className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenRun(openRun === run.runId ? null : run.runId)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                >
                  <span className="text-[12px] text-slate-500 tabular-nums">
                    {new Date(run.at).toLocaleString("en-US", { timeZone: "America/New_York" })}
                  </span>
                  <span className="text-[12px] text-slate-700 flex-1">
                    {run.halted ? (
                      <span className="text-amber-800">
                        halted — {REASON_LABEL[run.haltReason ?? ""] ?? run.haltReason}
                      </span>
                    ) : (
                      <>
                        {run.sent > 0 && <strong className="text-emerald-700">{run.sent} sent</strong>}
                        {run.wouldSend > 0 && <strong className="text-indigo-700">{run.wouldSend} would send</strong>}
                        {(run.sent > 0 || run.wouldSend > 0) && run.skipped > 0 && ", "}
                        {run.skipped > 0 && `${run.skipped} skipped`}
                        {run.failed > 0 && <strong className="text-red-700">, {run.failed} failed</strong>}
                      </>
                    )}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openRun === run.runId ? "rotate-180" : ""}`}
                  />
                </button>

                {openRun === run.runId && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {run.decisions.map((d) => (
                      <div key={d.id} className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider border rounded px-1.5 py-0.5 ${DECISION_CHIP[d.decision]}`}
                          >
                            {d.decision.replace("_", " ")}
                          </span>
                          {d.clientName && (
                            <span className="text-[13px] font-bold text-slate-900">{d.clientName}</span>
                          )}
                          {d.channel && <span className="text-[11px] text-slate-500">{d.channel}</span>}
                          {d.daysOverdue != null && (
                            <span className="text-[11px] text-slate-500">{d.daysOverdue}d late</span>
                          )}
                          {d.reason && (
                            <span className="text-[11px] text-slate-600">
                              {REASON_LABEL[d.reason] ?? d.reason}
                            </span>
                          )}
                        </div>
                        {d.messageBody && (
                          <p className="mt-1 text-[12px] text-slate-600 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 whitespace-pre-wrap">
                            {d.messageBody}
                          </p>
                        )}
                        {d.error && <p className="mt-1 text-[11px] text-red-700">{d.error}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
