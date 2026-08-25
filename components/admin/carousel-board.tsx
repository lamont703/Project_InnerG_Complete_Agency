"use client";

import React from "react";
import Image from "next/image";
import { Check, X, Send, RotateCcw, ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import type { CarouselRow, ConnectionState } from "@/lib/admin/carousel-queue";
import {
  approveCarousel,
  skipCarousel,
  unapproveCarousel,
  publishCarousel,
} from "@/app/admin/instagram-carousels/actions";

/**
 * The review board for comic carousels.
 *
 * THE POINT OF THIS SCREEN IS THAT SOMEBODY LOOKS AT EVERY CARD. Instagram gets
 * eleven images and a caption in one call; there is no per-card undo and no
 * edit after posting. So the cards are shown at the size they will be swiped
 * at, in order, and publish stays disabled until a human has approved the deck.
 *
 * PREVIEWS ARE THE REAL RENDERED JPEGS, fetched from the same public URLs
 * Instagram will fetch. Not a CSS re-creation of the card — a mock-up that
 * agrees with the artwork right up until it doesn't is worse than no preview.
 */

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Needs review", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  publishing: { label: "Publishing…", cls: "bg-sky-50 text-sky-800 border-sky-200" },
  published: { label: "Published", cls: "bg-slate-900 text-white border-slate-900" },
  failed: { label: "Failed", cls: "bg-rose-50 text-rose-800 border-rose-200" },
  skipped: { label: "Skipped", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

export function CarouselBoard({
  rows,
  connection,
}: {
  rows: CarouselRow[];
  connection: ConnectionState;
}) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<{ id: string; ok: boolean; text: string } | null>(null);

  const run = async (id: string, fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) => {
    setBusy(id);
    setNote(null);
    try {
      const r = await fn();
      setNote({ id, ok: r.ok, text: r.ok ? (r.message ?? "Done") : (r.error ?? "Failed") });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {!connection.connected && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="text-[13px] font-bold text-amber-900">Instagram can&apos;t be posted to</p>
            <p className="text-[12px] text-amber-800">
              {connection.problem ?? "not connected"} — reviewing still works, publishing will refuse.
              Fix it under Connectors.
            </p>
          </div>
        </div>
      )}

      {rows.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-8 text-center">
          <p className="text-[14px] font-bold text-slate-900">Nothing rendered yet</p>
          <p className="mt-1 text-[12px] text-slate-500">
            Run{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">
              node --experimental-strip-types scripts/instagram/render_carousel.js --all
            </code>{" "}
            to render the decks and queue them here.
          </p>
        </div>
      )}

      {rows.map((row) => {
        const s = STATUS[row.status] ?? STATUS.draft;
        const isBusy = busy === row.id;
        const showing = note?.id === row.id ? note : null;

        return (
          <article key={row.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-bold text-slate-900">{row.title}</h2>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${s.cls}`}>
                    {s.label}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {row.card_count} cards
                  {row.engine ? <> · {row.engine}</> : null}
                  {row.approved_at ? <> · approved {new Date(row.approved_at).toLocaleDateString()}</> : null}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {row.status === "draft" && (
                  <>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => run(row.id, () => skipCarousel(row.id))}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 hover:border-slate-300 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" /> Skip
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => run(row.id, () => approveCarousel(row.id))}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
                    >
                      {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Approve
                    </button>
                  </>
                )}

                {row.status === "approved" && (
                  <>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => run(row.id, () => unapproveCarousel(row.id))}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 hover:border-slate-300 disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Undo
                    </button>
                    <button
                      type="button"
                      disabled={isBusy || !connection.connected}
                      title={connection.connected ? undefined : connection.problem}
                      onClick={() => run(row.id, () => publishCarousel(row.id))}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Publish
                    </button>
                  </>
                )}

                {row.instagram_permalink && (
                  <a
                    href={row.instagram_permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 hover:border-slate-300"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> View
                  </a>
                )}
              </div>
            </div>

            {showing && (
              <p
                className={`px-5 py-2 text-[12px] ${showing.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}
              >
                {showing.text}
              </p>
            )}
            {row.instagram_error && !showing && (
              <p className="bg-rose-50 px-5 py-2 text-[12px] text-rose-800">
                Last error — {row.instagram_error}
              </p>
            )}

            {/* The swipe, at the size it will be swiped at. */}
            <div className="flex gap-3 overflow-x-auto px-5 py-4">
              {row.image_urls.map((url, i) => (
                <figure key={url} className="w-[168px] shrink-0">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
                    <Image
                      src={url}
                      alt={`${row.title}, card ${i + 1} of ${row.image_urls.length}`}
                      fill
                      sizes="168px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <figcaption className="mt-1 text-center font-mono text-[10px] text-slate-400">
                    {i + 1} / {row.image_urls.length}
                  </figcaption>
                </figure>
              ))}
            </div>

            <div className="border-t border-slate-100 px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Caption</p>
              <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">
                {row.caption}
              </p>
              {row.hashtags.length > 0 && (
                <p className="mt-2 text-[12px] text-sky-700">
                  {row.hashtags.map((h) => `#${h}`).join(" ")}
                </p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
