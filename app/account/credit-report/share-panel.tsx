"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Loader2, Share2, Ban } from "lucide-react";
import type { Share } from "@/lib/credit-report/store";
import { createShareAction, revokeShareAction } from "./actions";

/**
 * The control that makes "you decide who sees this" a real thing rather than a
 * sentence on a marketing page.
 *
 * WHAT IS SHOWN FOR EACH LINK IS DELIBERATE: who it was for, when it dies, and
 * how many times it has been opened. A share you cannot audit is a share you
 * have not really kept control of — if a link is being opened weekly by a shop
 * you interviewed with in March, the owner of that record should be able to see
 * it and kill it.
 */
export function SharePanel({ shares, origin }: { shares: Share[]; origin: string }) {
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [days, setDays] = useState(30);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const live = shares.filter((s) => !s.revokedAt && new Date(s.expiresAt).getTime() > Date.now());
  const dead = shares.filter((s) => s.revokedAt || new Date(s.expiresAt).getTime() <= Date.now());

  const create = () => {
    setError(null);
    startTransition(async () => {
      const res = await createShareAction(label, days);
      if (res.ok) setLabel("");
      else setError(res.error ?? "Could not create that link.");
    });
  };

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${origin}/credit-report/${token}`);
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Could not copy — long-press the link to copy it manually.");
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <Share2 className="h-4 w-4 text-slate-400" />
        Share your report
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
        Create a link when a shop asks for a reference. Anyone with the link can read the report
        until it expires or you revoke it — so send it to a person, not a group chat.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1 space-y-1.5">
          <label htmlFor="share-label" className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Who is it for?
          </label>
          <input
            id="share-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Northside Barber Co."
            className="w-full rounded-xl border-2 border-slate-100 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="share-days" className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Expires in
          </label>
          <select
            id="share-days"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-xl border-2 border-slate-100 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500"
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
        <button
          onClick={create}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Create link
        </button>
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}

      {live.length > 0 && (
        <ul className="mt-6 space-y-3">
          {live.map((s) => (
            <li key={s.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{s.label || "Untitled link"}</p>
                  <p className="mt-0.5 break-all font-mono text-xs text-slate-500">
                    {origin}/credit-report/{s.token}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Expires {new Date(s.expiresAt).toLocaleDateString()} · opened {s.viewCount}{" "}
                    {s.viewCount === 1 ? "time" : "times"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => copy(s.token)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    {copied === s.token ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === s.token ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={() => startTransition(async () => { await revokeShareAction(s.id); })}
                    disabled={pending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Revoke
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {dead.length > 0 && (
        <p className="mt-4 text-xs text-slate-500">
          {dead.length} expired or revoked {dead.length === 1 ? "link" : "links"}, no longer readable.
        </p>
      )}
    </section>
  );
}
