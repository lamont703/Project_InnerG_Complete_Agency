"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send, X, Loader2, Zap, ZapOff, MessageCircle, Copy } from "lucide-react";
import { sendDraftReply, discardDraft, setAutoReply, markCopied } from "@/app/admin/comment-engagement/actions";
import { COMMENT_MAX_CHARS } from "@/lib/instagram-comments";

/**
 * Drafts, editable, with the Send button — and the switch that eventually makes
 * this page unnecessary.
 *
 * THE TEXT IS EDITABLE ON PURPOSE. Reading a draft and being unable to fix one
 * word means either sending something slightly wrong or discarding a reply that
 * was almost right. The edit goes with the send, so what is approved is exactly
 * what posts.
 *
 * THE DM HALF IS SHOWN BUT NOT EDITABLE HERE. It is the one private message
 * Instagram ever allows to that person, and it exists only to carry a link the
 * public reply is not allowed to have. Editing prose is low-stakes; quietly
 * changing which URL somebody receives is not.
 */

export interface DraftRow {
  commentId: string;
  platform: "instagram" | "tiktok";
  username: string | null;
  commentText: string;
  replyText: string | null;
  dmText: string | null;
  priorComments: number;
  firstTime: boolean;
}

export function AutoReplySwitch({ enabled, changedBy, changedAt }: { enabled: boolean; changedBy: string | null; changedAt: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const toggle = async () => {
    setBusy(true);
    await setAutoReply(!enabled);
    setBusy(false);
    router.refresh();
  };

  return (
    <div className={`rounded-2xl border p-5 mb-8 ${enabled ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-black text-slate-900">
            {enabled ? <Zap className="h-4 w-4 text-emerald-700" /> : <ZapOff className="h-4 w-4 text-slate-400" />}
            {enabled ? "Auto-reply is ON" : "Auto-reply is OFF"}
          </p>
          <p className="mt-1 text-xs text-slate-600 max-w-xl">
            {enabled
              ? "The agent posts its reply the moment a comment arrives. Nothing waits for you. Drafts below are ones written before this was switched on."
              : "The agent writes a reply and waits. Nothing is posted until you press Send."}
          </p>
          {changedBy && changedAt && (
            <p className="mt-1 text-[11px] text-slate-400">
              Last changed by {changedBy} on {new Date(changedAt).toLocaleString()}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50 ${
            enabled
              ? "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
              : "bg-slate-900 text-white hover:bg-slate-800"
          }`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : enabled ? "Turn off" : "Turn on"}
        </button>
      </div>
    </div>
  );
}

function Draft({ row }: { row: DraftRow }) {
  const router = useRouter();
  const [text, setText] = React.useState(row.replyText ?? "");
  const [busy, setBusy] = React.useState<null | "send" | "discard">(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  /*
   * Copy, then record it as handed over. Marked 'copied' rather than 'replied'
   * because nothing was sent from here — whoever pastes it is the one who
   * replied, and a status claiming otherwise would make the queue look clear
   * while a TikTok comment sat unanswered.
   */
  const copyAndMark = async () => {
    setBusy("send");
    setError(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError("Could not copy — select the text above and copy it manually.");
    }
    const r = await markCopied(row.commentId);
    setBusy(null);
    if (!r.ok) setError(r.error ?? "Could not update.");
    router.refresh();
  };

  const over = text.length > COMMENT_MAX_CHARS;

  const send = async () => {
    setBusy("send");
    setError(null);
    const r = await sendDraftReply(row.commentId, text);
    setBusy(null);
    if (!r.ok) setError(r.error ?? "Could not send.");
    router.refresh();
  };

  const discard = async () => {
    setBusy("discard");
    await discardDraft(row.commentId);
    setBusy(null);
    router.refresh();
  };

  return (
    <li className="rounded-2xl border border-indigo-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-3 text-xs">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
          {row.platform}
        </span>
        <span className="font-bold text-slate-900">@{row.username ?? "unknown"}</span>
        <span className="text-slate-400">
          {row.firstTime ? "first time" : `${row.priorComments + 1} comments`}
        </span>
      </div>

      <p className="text-sm text-slate-700 mb-3 pl-3 border-l-2 border-slate-200">{row.commentText}</p>

      <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">
        Draft reply — edit before sending
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
      <p className={`mt-1 text-[11px] ${over ? "text-rose-700 font-bold" : "text-slate-400"}`}>
        {text.length}/{COMMENT_MAX_CHARS}
        {over && " — will be trimmed to fit"}
      </p>

      {row.dmText && (
        <p className="mt-3 text-xs text-indigo-700 flex items-start gap-1.5">
          <Send className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Also sends this by DM (the one message Instagram allows):{" "}
            <span className="text-slate-600">{row.dmText}</span>
          </span>
        </p>
      )}

      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}

      {/*
        ONE SEND BUTTON FOR BOTH PLATFORMS. Instagram posts through the Graph
        API, TikTok through GoHighLevel — the action picks the route from
        row.platform, and the person approving does not need to care which.
      */}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={send}
          disabled={busy !== null || !text.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send reply
        </button>
        <button
          type="button"
          onClick={discard}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          Discard
        </button>
      </div>
    </li>
  );
}

export function CommentDraftList({ drafts }: { drafts: DraftRow[] }) {
  if (!drafts.length) {
    return (
      <p className="text-sm text-slate-500 mb-12 inline-flex items-center gap-2">
        <MessageCircle className="h-4 w-4" />
        No drafts waiting. The agent writes one each time somebody comments.
      </p>
    );
  }
  return (
    <section className="mb-12">
      <h2 className="mb-1 text-sm font-black uppercase tracking-widest text-indigo-700">
        Waiting for you ({drafts.length})
      </h2>
      <p className="mb-4 text-xs text-slate-500">
        Nothing here has been posted. Edit anything that is not quite right, then send.
      </p>
      <ul className="space-y-4">
        {drafts.map((d) => (
          <Draft key={d.commentId} row={d} />
        ))}
      </ul>
    </section>
  );
}
