"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Pause, Play, Plus, X, Pin, PinOff } from "lucide-react";
import type { PublisherItem } from "@/lib/admin/publisher-queue";
import {
  DAY_NAMES, describeSlots, formatEastern, hourLabel, easternParts,
  type PublisherSettings, type WeeklySlot,
} from "@/lib/admin/publisher-schedule";
import { savePublisherSchedule, setPublishTime } from "@/app/admin/content-publisher/actions";

/**
 * The posting schedule (decided 2026-10-02): a real pause switch, weekly days and hours
 * in Eastern, and any queued video pinned to its own date and hour. Every time shown here
 * comes from planQueue — the same rules the hourly cron decides with — so the page
 * cannot promise a time the publisher will not keep.
 */

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const PRESETS: { label: string; slots: WeeklySlot[] }[] = [
  { label: "Once a week · Tue 2 PM", slots: [{ day: 2, hour: 14 }] },
  { label: "Twice a week · Tue & Fri 2 PM", slots: [{ day: 2, hour: 14 }, { day: 5, hour: 14 }] },
];

const same = (a: WeeklySlot[], b: WeeklySlot[]) =>
  a.length === b.length && a.every((s, i) => s.day === b[i].day && s.hour === b[i].hour);
const sortSlots = (s: WeeklySlot[]) => [...s].sort((a, b) => a.day - b.day || a.hour - b.hour);

export function PublisherSchedulePanel({
  settings,
  queued,
}: {
  settings: PublisherSettings | null;
  queued: PublisherItem[];
}) {
  const router = useRouter();
  const saved = settings?.weeklySlots ?? [];
  const [slots, setSlots] = React.useState<WeeklySlot[]>(saved);
  const [day, setDay] = React.useState(2);
  const [hour, setHour] = React.useState(14);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const dirty = !same(sortSlots(slots), sortSlots(saved));

  React.useEffect(() => setSlots(saved), [JSON.stringify(saved)]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(paused: boolean, next: WeeklySlot[]) {
    setBusy(true); setMsg(null);
    const r = await savePublisherSchedule({ paused, weeklySlots: next });
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: paused ? "Saved. Posting is paused." : "Saved. Posting is live on this schedule." } : { ok: false, text: r.error });
    if (r.ok) router.refresh();
  }

  if (!settings) {
    return (
      <section className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
        <strong>The posting schedule isn&apos;t set up yet.</strong> The publisher can&apos;t read its schedule, so it
        publishes nothing until it can. Apply the <code>publisher_schedule</code> migration (<code>supabase db push</code>).
      </section>
    );
  }

  const paused = settings.paused;
  const add = () => setSlots((s) => sortSlots([...s.filter((x) => !(x.day === day && x.hour === hour)), { day, hour }]));

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-black tracking-tight text-slate-950">Posting schedule</h2>
          <span className={`ml-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-widest ${paused ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
            {paused ? "Paused" : "Live"}
          </span>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => save(!paused, saved)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${paused ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"}`}
        >
          {paused ? <><Play className="h-4 w-4" /> Resume posting</> : <><Pause className="h-4 w-4" /> Pause posting</>}
        </button>
      </div>

      <p className="mt-2 text-sm text-slate-500">
        {paused
          ? "Nothing goes out while paused. The times below are when each video will post once you resume."
          : `Posting ${describeSlots(saved)}. Pinned videos go out at their own time.`}
      </p>

      {/* weekly times */}
      <div className="mt-5">
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">Weekly posting times (Eastern)</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {slots.length === 0 && <span className="text-sm text-slate-400">None yet — add a day and time.</span>}
          {sortSlots(slots).map((s) => (
            <span key={`${s.day}:${s.hour}`} className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-800">
              {DAY_NAMES[s.day]} · {hourLabel(s.hour)}
              <button type="button" aria-label="Remove" onClick={() => setSlots((x) => x.filter((y) => !(y.day === s.day && y.hour === s.hour)))} className="rounded-full p-0.5 hover:bg-indigo-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select value={day} onChange={(e) => setDay(Number(e.target.value))} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
            {DAY_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}
          </select>
          <select value={hour} onChange={(e) => setHour(Number(e.target.value))} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
            {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
          </select>
          <button type="button" onClick={add} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Plus className="h-4 w-4" /> Add time
          </button>
          <span className="mx-1 text-slate-300">|</span>
          {PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => setSlots(p.slots)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
              {p.label}
            </button>
          ))}
        </div>
        {dirty && (
          <div className="mt-3 flex items-center gap-2">
            <button type="button" disabled={busy} onClick={() => save(paused, slots)} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
              Save posting times
            </button>
            <button type="button" disabled={busy} onClick={() => setSlots(saved)} className="text-sm font-semibold text-slate-500 hover:text-slate-700">
              Discard
            </button>
          </div>
        )}
        {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-emerald-700" : "text-rose-700"}`}>{msg.text}</p>}
      </div>

      {/* per-video */}
      {queued.length > 0 && (
        <div className="mt-6">
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">When each video goes out</div>
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {queued.map((item, i) => <VideoRow key={item.id} item={item} index={i} />)}
          </ul>
          <p className="mt-2 text-xs text-slate-400">
            Pin a video to post it at an exact date and hour, ahead of the weekly order. Unpinned videos take the weekly
            times in the order of the line below. One post per hour at most.
          </p>
        </div>
      )}
    </section>
  );
}

function VideoRow({ item, index }: { item: PublisherItem; index: number }) {
  const router = useRouter();
  const today = easternParts(new Date()).date;
  const init = item.scheduledFor ? easternParts(new Date(item.scheduledFor)) : null;
  const [date, setDate] = React.useState(init?.date ?? today);
  const [hour, setHour] = React.useState(init?.hour ?? 14);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function pin(d: string | null) {
    setBusy(true); setErr(null);
    const r = await setPublishTime(item.id, d, d ? hour : null);
    setBusy(false);
    if (!r.ok) setErr(r.error); else { setOpen(false); router.refresh(); }
  }

  const when = item.unpublishable
    ? <span className="text-amber-700">No video — can't post</span>
    : item.overdue
      ? <span className="text-amber-700">Pinned time passed — posts at the next run once live</span>
      : item.plannedAt
        ? <span className="text-slate-800">{item.scheduledFor && <Pin className="mr-1 inline h-3.5 w-3.5 text-indigo-600" />}{formatEastern(item.plannedAt)}</span>
        : <span className="text-slate-400">No time yet — add a weekly time or pin it</span>;

  return (
    <li className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center">
      <span className="w-8 shrink-0 text-xs font-black text-slate-400">#{index + 1}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900" title={item.title}>{item.title}</span>
      <span className="text-sm sm:w-72">{when}</span>
      <span className="flex items-center gap-1.5">
        {open ? (
          <>
            <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
            <select value={hour} onChange={(e) => setHour(Number(e.target.value))} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm">
              {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
            </select>
            <button type="button" disabled={busy} onClick={() => pin(date)} className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-50">Pin</button>
            <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-slate-500">Cancel</button>
          </>
        ) : (
          <>
            <button type="button" disabled={item.unpublishable} onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
              <Pin className="h-3.5 w-3.5" /> {item.scheduledFor ? "Change" : "Pin date"}
            </button>
            {item.scheduledFor && (
              <button type="button" disabled={busy} onClick={() => pin(null)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100">
                <PinOff className="h-3.5 w-3.5" /> Unpin
              </button>
            )}
          </>
        )}
      </span>
      {err && <span className="text-xs text-rose-700 sm:basis-full sm:pl-8">{err}</span>}
    </li>
  );
}

