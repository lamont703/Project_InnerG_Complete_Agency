"use client";

import { useMemo, useState } from "react";
import {
  MessageSquare, Mail, Search, Send, AlertTriangle, Ban,
  CheckCheck, Clock, Eye, XCircle, User, Phone, Tag, ShieldCheck, ShieldAlert, ShieldQuestion,
} from "lucide-react";
import { MOCK_THREADS } from "@/lib/conversations/mock";
import { smsSegments, canSend } from "@/lib/conversations/types";
import type { Channel, DeliveryStatus, Message, Thread } from "@/lib/conversations/types";

/**
 * The Conversations screen. PROTOTYPE — the composer never calls a provider.
 *
 * THE COMPOSER CHANGES SHAPE WITH THE CHANNEL, which is the whole reason this
 * is one screen instead of two. Email takes a subject and SMS does not; SMS is
 * billed by segment and email is not; each channel carries its own consent, so
 * the same contact can be writable on one tab and refused on the other. A
 * single "message" box that ignores all three is the design mistake this
 * screen exists to avoid.
 *
 * STATE LIVES HERE AND NOWHERE ELSE for now. When the providers get wired, the
 * thread list becomes a query and `send` becomes a server action — but the
 * shape of what a message IS should not have to change, which is why the mock
 * already carries provider status codes rather than a boolean.
 */

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const mins = (Date.now() - d.getTime()) / 60000;
  if (mins < 1) return "now";
  if (mins < 60) return `${Math.floor(mins)}m`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h`;
  if (mins < 60 * 24 * 7) return `${Math.floor(mins / 1440)}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const fmtPhone = (p?: string) =>
  p && /^\+1\d{10}$/.test(p) ? `(${p.slice(2, 5)}) ${p.slice(5, 8)}-${p.slice(8)}` : (p ?? "—");

const STATUS: Record<DeliveryStatus, { label: string; icon: typeof Clock; cls: string }> = {
  queued:      { label: "Queued",      icon: Clock,     cls: "text-slate-400" },
  sent:        { label: "Sent",        icon: CheckCheck, cls: "text-slate-400" },
  delivered:   { label: "Delivered",   icon: CheckCheck, cls: "text-emerald-600" },
  opened:      { label: "Opened",      icon: Eye,       cls: "text-emerald-600" },
  failed:      { label: "Failed",      icon: XCircle,   cls: "text-red-600" },
  undelivered: { label: "Undelivered", icon: XCircle,   cls: "text-red-600" },
};

const CONSENT = {
  opted_in:  { icon: ShieldCheck,    cls: "text-emerald-700 bg-emerald-50 border-emerald-200", label: "Opted in" },
  opted_out: { icon: ShieldAlert,    cls: "text-red-700 bg-red-50 border-red-200",             label: "Opted out" },
  unknown:   { icon: ShieldQuestion, cls: "text-amber-700 bg-amber-50 border-amber-200",       label: "No consent on file" },
} as const;

export function ConversationsView() {
  const [threads, setThreads] = useState<Thread[]>(MOCK_THREADS);
  const [activeId, setActiveId] = useState(MOCK_THREADS[0].id);
  const [filter, setFilter] = useState<"all" | Channel>("all");
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<Channel>("sms");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const active = threads.find((t) => t.id === activeId)!;
  const gate = canSend(active.contact, channel);
  const seg = useMemo(() => smsSegments(body), [body]);

  const visible = threads.filter((t) => {
    const matchesChannel = filter === "all" || t.messages.some((m) => m.channel === filter);
    const q = query.trim().toLowerCase();
    const matchesQuery = !q
      || t.contact.name.toLowerCase().includes(q)
      || t.messages.some((m) => m.body.toLowerCase().includes(q));
    return matchesChannel && matchesQuery;
  });

  function openThread(id: string) {
    setActiveId(id);
    setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, unread: 0 } : t)));
    setBody("");
    setSubject("");
  }

  function send() {
    if (!gate.ok || !body.trim()) return;
    const msg: Message = {
      id: `local_${Date.now()}`,
      channel,
      direction: "outbound",
      body: body.trim(),
      ...(channel === "email" ? { subject: subject.trim() || "(no subject)" } : {}),
      at: new Date().toISOString(),
      /* Stays queued forever on purpose — nothing is wired, and a fake
         "Delivered" would be the one lie this prototype cannot afford. */
      status: "queued",
      provider: channel === "sms" ? "twilio" : "mailgun",
    };
    setThreads((ts) => ts.map((t) => (t.id === activeId ? { ...t, messages: [...t.messages, msg] } : t)));
    setBody("");
    setSubject("");
  }

  return (
    <div className="grid h-[calc(100vh-13rem)] min-h-[540px] grid-cols-1 overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-[300px_1fr_290px]">

      {/* ---------------- thread list ---------------- */}
      <aside className="flex min-h-0 flex-col border-slate-200 lg:border-r">
        <div className="border-b border-slate-200 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or message"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
            />
          </div>
          <div className="mt-2 flex gap-1">
            {(["all", "sms", "email"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold capitalize transition ${
                  filter === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f === "sms" ? "SMS" : f}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {visible.length === 0 && (
            <p className="p-4 text-sm text-slate-500">No conversations match that.</p>
          )}
          {visible.map((t) => {
            const last = t.messages[t.messages.length - 1];
            const Icon = last.channel === "sms" ? MessageSquare : Mail;
            return (
              <button
                key={t.id}
                onClick={() => openThread(t.id)}
                className={`flex w-full gap-2.5 border-b border-slate-100 p-3 text-left transition hover:bg-slate-50 ${
                  t.id === activeId ? "bg-slate-100" : ""
                }`}
              >
                <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                  {t.contact.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900">{t.contact.name}</span>
                    <span className="shrink-0 text-[11px] text-slate-400">{fmtTime(last.at)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Icon className="h-3 w-3 shrink-0 text-slate-400" />
                    <span className="truncate text-xs text-slate-500">
                      {last.direction === "outbound" ? "You: " : ""}{last.body}
                    </span>
                  </div>
                </div>
                {t.unread > 0 && (
                  <span className="mt-1 grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full bg-sky-600 px-1.5 text-[11px] font-bold text-white">
                    {t.unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* ---------------- conversation ---------------- */}
      <section className="flex min-h-0 flex-col border-slate-200 lg:border-r">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-slate-900">{active.contact.name}</h2>
            <p className="truncate text-xs text-slate-500">
              {fmtPhone(active.contact.phone)} · {active.contact.email ?? "no email"}
            </p>
          </div>
          {active.assignedTo && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {active.assignedTo}
            </span>
          )}
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
          {active.messages.map((m) => {
            const out = m.direction === "outbound";
            const S = STATUS[m.status];
            const SIcon = S.icon;
            return (
              <div key={m.id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] ${out ? "items-end" : "items-start"} flex flex-col`}>
                  <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px] text-slate-400">
                    {m.channel === "sms"
                      ? <MessageSquare className="h-3 w-3" />
                      : <Mail className="h-3 w-3" />}
                    <span className="uppercase tracking-wide">{m.channel}</span>
                    <span>·</span>
                    <span>{fmtTime(m.at)}</span>
                  </div>
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                    out ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-800"
                  }`}>
                    {m.subject && (
                      <p className={`mb-1 border-b pb-1 text-xs font-bold ${
                        out ? "border-white/20 text-white/80" : "border-slate-200 text-slate-500"
                      }`}>
                        {m.subject}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                  </div>
                  {out && (
                    <div className={`mt-1 flex items-center gap-1 px-1 text-[11px] ${S.cls}`}>
                      <SIcon className="h-3 w-3" />
                      <span>{S.label}</span>
                      {m.failureCode && <span className="text-slate-400">· {m.failureCode}</span>}
                    </div>
                  )}
                  {m.failureReason && (
                    <p className="mt-1 max-w-sm rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">
                      {m.failureReason}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ---------------- composer ---------------- */}
        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 flex gap-1">
            {(["sms", "email"] as const).map((c) => {
              const g = canSend(active.contact, c);
              const Icon = c === "sms" ? MessageSquare : Mail;
              return (
                <button
                  key={c}
                  onClick={() => setChannel(c)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    channel === c ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {c === "sms" ? "SMS" : "Email"}
                  {!g.ok && <Ban className="h-3 w-3 text-red-500" />}
                </button>
              );
            })}
          </div>

          {!gate.ok ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <Ban className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Cannot send {channel === "sms" ? "an SMS" : "an email"} to this contact.</p>
                <p className="mt-0.5 text-red-700">{gate.reason}</p>
              </div>
            </div>
          ) : (
            <>
              {channel === "email" && (
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
                />
              )}
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                placeholder={channel === "sms" ? "Write a text message" : "Write an email"}
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="min-w-0 text-[11px] text-slate-500">
                  {channel === "sms" ? (
                    <span className="font-mono">
                      {seg.used} chars · {seg.segments} segment{seg.segments === 1 ? "" : "s"} · {seg.encoding}
                      {seg.segments > 0 && <> · {seg.remaining} left in this segment</>}
                      {seg.forcedBy && (
                        <span className="ml-1 text-amber-700">
                          — “{seg.forcedBy}” forced UCS-2, limit dropped to 70
                        </span>
                      )}
                    </span>
                  ) : (
                    <span>Sends through Mailgun once wired.</span>
                  )}
                </div>
                <button
                  onClick={send}
                  disabled={!body.trim()}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ---------------- contact panel ---------------- */}
      <aside className="hidden min-h-0 flex-col overflow-y-auto p-4 lg:flex">
        <div className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-slate-200 text-lg font-bold text-slate-600">
          {active.contact.name.split(" ").map((n) => n[0]).join("")}
        </div>
        <h3 className="text-base font-bold text-slate-900">{active.contact.name}</h3>

        <dl className="mt-4 space-y-2.5 text-sm">
          <div className="flex items-start gap-2">
            <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <dd className="text-slate-700">{fmtPhone(active.contact.phone)}</dd>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <dd className="break-all text-slate-700">{active.contact.email ?? "—"}</dd>
          </div>
          <div className="flex items-start gap-2">
            <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <dd className="text-slate-700">{active.assignedTo ?? "Unassigned"}</dd>
          </div>
        </dl>

        <h4 className="mt-5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <Tag className="h-3 w-3" /> Tags
        </h4>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {active.contact.tags.map((t) => (
            <span key={t} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{t}</span>
          ))}
        </div>

        <h4 className="mt-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Consent</h4>
        <div className="mt-2 space-y-1.5">
          {([["SMS", active.contact.smsConsent], ["Email", active.contact.emailConsent]] as const).map(([label, status]) => {
            const c = CONSENT[status];
            const CIcon = c.icon;
            return (
              <div key={label} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${c.cls}`}>
                <CIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="font-semibold">{label}</span>
                <span className="ml-auto">{c.label}</span>
              </div>
            );
          })}
        </div>
        {active.contact.consentNote && (
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{active.contact.consentNote}</p>
        )}

        <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>Consent is per channel. Opting out of one does not opt a contact out of the other, and the composer enforces each separately.</span>
        </div>
      </aside>
    </div>
  );
}
