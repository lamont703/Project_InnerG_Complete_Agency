"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageSquare, Send, Check, AlertTriangle, Clock, Sparkles, RotateCw, X, Save } from "lucide-react";
import type { OutreachSuggestion } from "@/lib/admin/member-outreach";
import { sendOutreach, saveDraftEdit, dismissDraft, regenerateDraft } from "@/app/admin/member-outreach/actions";

/**
 * Drafted messages, one card each, editable before they go.
 *
 * THE TEXTAREA IS THE POINT. A read-only list with a send button is a campaign
 * tool wearing a review step — nobody edits what they cannot edit, and the
 * drafts would go out verbatim within a week. Making the copy the primary
 * editable surface is what keeps a human actually in the loop.
 *
 * A SENT CARD STAYS PUT rather than vanishing. Disappearing on success gives no
 * chance to read what was actually sent, and on a list where several are sent
 * in a row it makes it genuinely hard to tell which ones went.
 */
export function OutreachBoard({ suggestions }: { suggestions: OutreachSuggestion[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = React.useState<Record<string, string>>(
    () => Object.fromEntries(suggestions.map((s) => [s.memberId + s.signal, s.draft]))
  );
  const [state, setState] = React.useState<Record<string, "idle" | "sending" | "sent" | string>>({});

  if (suggestions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-bold text-slate-700">Nobody to reach out to.</p>
        <p className="mt-1 text-xs text-slate-500">
          Everyone is either recently contacted, has nothing outstanding, or is a student.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {suggestions.map((s) => {
        const key = s.memberId + s.signal;
        const status = state[key] ?? "idle";
        const Icon = s.channel === "sms" ? MessageSquare : Mail;
        return (
          <div key={key} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-black text-slate-900">{s.name}</p>
                <p className="text-[11px] text-slate-500">{s.reason}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  <Icon className="h-3 w-3" />
                  {s.channel}
                </span>
                {/* Whether a model wrote this or quota was out. A fallback draft
                    must never be mistaken for a considered one. */}
                <span
                  title={s.origin === "ai" ? "Written for this member" : "Fallback template — generation was unavailable"}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    s.origin === "ai"
                      ? "border-indigo-100 bg-indigo-50 text-indigo-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  {s.origin === "ai" ? (s.edited ? "edited" : "written") : "template"}
                </span>
              </div>
            </div>

            {s.lastOutreachAt && (
              <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-slate-400">
                <Clock className="h-3 w-3" />
                last contacted {new Date(s.lastOutreachAt).toLocaleDateString()}
              </p>
            )}

            {s.subject && (
              <p className="mt-3 text-[11px] font-bold text-slate-700">Subject: {s.subject}</p>
            )}

            <textarea
              value={drafts[key] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
              rows={s.channel === "email" ? 7 : 4}
              disabled={status === "sent"}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px] leading-relaxed text-slate-800 disabled:opacity-60"
            />

            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400">
                  {s.channel === "sms" ? s.phone || s.contactId : s.email}
                </span>
                {status !== "sent" && (
                  <>
                    {(drafts[key] ?? "") !== s.draft && (
                      <button
                        type="button"
                        onClick={async () => {
                          await saveDraftEdit({ memberId: s.memberId, signal: s.signal, channel: s.channel, body: drafts[key] ?? "", subject: s.subject });
                          router.refresh();
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-slate-900"
                      >
                        <Save className="h-3 w-3" /> keep edit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        setState((v) => ({ ...v, [key]: "sending" }));
                        await regenerateDraft({ memberId: s.memberId, signal: s.signal });
                        router.refresh();
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-slate-900"
                    >
                      <RotateCw className="h-3 w-3" /> rewrite
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await dismissDraft({ memberId: s.memberId, signal: s.signal });
                        router.refresh();
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-rose-700"
                    >
                      <X className="h-3 w-3" /> not now
                    </button>
                  </>
                )}
              </div>

              {status === "sent" ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                  <Check className="h-3.5 w-3.5" /> Sent
                </span>
              ) : (
                <button
                  type="button"
                  disabled={status === "sending"}
                  onClick={async () => {
                    setState((v) => ({ ...v, [key]: "sending" }));
                    const res = await sendOutreach({
                      memberId: s.memberId,
                      signal: s.signal,
                      channel: s.channel,
                      message: drafts[key] ?? s.draft,
                      subject: s.subject,
                      contactId: s.contactId,
                      phone: s.phone,
                      email: s.email,
                      name: s.name,
                    });
                    if (res.ok) {
                      setState((v) => ({ ...v, [key]: "sent" }));
                      router.refresh();
                    } else {
                      setState((v) => ({ ...v, [key]: res.error }));
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {status === "sending" ? "Sending…" : "Send"}
                </button>
              )}
            </div>

            {typeof status === "string" && !["idle", "sending", "sent"].includes(status) && (
              <p className="mt-2 inline-flex items-start gap-1 text-[11px] text-rose-700">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {status}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
