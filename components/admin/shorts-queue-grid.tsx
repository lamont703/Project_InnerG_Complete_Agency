"use client";

import * as React from "react";
import { CalendarDays, CheckCircle2, AlertTriangle, Clock, ExternalLink } from "lucide-react";
import type { QueuedShort, ShortsQueue } from "@/lib/admin/shorts-queue";

/**
 * The queue, with every Short playable.
 *
 * THE VIDEO IS THE POINT. A list of titles tells you what is scheduled; it does
 * not tell you whether the card reads well, whether a number is wrong, or
 * whether the text is clipped. Being able to watch tomorrow's post before it
 * goes out is the whole reason this page exists rather than a database query.
 *
 * `preload="none"` so opening the page does not pull eight videos at once. They
 * load when you press play.
 */

const prettyDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
  });

function Card({ s }: { s: QueuedShort }) {
  const tone =
    s.status === "published" ? "border-emerald-200 bg-emerald-50"
    : s.overdue ? "border-amber-300 bg-amber-50"
    : s.status === "failed" ? "border-rose-200 bg-rose-50"
    : "border-slate-200 bg-white";

  return (
    <div className={`rounded-2xl border ${tone} overflow-hidden flex flex-col`}>
      {s.videoUrl ? (
        <video
          src={s.videoUrl}
          controls
          preload="none"
          playsInline
          className="w-full bg-slate-900 aspect-[9/16] object-contain"
        />
      ) : (
        <div className="w-full aspect-[9/16] bg-slate-100 flex items-center justify-center text-sm text-slate-400">
          not rendered yet
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
          {s.status === "published" ? (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Published
            </span>
          ) : s.overdue ? (
            <span className="inline-flex items-center gap-1 text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" /> Overdue
            </span>
          ) : s.status === "failed" ? (
            <span className="inline-flex items-center gap-1 text-rose-700">
              <AlertTriangle className="h-3.5 w-3.5" /> Failed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Clock className="h-3.5 w-3.5" /> Scheduled
            </span>
          )}
          <span className="text-slate-400 font-medium normal-case tracking-normal">
            {prettyDate(s.scheduledFor)}
          </span>
        </div>

        <p className="text-sm font-bold text-slate-900 leading-snug">{s.title}</p>
        {s.question && <p className="text-xs text-slate-500 italic">{s.question}</p>}
        {s.error && <p className="text-xs text-rose-700">{s.error}</p>}

        <div className="mt-auto pt-2 flex items-center justify-between">
          <code className="text-[11px] text-slate-400">{s.cardKey}</code>
          {s.youtubeId && (
            <a
              href={`https://youtube.com/shorts/${s.youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700"
            >
              Watch <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, rows, empty }: { title: string; rows: QueuedShort[]; empty: string }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-500">
        {title} {rows.length > 0 && <span className="text-slate-900">({rows.length})</span>}
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((s) => <Card key={s.id} s={s} />)}
        </div>
      )}
    </section>
  );
}

export function ShortsQueueGrid({ queue }: { queue: ShortsQueue }) {
  return (
    <>
      <Section
        title="Ready to publish"
        rows={queue.due}
        empty="Nothing due today."
      />
      <Section
        title="Scheduled"
        rows={queue.upcoming}
        empty="Queue is empty — run queue_shorts.js to schedule more."
      />
      {queue.problems.length > 0 && (
        <Section title="Needs attention" rows={queue.problems} empty="" />
      )}
      <Section
        title="Published"
        rows={queue.published}
        empty="Nothing published yet."
      />
    </>
  );
}
