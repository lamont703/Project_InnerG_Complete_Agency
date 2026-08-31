"use client";

import { useRef, useState } from "react";
import { Scissors, Loader2, Download, Trash2, Play } from "lucide-react";
import { keepRanges, totalDuration, formatTime, parseTime, type Range } from "@/lib/video-editor/ranges";

/**
 * Mark the bits to remove, render what is left.
 *
 * THE PLAYHEAD IS THE INPUT, not a pair of text boxes. Typing timestamps means
 * scrubbing to a spot, reading a number off the player and retyping it, and the
 * number you retype is never quite the one you saw. "Start here / end here"
 * against the current playhead is how anyone actually finds a cut.
 *
 * The boxes stay editable underneath, because nudging 12.4 to 12.2 by hand is
 * faster than scrubbing to it.
 */
export function VideoEditor() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [cuts, setCuts] = useState<Range[]>([]);
  const [pending, setPending] = useState<{ start: number | null }>({ start: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const keep = keepRanges(cuts, duration);
  const remaining = totalDuration(keep);
  const now = () => videoRef.current?.currentTime ?? 0;

  function pick(f: File) {
    setFile(f);
    setSrc(URL.createObjectURL(f));
    setCuts([]);
    setPending({ start: null });
    setError(null);
    setDone(null);
  }

  function markStart() {
    setPending({ start: now() });
  }

  function markEnd() {
    if (pending.start == null) return;
    const a = pending.start;
    const b = now();
    if (Math.abs(b - a) < 0.05) {
      setError("That cut is too short to do anything.");
      return;
    }
    setCuts((c) => [...c, { start: Math.min(a, b), end: Math.max(a, b) }]);
    setPending({ start: null });
    setError(null);
  }

  function editCut(i: number, field: "start" | "end", raw: string) {
    const v = parseTime(raw);
    if (v == null) return;
    setCuts((c) => c.map((x, n) => (n === i ? { ...x, [field]: v } : x)));
  }

  async function render() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const fd = new FormData();
      fd.append("video", file);
      fd.append("cuts", JSON.stringify(cuts));
      const res = await fetch("/api/admin/video-editor", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.[^.]+$/, "")}-edited.mp4`;
      a.click();
      setDone(`Downloaded — ${formatTime(Number(res.headers.get("X-Result-Duration") || 0))} from ${formatTime(duration)}`);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <input
          type="file"
          accept="video/*"
          onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-white hover:file:bg-slate-800"
        />
        {file && (
          <p className="mt-2 text-xs text-slate-500">
            {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
          </p>
        )}
      </div>

      {src && (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm">
            <video
              ref={videoRef}
              src={src}
              controls
              className="w-full"
              onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration)}
            />
          </div>

          {/* A strip of what survives, so the shape of the edit is visible
              without playing it back. */}
          {duration > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex h-6 w-full overflow-hidden rounded bg-rose-200">
                {keep.map((r, i) => (
                  <div
                    key={i}
                    className="h-full bg-emerald-500"
                    style={{
                      marginLeft: `${((r.start - (i === 0 ? 0 : keep[i - 1].end)) / duration) * 100}%`,
                      width: `${((r.end - r.start) / duration) * 100}%`,
                    }}
                    title={`keep ${formatTime(r.start)}–${formatTime(r.end)}`}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                <span className="font-bold text-slate-800">{formatTime(remaining)}</span> left of{" "}
                {formatTime(duration)} · {keep.length} segment{keep.length === 1 ? "" : "s"} ·{" "}
                <span className="text-rose-600">{formatTime(duration - remaining)} cut</span>
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={markStart}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:border-slate-400"
            >
              <Scissors className="h-4 w-4" />
              {pending.start == null ? "Cut starts here" : `Start ${formatTime(pending.start)} — set the end`}
            </button>
            <button
              type="button"
              onClick={markEnd}
              disabled={pending.start == null}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-40"
            >
              Cut ends here
            </button>
          </div>

          {cuts.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black text-slate-900">Cutting out</h2>
              <ul className="mt-3 space-y-2">
                {cuts.map((c, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                    <input
                      defaultValue={formatTime(c.start)}
                      onBlur={(e) => editCut(i, "start", e.target.value)}
                      className="w-24 rounded-lg border border-slate-300 px-2 py-1 font-mono text-xs"
                    />
                    <span className="text-slate-400">→</span>
                    <input
                      defaultValue={formatTime(c.end)}
                      onBlur={(e) => editCut(i, "end", e.target.value)}
                      className="w-24 rounded-lg border border-slate-300 px-2 py-1 font-mono text-xs"
                    />
                    <span className="text-xs text-slate-500">({formatTime(c.end - c.start)})</span>
                    <button
                      type="button"
                      onClick={() => videoRef.current && (videoRef.current.currentTime = c.start)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Jump to this cut"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCuts((x) => x.filter((_, n) => n !== i))}
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Remove this cut"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>
          )}
          {done && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{done}</p>
          )}

          <button
            type="button"
            onClick={render}
            disabled={busy || !keep.length}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50 sm:w-auto"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {busy ? "Rendering…" : cuts.length ? `Render ${formatTime(remaining)} and download` : "Render and download"}
          </button>
        </>
      )}
    </div>
  );
}
