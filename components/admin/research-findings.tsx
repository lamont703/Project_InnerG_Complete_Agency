"use client";

import React from "react";
import { Loader2, Play, Check, X, ChevronDown, FlaskConical, Inbox, ListPlus} from "lucide-react";
import type { ResearchFinding, ResearchAgent } from "@/lib/research/types";
import type { AgentStats } from "@/lib/research/store";
import { useRouter } from "next/navigation";

/**
 * The findings log, shared by both research agents.
 *
 * EVIDENCE IS SHOWN, NOT HIDDEN BEHIND THE SUGGESTION. Every finding expands to
 * the raw numbers it was reasoned from, because the whole claim of these agents
 * is that they researched rather than guessed — and that claim is only worth
 * anything if it can be checked. A suggestion whose evidence looks thin should
 * be visibly thin.
 *
 * Actioned / Dismissed are the only signal that separates a useful agent from a
 * busy one, so they are one click and always present.
 */

const CONFIDENCE_CHIP: Record<string, string> = {
  high: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_CHIP: Record<string, string> = {
  new: "bg-indigo-50 text-indigo-700 border-indigo-200",
  actioned: "bg-emerald-50 text-emerald-700 border-emerald-200",
  dismissed: "bg-slate-100 text-slate-500 border-slate-200",
};

type Filter = "new" | "all" | "actioned" | "dismissed";

export function ResearchFindingsPanel({
  agent,
  findings,
  stats,
  runAction,
  statusAction,
  queueAction,
  emptyHint,
}: {
  agent: ResearchAgent;
  findings: ResearchFinding[];
  stats: AgentStats;
  runAction: () => Promise<{ ok: boolean; found?: number; error?: string }>;
  statusAction: (id: string, status: "actioned" | "dismissed" | "new") => Promise<{ ok: boolean; error?: string }>;
  /**
   * Optional, because this panel is shared with the CRM agent and a CRM
   * finding has nowhere to be queued. Present only for content findings.
   */
  queueAction?: (id: string) => Promise<{ ok: boolean; error?: string }>;
  emptyHint: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<Filter>("new");
  const [open, setOpen] = React.useState<string | null>(null);
  const [working, setWorking] = React.useState<string | null>(null);

  async function go() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const r = await runAction();
    setBusy(false);
    if (!r.ok) {
      setErr(r.error ?? "Run failed.");
      return;
    }
    setMsg(
      r.found === 0
        ? "Ran, and found nothing worth reporting — that's a valid answer, not a failure."
        : `Found ${r.found} new suggestion${r.found === 1 ? "" : "s"}.`,
    );
    router.refresh();
  }

  async function queue(id: string) {
    if (!queueAction) return;
    setWorking(id);
    setErr(null);
    setMsg(null);
    const r = await queueAction(id);
    setWorking(null);
    if (!r.ok) { setErr(r.error ?? "Could not queue it."); return; }
    setMsg("Queued. It is at the back of the line and waiting on a video.");
    router.refresh();
  }

  async function mark(id: string, status: "actioned" | "dismissed" | "new") {
    setWorking(id);
    const r = await statusAction(id, status);
    setWorking(null);
    if (!r.ok) setErr(r.error ?? "Could not update.");
    else router.refresh();
  }

  const shown = findings.filter((f) => (filter === "all" ? true : f.status === filter));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="grid grid-cols-4 gap-2 flex-1 min-w-[280px]">
          {[
            { label: "Open", value: stats.open },
            { label: "Actioned", value: stats.actioned },
            { label: "Dismissed", value: stats.dismissed },
            { label: "Total", value: stats.total },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-lg px-3 py-2">
              <div className="text-lg font-black tabular-nums text-slate-900">{s.value}</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={go}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 rounded-md px-4 py-2.5 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {busy ? "Researching…" : "Run research"}
        </button>
      </div>

      {(msg || err) && (
        <p
          className={`text-[12px] rounded-md px-3 py-2 mb-4 ${err ? "text-red-700 bg-red-50 border border-red-200" : "text-emerald-800 bg-emerald-50 border border-emerald-200"}`}
        >
          {err ?? msg}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-3">
        {(["new", "actioned", "dismissed", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`text-[11px] font-bold uppercase tracking-wider rounded-full px-3 py-1.5 border transition-colors ${
              filter === f
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {f === "new" ? "Open" : f}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-12 text-center">
          <Inbox className="w-7 h-7 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            {findings.length === 0 ? emptyHint : `Nothing ${filter === "new" ? "open" : filter}.`}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {shown.map((f) => (
            <div key={f.id} className="border-b border-slate-100 last:border-b-0">
              <button
                type="button"
                onClick={() => setOpen(open === f.id ? null : f.id)}
                className="w-full text-left px-4 sm:px-5 py-4 hover:bg-slate-50/80 transition-colors flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900 text-[15px]">{f.title}</span>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider border rounded px-1.5 py-0.5 ${CONFIDENCE_CHIP[f.confidence]}`}
                    >
                      {f.confidence}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider border rounded px-1.5 py-0.5 ${STATUS_CHIP[f.status]}`}
                    >
                      {f.status}
                    </span>
                    {f.category && (
                      <span className="text-[10px] text-slate-400 font-mono">{f.category}</span>
                    )}
                  </div>
                  <p className="text-[13px] text-slate-600">{f.suggestion}</p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform ${open === f.id ? "rotate-180" : ""}`}
                />
              </button>

              {open === f.id && (
                <div className="px-4 sm:px-5 pb-5 -mt-1 space-y-3">
                  {f.rationale && (
                    <p className="text-[13px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
                      {f.rationale}
                    </p>
                  )}

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1.5">
                      <FlaskConical className="w-3 h-3" />
                      What it looked at
                    </p>
                    <pre className="text-[11px] text-slate-700 bg-slate-900/[0.03] border border-slate-200 rounded-lg px-3 py-2.5 overflow-x-auto">
                      {JSON.stringify(f.evidence, null, 2)}
                    </pre>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {queueAction && f.status === "new" && (
                      <button
                        type="button"
                        disabled={working === f.id}
                        onClick={() => queue(f.id)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-md px-3 py-1.5 disabled:opacity-50"
                      >
                        {working === f.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ListPlus className="w-3 h-3" />}
                        Queue it
                      </button>
                    )}
                    {f.status !== "actioned" && (
                      <button
                        type="button"
                        disabled={working === f.id}
                        onClick={() => mark(f.id, "actioned")}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 rounded-md px-3 py-1.5 disabled:opacity-50"
                      >
                        {working === f.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        I did this
                      </button>
                    )}
                    {f.status !== "dismissed" && (
                      <button
                        type="button"
                        disabled={working === f.id}
                        onClick={() => mark(f.id, "dismissed")}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 border border-slate-200 bg-white rounded-md px-3 py-1.5 disabled:opacity-50"
                      >
                        <X className="w-3 h-3" />
                        Not useful
                      </button>
                    )}
                    {f.status !== "new" && (
                      <button
                        type="button"
                        disabled={working === f.id}
                        onClick={() => mark(f.id, "new")}
                        className="text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 px-2"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-[11px] text-slate-400">
        {agent === "content" ? "Content" : "CRM"} research runs on demand. Every suggestion carries
        the numbers it came from — if the evidence looks thin, it is.
      </p>
    </div>
  );
}
