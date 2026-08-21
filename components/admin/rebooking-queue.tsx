"use client";

import React from "react";
import {
  MessageSquare,
  Mail,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  ChevronDown,
  Scissors,
  Ban,
} from "lucide-react";
import type { DueClient } from "@/lib/rebooking/queue";
import { draftMessages } from "@/lib/rebooking/messages";
import { NoteEditor } from "./rebooking-note-editor";
import { NoteReview } from "./rebooking-note-review";

/**
 * The rebooking queue: who is due for a cut, ranked by what the lateness costs.
 *
 * v1 DRAFTS AND DOES NOT SEND. Every message here is copy-to-clipboard for a
 * human to paste and send themselves. That is a deliberate first step, not an
 * unfinished one — the model decides *timing*, and timing is the thing that has
 * to earn trust before anything is allowed to send on its own.
 */

type StatusFilter = "all" | "at_risk" | "overdue" | "due" | "upcoming";

const STATUS_META: Record<
  DueClient["status"],
  { label: string; blurb: string; chip: string; dot: string }
> = {
  at_risk: {
    label: "At risk",
    blurb: "Far past their rhythm — this is churn, not lateness",
    chip: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  overdue: {
    label: "Overdue",
    blurb: "Meaningfully past when they'd normally come in",
    chip: "bg-orange-50 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
  },
  due: {
    label: "Due",
    blurb: "At their usual interval right now",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  upcoming: {
    label: "Due soon",
    blurb: "Within a few days of their next visit",
    chip: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
  },
};

function money(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        });
      }}
      className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 bg-white rounded-md px-2.5 py-1.5 transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}

function ChannelBadge({ client }: { client: DueClient }) {
  if (client.reachableBy === "sms") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
        <MessageSquare className="w-2.5 h-2.5" /> SMS
      </span>
    );
  }
  if (client.reachableBy === "email") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
        <Mail className="w-2.5 h-2.5" /> Email
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
      <Ban className="w-2.5 h-2.5" /> No channel
    </span>
  );
}

function ClientRow({
  client,
  bookingUrl,
  roster,
}: {
  client: DueClient;
  bookingUrl: string;
  roster: { customerId: string; name: string }[];
}) {
  const [open, setOpen] = React.useState(false);
  const meta = STATUS_META[client.status];
  const drafts = draftMessages(client, bookingUrl);
  const shaky = client.regularity < 0.5;

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-4 sm:px-5 py-4 hover:bg-slate-50/80 transition-colors flex items-start gap-4"
      >
        <span className={`mt-2 w-2 h-2 rounded-full shrink-0 ${meta.dot}`} aria-hidden />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="font-bold text-slate-900 text-[15px] truncate">{client.name}</span>
            <span className={`text-[10px] font-black uppercase tracking-wider border rounded-full px-2 py-0.5 ${meta.chip}`}>
              {meta.label}
            </span>
            <ChannelBadge client={client} />
            {client.note?.status === "reduced" && (
              <span
                className="text-[10px] font-bold uppercase tracking-wider text-violet-700 bg-violet-50 border border-violet-200 rounded px-1.5 py-0.5"
                title={
                  client.note.reducedServices
                    ? `Still comes in for: ${client.note.reducedServices}`
                    : "Still a client, off their old rhythm."
                }
              >
                Reduced
              </span>
            )}
            {shaky && (
              <span
                className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5"
                title="Their gaps between visits vary a lot, so the due date is a weak guess."
              >
                Irregular
              </span>
            )}
          </div>

          <div className="mt-1.5 text-[13px] text-slate-600 flex flex-wrap gap-x-4 gap-y-0.5">
            <span>
              Comes about every <strong className="text-slate-900">{client.cadenceDays} days</strong>
              {client.cadenceIsOverridden && (
                <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600" title="You set this, overriding the computed cadence.">
                  your number
                </span>
              )}
            </span>
            <span>
              Last in <strong className="text-slate-900">{client.daysSinceLastVisit}d ago</strong> ({client.lastVisit})
            </span>
            <span>
              {client.daysOverdue >= 0 ? (
                <>
                  <strong className="text-slate-900">{client.daysOverdue}d</strong> past their rhythm
                </>
              ) : (
                <>due in <strong className="text-slate-900">{Math.abs(client.daysOverdue)}d</strong></>
              )}
            </span>
            <span>{client.visits} visits</span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="font-black text-slate-900 tabular-nums">{money(client.annualValue)}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">per year</div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 mt-1.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-4 sm:px-5 pb-5 -mt-1">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-slate-600">
              <span>
                Avg ticket <strong className="text-slate-900">${client.averageTicket.toFixed(2)}</strong>
              </span>
              <span>
                Regularity <strong className="text-slate-900">{Math.round(client.regularity * 100)}%</strong>
              </span>
              {client.email && <span className="truncate">{client.email}</span>}
              {client.phone && <span>{client.phone}</span>}
            </div>

            {client.reachableBy === "none" && (
              <p className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                No consented channel for this client — they have no marketing consent on file for
                email or SMS. Ask in person before adding them.
              </p>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Text message
                </span>
                <CopyButton text={drafts.sms} label="Copy SMS" />
              </div>
              <p className="text-[13px] text-slate-800 bg-white border border-slate-200 rounded-md px-3 py-2.5 whitespace-pre-wrap">
                {drafts.sms}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {drafts.sms.length} characters
                {drafts.smsTooLong && <span className="text-amber-700 font-semibold"> — long, consider trimming</span>}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email</span>
                <CopyButton text={`${drafts.emailSubject}\n\n${drafts.emailBody}`} label="Copy email" />
              </div>
              <p className="text-[13px] font-bold text-slate-900 bg-white border border-slate-200 border-b-0 rounded-t-md px-3 py-2">
                {drafts.emailSubject}
              </p>
              <p className="text-[13px] text-slate-800 bg-white border border-slate-200 rounded-b-md px-3 py-2.5 whitespace-pre-wrap">
                {drafts.emailBody}
              </p>
            </div>

            <NoteEditor client={client} allClients={roster} />
          </div>
        </div>
      )}
    </div>
  );
}

export function RebookingQueue({
  clients,
  modelledClients,
  totalOrders,
  revenueAtRisk,
  setAside,
  recentlyContacted,
  roster,
  returningOnTheirOwn,
  generatedAt,
  bookingUrl,
}: {
  clients: DueClient[];
  modelledClients: number;
  totalOrders: number;
  revenueAtRisk: number;
  setAside: DueClient[];
  recentlyContacted: DueClient[];
  roster: { customerId: string; name: string }[];
  returningOnTheirOwn: number;
  generatedAt: string;
  bookingUrl: string;
}) {
  const [filter, setFilter] = React.useState<StatusFilter>("all");

  // `roster` comes from the server and spans EVERY modelled client, not just
  // the queue. Deriving it here from the visible rows was a real bug: KD
  // Emanuel came in yesterday, so he was never in the queue, so his duplicate
  // "Kedrick Emanuel" had no merge target to point at.

  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: clients.length };
    for (const x of clients) c[x.status] = (c[x.status] ?? 0) + 1;
    return c;
  }, [clients]);

  const shown = filter === "all" ? clients : clients.filter((c) => c.status === filter);
  const smsReach = clients.filter((c) => c.reachableBy === "sms").length;

  // Duplicate client records produce two rhythms for one person and would send
  // them two texts. Surfacing it here because it is a data problem the queue
  // can see but cannot fix on its own.
  const dupes = React.useMemo(() => {
    const seen = new Map<string, number>();
    for (const c of clients) {
      const k = c.name.trim().toLowerCase();
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    return [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
  }, [clients]);

  return (
    <div>
      <NoteReview />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Due now", value: String(clients.length), tone: "text-slate-900" },
          { label: "Revenue at risk", value: money(revenueAtRisk), tone: "text-red-600" },
          { label: "Clients modelled", value: String(modelledClients), tone: "text-slate-900" },
          { label: "Reachable by SMS", value: `${smsReach} of ${clients.length}`, tone: "text-slate-900" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <div className={`text-2xl font-black tabular-nums ${s.tone}`}>{s.value}</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-0.5">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2.5 text-[12px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 mb-5">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
        <p>
          <strong>Nothing here sends.</strong> These are drafts to copy and send yourself. The agent
          decides <em>when</em> someone is due — it does not message anyone.
        </p>
      </div>

      {dupes.length > 0 && (
        <div className="text-[12px] text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-3.5 py-2.5 mb-5">
          <strong>Duplicate client records:</strong> {dupes.join(", ")} — appears more than once
          with separate visit histories, so each copy gets its own rhythm. Open the row and use
          &ldquo;Same person as&rdquo; to hide the duplicate here, then merge properly in Shopify
          when you get a chance.
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-4">
        {(["all", "at_risk", "overdue", "due", "upcoming"] as StatusFilter[]).map((f) => {
          const n = counts[f] ?? 0;
          if (f !== "all" && n === 0) return null;
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`text-[11px] font-bold uppercase tracking-wider rounded-full px-3 py-1.5 border transition-colors ${
                active
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {f === "all" ? "All" : STATUS_META[f as DueClient["status"]].label} ({n})
            </button>
          );
        })}
      </div>

      {filter !== "all" && (
        <p className="text-[12px] text-slate-500 mb-3">
          {STATUS_META[filter as DueClient["status"]].blurb}.
        </p>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {shown.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Scissors className="w-7 h-7 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Nobody is due right now.</p>
          </div>
        ) : (
          shown.map((c) => (
            <ClientRow key={c.customerId} client={c} bookingUrl={bookingUrl} roster={roster} />
          ))
        )}
      </div>

      {recentlyContacted.length > 0 && (
        <details className="mt-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <summary className="px-4 sm:px-5 py-3 cursor-pointer text-[12px] font-bold text-slate-600 hover:bg-slate-50">
            {recentlyContacted.length} recently contacted — resting for now
          </summary>
          <div className="border-t border-slate-100">
            {recentlyContacted.map((c) => (
              <ClientRow key={c.customerId} client={c} bookingUrl={bookingUrl} roster={roster} />
            ))}
          </div>
        </details>
      )}

      {setAside.length > 0 && (
        <details className="mt-3 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <summary className="px-4 sm:px-5 py-3 cursor-pointer text-[12px] font-bold text-slate-600 hover:bg-slate-50">
            {setAside.length} set aside — snoozed, reduced, moved on, or a duplicate
          </summary>
          <div className="border-t border-slate-100">
            {setAside.map((c) => (
              <ClientRow key={c.customerId} client={c} bookingUrl={bookingUrl} roster={roster} />
            ))}
          </div>
        </details>
      )}

      {returningOnTheirOwn > 0 && (
        <p className="mt-4 text-[12px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
          <strong>{returningOnTheirOwn} more</strong> {returningOnTheirOwn === 1 ? "client is" : "clients are"} due
          but not shown — under two weeks late, where this shop&apos;s history says 85–92% come back
          with no message at all. They&apos;re not missed; chasing them spends a message on a
          decision they&apos;ve already made.
        </p>
      )}

      <p className="mt-4 text-[11px] text-slate-400 flex items-center gap-1.5">
        <Clock className="w-3 h-3" />
        Built from {totalOrders.toLocaleString("en-US")} orders · generated{" "}
        {new Date(generatedAt).toLocaleString("en-US")}
      </p>
    </div>
  );
}
