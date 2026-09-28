"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Undo2, Send, Trash2, ShieldOff, Bot, Globe, History } from "lucide-react";

/**
 * Change history for the owner's Google profile.
 *
 * Every button here acts on the LIVE listing or on a credential, so each one
 * asks twice: the first click turns it into a "Confirm" button, the second
 * does it. Inline rather than a browser dialog, because the owner is most
 * likely here from an email on their phone.
 *
 * The row named in the URL hash is scrolled to and outlined — the email links
 * to /account/changes#<id>, and an owner who tapped "undo this change" should
 * not have to find it in a list.
 */

interface Change {
  id: string;
  status: "pending" | "approved" | "applied" | "failed" | "rejected" | "reverted" | "expired";
  title: string;
  lines: string[];
  via: "claude" | "website";
  connection: { id: string | null; label: string | null; keyPrefix: string; revoked: boolean } | null;
  createdAt: string;
  appliedAt: string | null;
  error: string | null;
  scheduled: boolean;
  canPublish: boolean;
  canDiscard: boolean;
  canUndo: boolean;
  undoNote: string | null;
}

const STATUS: Record<Change["status"], { label: string; cls: string }> = {
  pending: { label: "Draft", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  approved: { label: "Publishing", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  applied: { label: "Live", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed: { label: "Failed", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  rejected: { label: "Discarded", cls: "bg-slate-100 text-slate-500 border-slate-200" },
  reverted: { label: "Undone", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  expired: { label: "Expired draft", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

const stamp = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

type Pending = { id: string; action: "publish" | "undo" | "discard" | "revoke" } | null;

export function GbpChangeHistory() {
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Pending>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/account/gbp-changes", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) setError(json.error || "Could not load your changes.");
      else { setChanges(json.changes || []); setError(null); }
    } catch {
      setError("Could not load your changes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Deep link from the notification email.
  useEffect(() => {
    if (loading) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    setFocus(id);
    document.getElementById(`change-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [loading]);

  const act = async (change: Change, action: "publish" | "undo" | "discard" | "revoke") => {
    if (confirming?.id !== change.id || confirming.action !== action) {
      setConfirming({ id: change.id, action });
      return;
    }
    setConfirming(null);
    setBusy(change.id);
    try {
      if (action === "revoke") {
        const res = await fetch(`/api/account/mcp-keys?id=${encodeURIComponent(change.connection?.id || "")}`, {
          method: "DELETE", credentials: "include",
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        toast.success("Connection revoked. It stopped working immediately.");
      } else {
        const res = await fetch("/api/account/gbp-changes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, id: change.id }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || json.error || "That didn't work.");
        toast.success(
          action === "publish" ? "Published. Google can take a few minutes to show it."
            : action === "undo" ? "Undone. Google can take a few minutes to show it."
              : "Draft discarded."
        );
      }
      await load();
    } catch (e: any) {
      toast.error(e.message || "That didn't work.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading your changes…</p>;
  }
  if (error) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900">{error}</div>;
  }
  if (!changes.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        <History className="mb-2 h-5 w-5 text-slate-400" />
        No changes yet. Anything you or your Claude connection change on your Google profile will show up here.
      </div>
    );
  }

  const button = (change: Change, action: "publish" | "undo" | "discard" | "revoke", label: string, Icon: any, tone: string) => {
    const armed = confirming?.id === change.id && confirming.action === action;
    return (
      <button
        onClick={() => act(change, action)}
        disabled={busy === change.id}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black transition disabled:opacity-40 ${
          armed ? "bg-slate-900 text-white" : tone
        }`}
      >
        {busy === change.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
        {armed ? `Confirm ${label.toLowerCase()}` : label}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {changes.map((c) => {
        const st = STATUS[c.status] || STATUS.pending;
        return (
          <article
            key={c.id}
            id={`change-${c.id}`}
            className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${focus === c.id ? "border-slate-900 ring-2 ring-slate-900" : "border-slate-200"}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-black text-slate-900">{c.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  {c.via === "claude" ? <Bot className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                  {c.via === "claude"
                    ? `From Claude · ${c.connection?.label || "connection"} (${c.connection?.keyPrefix}…)${c.connection?.revoked ? " · revoked" : ""}`
                    : "On the website"}
                  <span>· {stamp(c.appliedAt || c.createdAt)}</span>
                  {c.scheduled && <span>· scheduled post</span>}
                </p>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${st.cls}`}>
                {st.label}
              </span>
            </div>

            {c.lines.length > 0 && (
              <div className="mt-3 space-y-1 rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                {c.lines.map((l, i) => <p key={i} className="break-words">{l}</p>)}
              </div>
            )}

            {c.status === "failed" && c.error && (
              <p className="mt-3 text-xs font-semibold text-rose-700">Google refused it: {c.error}</p>
            )}
            {c.undoNote && <p className="mt-3 text-xs text-slate-500">{c.undoNote}</p>}

            {(c.canPublish || c.canUndo || c.canDiscard || (c.connection?.id && !c.connection.revoked)) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {c.canPublish && button(c, "publish", "Publish", Send, "bg-emerald-700 text-white hover:bg-emerald-800")}
                {c.canUndo && button(c, "undo", "Undo", Undo2, "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50")}
                {c.canDiscard && button(c, "discard", "Discard", Trash2, "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50")}
                {c.connection?.id && !c.connection.revoked &&
                  button(c, "revoke", "Revoke this connection", ShieldOff, "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100")}
              </div>
            )}
          </article>
        );
      })}
      <p className="pt-2 text-xs text-slate-500">
        Manage your Claude connections at{" "}
        <Link href="/account/claude" className="font-bold text-primary hover:underline">/account/claude</Link>.
      </p>
    </div>
  );
}
