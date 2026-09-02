"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, AlertTriangle, Clock, ExternalLink, GripVertical, Radio, Instagram, Youtube,
  Linkedin, MapPin, Music2, MinusCircle,
} from "lucide-react";
import type { PublisherItem, PublisherQueue, PublisherOutcome } from "@/lib/admin/publisher-queue";
import { reorderQueue, skipItem, renderCard } from "@/app/admin/content-publisher/actions";
import { videoTypeFor } from "@/lib/video-type";

/**
 * The line, draggable, with every video playable.
 *
 * THE CARD IS DELIBERATELY THE SHORTS-QUEUE CARD. Same 9:16 player, same
 * preload="none", same title/question/key block. That page already answers
 * "does this read well, is the number right, is the text clipped" and the
 * answer should not depend on which internal page you happened to open. What
 * is added here is only what this page knows and that one does not: where the
 * item sits in the line, and what happened on each platform.
 *
 * DRAG AND DROP IS NATIVE. No dependency: the HTML5 drag events do exactly what
 * a list of tens of cards on an internal page needs, and adding a drag library
 * to the bundle for one admin screen is a poor trade. Keyboard reordering is
 * the real gap here - noted rather than hidden, see the arrow buttons on each
 * card, which do the same move without a mouse.
 *
 * THE REORDER IS OPTIMISTIC AND THEN CONFIRMED. The list moves immediately
 * because a drag that waits for a round trip feels broken, but a refusal from
 * the server (someone else reordered, something published mid-drag) snaps it
 * back by refreshing rather than leaving the screen showing an order that was
 * never saved.
 */

/**
 * One line per destination.
 *
 * DRIVEN BY THE ROW, NOT BY A HARDCODED PAIR. This used to render a YouTube row
 * and an Instagram row and nothing else, so a platform added to the fan-out
 * would publish successfully and be invisible here. It now walks `results`,
 * which means the next platform needs no change to this file.
 *
 * OLDER ROWS HAVE NO `results` AT ALL. Everything published before the fan-out
 * recorded its outcome only in youtube_id / instagram_media_id, so those are
 * folded in when the row carries nothing else. Without that, the history on the
 * board would go blank for every past post.
 *
 * SKIPPED IS GREY, NOT RED. "TikTok is not enabled" is a setting, not a
 * failure, and colouring it like one trains the eye to ignore the colour - at
 * which case a real failure stops standing out.
 */

const PLATFORM_META: Record<string, { label: string; Icon: typeof Youtube; tone: string }> = {
  youtube: { label: "Short", Icon: Youtube, tone: "text-indigo-700" },
  instagram: { label: "Reel", Icon: Instagram, tone: "text-fuchsia-700" },
  linkedin: { label: "Post", Icon: Linkedin, tone: "text-sky-700" },
  x: { label: "Post", Icon: Radio, tone: "text-slate-900" },
  gbp: { label: "Google Post", Icon: MapPin, tone: "text-emerald-700" },
  tiktok: { label: "Video", Icon: Music2, tone: "text-rose-700" },
};

const PLATFORM_ORDER = ["youtube", "instagram", "linkedin", "x", "gbp", "tiktok"];

/** Fold the legacy columns in for rows written before `results` existed. */
function outcomesFor(item: PublisherItem): Record<string, PublisherOutcome> {
  if (item.results && Object.keys(item.results).length > 0) return item.results;

  const legacy: Record<string, PublisherOutcome> = {};
  legacy.youtube = item.youtubeId
    ? { ok: true, id: item.youtubeId, url: `https://youtube.com/shorts/${item.youtubeId}` }
    : { ok: false, error: item.youtubeError || "not published" };
  legacy.instagram = item.instagramMediaId
    ? { ok: true, id: item.instagramMediaId, url: item.instagramPermalink || undefined }
    : { ok: false, error: item.instagramError || "not published" };
  return legacy;
}

/**
 * The card that has no video, and the button that gives it one.
 *
 * Rendering starts DETACHED and this cannot watch it — an avatar takes two to
 * three minutes. So the button reports that it started and asks for a refresh,
 * rather than pretending to know when it finished. The card stops being a
 * placeholder the moment video_url is written, which the renderer does last.
 *
 * IT SAYS WHAT THE CLICK BUYS. A Render button that does not name the renderer
 * asks an operator to spend money blind — the two paths differ by $1.16 a card
 * and produce completely different videos. The type and price come from
 * videoTypeFor(), the SAME call scripts/render_queued.js routes on, so this
 * cannot advertise one thing and render another.
 */
function RenderPlaceholder({ item }: { item: PublisherItem }) {
  const router = useRouter();
  const [state, setState] = React.useState<"idle" | "starting" | "started" | "error">("idle");
  const [msg, setMsg] = React.useState<string | null>(null);
  /*
   * The WHOLE row, not just the title. Stated intent wins, `stat` marks a data
   * reel, and the title shape is the last resort — passing only the title made
   * every data reel read as an avatar and quote $1.16 for a free render.
   */
  const kind = videoTypeFor({ title: item.title, video_type: item.videoType, stat: item.stat });

  async function go() {
    setState("starting");
    const r = await renderCard(item.id);
    if (!r.ok) { setState("error"); setMsg(r.error ?? "could not start"); return; }
    setState("started");
    setMsg("Rendering. Refresh in a minute or two.");
    setTimeout(() => router.refresh(), 45000);
  }

  return (
    <div className="w-full aspect-[9/16] bg-slate-100 flex flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="text-sm text-slate-400">not rendered yet</span>
      <button
        type="button"
        onClick={go}
        disabled={state === "starting" || state === "started"}
        className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-md px-3 py-1.5 disabled:opacity-50"
      >
        {state === "starting" ? "Starting…" : state === "started" ? "Rendering…" : "Render"}
      </button>
      <span className="flex flex-col items-center gap-0.5 leading-tight">
        <span className="text-[11px] font-semibold text-slate-700">{kind.label}</span>
        <span className={`text-[11px] font-bold ${kind.costUsd > 0 ? "text-amber-700" : "text-emerald-700"}`}>
          {kind.costLabel}
          <span className="font-normal text-slate-400"> · {kind.seconds}s</span>
        </span>
      </span>
      {msg && (
        <span className={`text-[11px] leading-snug ${state === "error" ? "text-rose-600" : "text-slate-500"}`}>{msg}</span>
      )}
    </div>
  );
}

function PlatformResult({ item }: { item: PublisherItem }) {
  if (item.status === "queued") return null;

  const outcomes = outcomesFor(item);
  const keys = Object.keys(outcomes).sort(
    (a, b) => PLATFORM_ORDER.indexOf(a) - PLATFORM_ORDER.indexOf(b)
  );

  return (
    <div className="flex flex-col gap-1 text-[11px]">
      {keys.map((key) => {
        const o = outcomes[key];
        const meta = PLATFORM_META[key] ?? { label: key, Icon: Radio, tone: "text-slate-700" };
        const { Icon } = meta;

        if ("skipped" in o) {
          return (
            <span key={key} className="inline-flex items-center gap-1.5 text-slate-400">
              <MinusCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{o.skipped}</span>
            </span>
          );
        }

        return (
          <span key={key} className="inline-flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {o.ok ? (
              o.url ? (
                <a
                  href={o.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 font-bold ${meta.tone}`}
                >
                  {meta.label} <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className={`font-bold ${meta.tone}`}>{meta.label}</span>
              )
            ) : (
              <span className="text-rose-700 truncate">{o.error || "not published"}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function Card({
  item, index, draggable, onDragStart, onDragOver, onDrop, onMove, onSkip, busy,
}: {
  item: PublisherItem;
  index: number;
  draggable: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onMove?: (delta: number) => void;
  onSkip?: () => void;
  busy?: boolean;
}) {
  const next = draggable && index === 0;

  const tone =
    item.status === "published" ? "border-emerald-200 bg-emerald-50"
    : item.status === "partial" ? "border-amber-300 bg-amber-50"
    : item.status === "failed" ? "border-rose-200 bg-rose-50"
    : item.unpublishable ? "border-amber-300 bg-amber-50"
    : next ? "border-indigo-400 bg-white ring-2 ring-indigo-200"
    : "border-slate-200 bg-white";

  return (
    <div
      draggable={draggable && !busy}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`rounded-2xl border ${tone} overflow-hidden flex flex-col ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      } ${busy ? "opacity-60" : ""}`}
    >
      {draggable && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50/70">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-500">
            <GripVertical className="h-3.5 w-3.5" />
            {next ? (
              <span className="inline-flex items-center gap-1 text-indigo-700">
                <Radio className="h-3 w-3" /> Next out
              </span>
            ) : (
              <>#{index + 1}</>
            )}
          </span>
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onMove?.(-1)}
              disabled={index === 0 || busy}
              aria-label="Move earlier"
              className="rounded px-1.5 py-0.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => onMove?.(1)}
              disabled={busy}
              aria-label="Move later"
              className="rounded px-1.5 py-0.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={onSkip}
              disabled={busy}
              className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-400 hover:bg-rose-100 hover:text-rose-700 disabled:opacity-30"
            >
              Skip
            </button>
          </span>
        </div>
      )}

      {item.videoUrl ? (
        <video
          src={item.videoUrl}
          poster={item.thumbnailUrl ?? undefined}
          controls
          /*
           * preload="metadata" rather than "none" so a card with no cover still
           * shows its first frame instead of a black rectangle. It costs a few
           * KB per card and only on an internal page. Where a cover exists the
           * poster wins and nothing is fetched until play.
           */
          preload={item.thumbnailUrl ? "none" : "metadata"}
          playsInline
          className="w-full bg-slate-900 aspect-[9/16] object-contain"
        />
      ) : (
        <RenderPlaceholder item={item} />
      )}

      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
          {item.status === "published" ? (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Published
            </span>
          ) : item.status === "partial" ? (
            <span className="inline-flex items-center gap-1 text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" /> One platform only
            </span>
          ) : item.status === "failed" ? (
            <span className="inline-flex items-center gap-1 text-rose-700">
              <AlertTriangle className="h-3.5 w-3.5" /> Failed
            </span>
          ) : item.status === "skipped" ? (
            <span className="inline-flex items-center gap-1 text-slate-500">Skipped</span>
          ) : item.unpublishable ? (
            <span className="inline-flex items-center gap-1 text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" /> No video — cannot publish
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Clock className="h-3.5 w-3.5" /> Queued
            </span>
          )}
        </div>

        <p className="text-sm font-bold text-slate-900 leading-snug">{item.title}</p>
        {item.question && <p className="text-xs text-slate-500 italic">{item.question}</p>}

        <PlatformResult item={item} />

        <div className="mt-auto pt-2">
          <code className="text-[11px] text-slate-400">{item.itemKey}</code>
        </div>
      </div>
    </div>
  );
}

export function PublisherQueueBoard({ queue }: { queue: PublisherQueue }) {
  const router = useRouter();
  const [order, setOrder] = React.useState<PublisherItem[]>(queue.queued);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const dragFrom = React.useRef<number | null>(null);

  // The server is the authority. When a publish lands or a revalidate comes
  // back, take the new list rather than keeping a local order that no longer
  // matches what will actually go out.
  React.useEffect(() => setOrder(queue.queued), [queue.queued]);

  const commit = React.useCallback(
    async (next: PublisherItem[]) => {
      const previous = order;
      setOrder(next);
      setBusy(true);
      setError(null);
      const result = await reorderQueue(next.map((i) => i.id));
      setBusy(false);
      if (!result.ok) {
        setOrder(previous);
        setError(result.error);
        router.refresh();
      }
    },
    [order, router]
  );

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    void commit(next);
  };

  const onSkip = async (id: string) => {
    setBusy(true);
    const res = await skipItem(id);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Could not skip.");
    router.refresh();
  };

  return (
    <>
      <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-500">
          Next three slots
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {queue.upcomingSlots.map((slot) => (
            <li key={slot.label} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-indigo-700">
                {slot.label}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900 leading-snug">
                {slot.itemTitle ?? <span className="text-slate-400 font-medium">queue is empty</span>}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {error && (
        <p className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      )}

      <section className="mb-12">
        <h2 className="mb-1 text-sm font-black uppercase tracking-widest text-slate-500">
          In line {order.length > 0 && <span className="text-slate-900">({order.length})</span>}
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          Drag a card, or use ↑ ↓. Position 1 goes out at the next slot — to both
          YouTube Shorts and Instagram Reels.
        </p>
        {order.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nothing in line. New Shorts and Reels are added to the back automatically.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {order.map((item, i) => (
              <Card
                key={item.id}
                item={item}
                index={i}
                draggable
                busy={busy}
                onDragStart={() => (dragFrom.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  const from = dragFrom.current;
                  dragFrom.current = null;
                  if (from !== null) move(from, i);
                }}
                onMove={(delta) => move(i, i + delta)}
                onSkip={() => onSkip(item.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-500">
          Gone out {queue.done.length > 0 && <span className="text-slate-900">({queue.done.length})</span>}
        </h2>
        {queue.done.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing published from here yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {queue.done.map((item, i) => (
              <Card key={item.id} item={item} index={i} draggable={false} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
