"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ExternalLink, Instagram, Loader2, Plus, Radio, Search } from "lucide-react";

/**
 * The agency publisher board (/account/agency/publisher), built to read like
 * /admin/content-publisher: the connection, the next slots with what goes out
 * in each, the line of Reels in order, the library of ShearQuery videos to add
 * from, and what already posted. Actions go through
 * /api/account/agency/publisher — the same ones the agency's Claude has.
 */

export interface BoardVideo { id: string; ref: string; title: string; type: string | null; videoUrl: string; thumbnailUrl: string | null; publishedAt: string | null; instagramPermalink: string | null }
export interface BoardItem { id: string; ref: string; position: number; status: string; caption: string; video: BoardVideo; instagramPermalink: string | null; error: string | null; publishedAt: string | null }
export interface BoardProps {
  queued: BoardItem[];
  done: BoardItem[];
  slots: { label: string; title: string | null }[];
  settings: { slotHours: number[]; paused: boolean };
  instagram: { connected: boolean; canPublish: boolean; username: string | null; problem: string | null };
  library: BoardVideo[];
}

const SLOTS: { h: number; label: string }[] = [{ h: 9, label: "9 AM" }, { h: 14, label: "2 PM" }, { h: 19, label: "7 PM" }];

async function act(body: Record<string, unknown>) {
  const r = await fetch("/api/account/agency/publisher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(j.error || "That didn't work.");
  return j;
}

export function AgencyPublisherBoard(p: BoardProps) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [editing, setEditing] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");

  const run = async (key: string, body: Record<string, unknown>) => {
    setBusy(key); setError(null);
    try { await act(body); router.refresh(); } catch (e: any) { setError(e.message); } finally { setBusy(null); }
  };

  const lib = p.library.filter((v) => !q || `${v.title} ${v.type ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-10">
      {/* Connection */}
      <section className={`rounded-2xl border p-5 ${p.instagram.canPublish ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-black text-slate-900">
              <Instagram className="h-4 w-4" /> {p.instagram.canPublish ? `Posting to @${p.instagram.username}` : "Instagram not ready to post"}
            </p>
            <p className="mt-1 max-w-xl text-xs text-slate-600">
              {p.instagram.canPublish
                ? "Reels go out to this account at your slots. Nothing is posted anywhere else."
                : `${p.instagram.problem} Until Meta approves ShearQuery's app, your Instagram account has to be added as an Instagram Tester first — ask ShearQuery, then accept the invite in Instagram → Settings → Apps and websites.`}
            </p>
          </div>
          <a href="/api/instagram/member/connect" className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
            {p.instagram.connected ? "Reconnect Instagram" : "Connect Instagram"}
          </a>
        </div>
      </section>

      {/* Schedule */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-black text-slate-900">Posting schedule (Eastern)</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {SLOTS.map((s) => {
            const on = p.settings.slotHours.includes(s.h);
            const next = on ? p.settings.slotHours.filter((h) => h !== s.h) : [...p.settings.slotHours, s.h];
            return (
              <button key={s.h} disabled={busy !== null || (on && next.length === 0)} onClick={() => run(`slot${s.h}`, { action: "schedule", slots: next })}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}>
                {s.label}
              </button>
            );
          })}
          <button disabled={busy !== null} onClick={() => run("pause", { action: "schedule", paused: !p.settings.paused })}
            className={`ml-2 rounded-full border px-3 py-1.5 text-xs font-bold ${p.settings.paused ? "border-amber-400 bg-amber-100 text-amber-900" : "border-slate-300 bg-white text-slate-600"}`}>
            {p.settings.paused ? "Paused — resume" : "Pause"}
          </button>
        </div>
        {p.slots.length > 0 && (
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {p.slots.slice(0, 3).map((s) => (
              <li key={s.label} className="rounded-xl bg-slate-50 px-3 py-2 text-xs">
                <span className="block font-black text-slate-500">{s.label}</span>
                <span className={s.title ? "text-slate-800" : "text-slate-400"}>{s.title ?? "nothing in line"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}

      {/* The line */}
      <section>
        <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-500">In line ({p.queued.length})</h2>
        {p.queued.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">Nothing in line. Add videos from the library below — or ask your Claude to plan the week.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {p.queued.map((it, i) => (
              <div key={it.id} className={`flex flex-col overflow-hidden rounded-2xl border bg-white ${i === 0 ? "border-indigo-300 ring-2 ring-indigo-200" : "border-slate-200"}`}>
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-500">
                    #{it.position} {i === 0 && <span className="inline-flex items-center gap-1 text-indigo-700"><Radio className="h-3 w-3" /> Next out</span>}
                  </span>
                  <span className="flex items-center gap-1">
                    <button disabled={busy !== null || i === 0} onClick={() => run(`up${it.id}`, { action: "update", post: it.id, moveTo: it.position - 1 })} className="rounded px-1.5 py-0.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30">↑</button>
                    <button disabled={busy !== null || i === p.queued.length - 1} onClick={() => run(`dn${it.id}`, { action: "update", post: it.id, moveTo: it.position + 1 })} className="rounded px-1.5 py-0.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30">↓</button>
                    <button disabled={busy !== null} onClick={() => run(`rm${it.id}`, { action: "update", post: it.id, remove: true })} className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-400 hover:bg-rose-100 hover:text-rose-700">Remove</button>
                  </span>
                </div>
                <video src={it.video.videoUrl} poster={it.video.thumbnailUrl ?? undefined} controls preload="none" className="aspect-[9/16] w-full bg-slate-900 object-contain" />
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <p className="text-sm font-bold text-slate-900">{it.video.title}</p>
                  {editing === it.id ? (
                    <>
                      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} maxLength={2200} className="w-full rounded-lg border border-slate-300 p-2 text-xs" />
                      <div className="flex gap-2">
                        <button disabled={busy !== null} onClick={async () => { await run(`cap${it.id}`, { action: "update", post: it.id, caption: draft }); setEditing(null); }} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">Save</button>
                        <button onClick={() => setEditing(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold">Cancel</button>
                      </div>
                    </>
                  ) : (
                    <button onClick={() => { setEditing(it.id); setDraft(it.caption); }} className="line-clamp-4 whitespace-pre-wrap text-left text-xs text-slate-600 hover:text-slate-900">{it.caption}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* The library */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">ShearQuery videos you can repost</h2>
          <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-40 outline-none" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {lib.map((v) => (
            <div key={v.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <video src={v.videoUrl} poster={v.thumbnailUrl ?? undefined} controls preload="none" className="aspect-[9/16] w-full bg-slate-900 object-contain" />
              <div className="flex flex-1 flex-col gap-2 p-3">
                <p className="text-xs font-bold text-slate-900">{v.title}</p>
                <p className="text-[11px] text-slate-400">{v.type ? `${v.type} · ` : ""}posted {v.publishedAt?.slice(0, 10) ?? "—"}</p>
                <button disabled={busy !== null} onClick={() => run(`add${v.id}`, { action: "add", video: v.id })}
                  className="mt-auto inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                  {busy === `add${v.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add to line
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Posted */}
      {p.done.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-500">Posted</h2>
          <ul className="space-y-2">
            {p.done.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">
                <span className="font-semibold text-slate-800">{d.video.title}</span>
                {d.status === "published" ? (
                  <a href={d.instagramPermalink ?? "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Published {d.publishedAt?.slice(0, 10)} <ExternalLink className="h-3 w-3" /></a>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700"><AlertTriangle className="h-3.5 w-3.5" /> Failed: {d.error}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
