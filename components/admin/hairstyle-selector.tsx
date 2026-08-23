"use client";

import React from "react";
import { Camera, Check, Loader2, RefreshCw, Send, AlertTriangle, Scissors } from "lucide-react";
import { SHOTS, assessShot, type ShotId } from "@/lib/hairstyle/capture";
import { STYLE_PRESETS, type FadeSpec } from "@/lib/hairstyle/request";
import type { BarberRequest } from "@/lib/hairstyle/request";
import { uploadShot, chooseStyle, sendToBarber } from "@/app/admin/hairstyle-selector/actions";
import { useRouter } from "next/navigation";

/**
 * The HairStyle Selector.
 *
 * COACHING RUNS BEFORE THE UPLOAD, not after. Five phone photos taken in a
 * bathroom are entirely achievable; five USABLE ones without guidance are not.
 * Each frame is measured on-device — brightness, contrast, size — and a bad one
 * is refused with the single most useful thing to say, before any bytes leave
 * the phone. Accepting a bad shot silently produces a bad model and blames the
 * technology.
 *
 * THE STYLE ROW IS A PARAMETER SPACE, NOT A CATALOGUE. Every preset is the same
 * three knobs from lib/fade-geometry — height, bottom, top guard. There are no
 * hair assets to author and no library to maintain, which is the whole reason
 * this is buildable at all.
 */

type Stage = "capture" | "style" | "review";

function imageStats(img: HTMLImageElement): { meanLuminance: number; contrast: number; width: number; height: number } {
  // Downsampled on purpose: 64px is plenty to judge exposure and contrast, and
  // it keeps the check instant on a phone.
  const N = 64;
  const c = document.createElement("canvas");
  c.width = N;
  c.height = N;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, N, N);
  const { data } = ctx.getImageData(0, 0, N, N);
  const lums: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    lums.push(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
  }
  const mean = lums.reduce((a, b) => a + b, 0) / lums.length;
  const variance = lums.reduce((a, b) => a + (b - mean) ** 2, 0) / lums.length;
  return { meanLuminance: mean, contrast: Math.sqrt(variance), width: img.naturalWidth, height: img.naturalHeight };
}

export function HairstyleSelector({
  sessionId,
  initialShots,
  initialSpec,
  initialRequest,
}: {
  sessionId: string;
  initialShots: Partial<Record<ShotId, string>>;
  initialSpec: FadeSpec | null;
  initialRequest: BarberRequest | null;
}) {
  const router = useRouter();
  const [shots, setShots] = React.useState(initialShots);
  const [stage, setStage] = React.useState<Stage>(
    initialRequest ? "review" : Object.keys(initialShots).length >= SHOTS.length ? "style" : "capture",
  );
  const [busy, setBusy] = React.useState<ShotId | null>(null);
  const [advice, setAdvice] = React.useState<{ shot: ShotId; text: string } | null>(null);
  const [spec, setSpec] = React.useState<FadeSpec | null>(initialSpec);
  const [request, setRequest] = React.useState<BarberRequest | null>(initialRequest);
  const [lengthIn, setLengthIn] = React.useState("");
  const [note, setNote] = React.useState("");
  const [working, setWorking] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function onPick(shot: ShotId, file: File) {
    setAdvice(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    const stats = imageStats(img);
    URL.revokeObjectURL(url);

    // Judged before upload. A refused shot costs nothing and can be retaken
    // while the person is still standing in the same place.
    const verdict = assessShot({ ...stats, shot, faceDetected: undefined });
    if (!verdict.ok) {
      setAdvice({ shot, text: verdict.advice });
      return;
    }

    setBusy(shot);
    const form = new FormData();
    form.append("sessionId", sessionId);
    form.append("shot", shot);
    form.append("file", file);
    const r = await uploadShot(form);
    setBusy(null);
    if (!r.ok) {
      setAdvice({ shot, text: r.error ?? "Upload failed." });
      return;
    }
    setShots((s) => ({ ...s, [shot]: r.url }));
  }

  const done = SHOTS.filter((s) => shots[s.id]).length;

  async function pickStyle(next: FadeSpec) {
    setSpec(next);
    setWorking(true);
    const r = await chooseStyle({
      sessionId,
      spec: next,
      lengthInches: lengthIn.trim() ? Number(lengthIn) : null,
      clientNote: note.trim() || null,
    });
    setWorking(false);
    if (r.ok && r.request) {
      setRequest(r.request);
      setStage("review");
    }
  }

  async function send() {
    setWorking(true);
    const r = await sendToBarber(sessionId);
    setWorking(false);
    if (r.ok) {
      setSent(true);
      router.refresh();
    }
  }

  return (
    <div>
      <div className="flex gap-1.5 mb-6">
        {(["capture", "style", "review"] as Stage[]).map((s, i) => (
          <div
            key={s}
            className={`flex-1 rounded-full h-1.5 ${
              ["capture", "style", "review"].indexOf(stage) >= i ? "bg-slate-900" : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      {stage === "capture" && (
        <>
          <p className="text-[13px] text-slate-500 mb-4">
            {done} of {SHOTS.length} taken. Each one gets checked before it uploads.
          </p>
          <div className="space-y-3">
            {SHOTS.map((s) => {
              const have = shots[s.id];
              return (
                <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {have ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={have} alt={s.label} className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-6 h-6 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-[15px]">{s.label}</span>
                        {have && <Check className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <p className="text-[13px] text-slate-700 mt-0.5">{s.instruction}</p>
                      <p className="text-[12px] text-slate-500 mt-0.5">{s.why}</p>

                      {advice?.shot === s.id && (
                        <p className="mt-2 text-[12px] text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                          {advice.text}
                        </p>
                      )}

                      <label className="inline-flex items-center gap-1.5 mt-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-700 border border-slate-200 hover:border-slate-300 bg-white rounded-md px-3 py-1.5 cursor-pointer">
                        {busy === s.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : have ? (
                          <RefreshCw className="w-3 h-3" />
                        ) : (
                          <Camera className="w-3 h-3" />
                        )}
                        {have ? "Retake" : "Take photo"}
                        <input
                          type="file"
                          accept="image/*"
                          capture="user"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onPick(s.id, f);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            disabled={done < SHOTS.length}
            onClick={() => setStage("style")}
            className="mt-5 w-full rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-sm px-6 py-3"
          >
            {done < SHOTS.length ? `${SHOTS.length - done} more to go` : "Pick a style"}
          </button>
        </>
      )}

      {stage === "style" && (
        <>
          <p className="text-[13px] text-slate-500 mb-4">
            These aren&apos;t pictures of other people&apos;s hair — each one is a set of
            instructions your barber can follow or push back on.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
            {STYLE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pickStyle(p.spec)}
                disabled={working}
                className={`text-left rounded-xl border p-3 transition-colors disabled:opacity-50 ${
                  spec && JSON.stringify(spec) === JSON.stringify(p.spec)
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className="block font-bold text-[14px]">{p.label}</span>
                <span className="block text-[11px] opacity-70 mt-0.5">{p.blurb}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3 bg-white border border-slate-200 rounded-xl p-4">
            <label className="block text-[13px] text-slate-700">
              Roughly how long is your hair now?
              <input
                type="number"
                step="0.25"
                min="0"
                value={lengthIn}
                onChange={(e) => setLengthIn(e.target.value)}
                placeholder="1.5"
                className="ml-2 w-24 border border-slate-200 rounded px-2 py-1 text-[13px]"
              />
              <span className="text-slate-400"> inches — a guess is fine</span>
            </label>
            <label className="block text-[13px] text-slate-700">
              Anything else?
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="leave the beard, keep the part"
                className="mt-1 w-full border border-slate-200 rounded px-2.5 py-2 text-[13px]"
              />
            </label>
          </div>
        </>
      )}

      {stage === "review" && request && (
        <>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
              What your barber gets
            </p>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">{request.headline}</h2>
            <p className="text-[14px] text-slate-700 mt-1.5">{request.placement}</p>
            <p className="text-[13px] text-slate-600 mt-2">
              <strong>Guards:</strong> {request.ladder}
            </p>

            {request.clientNote && (
              <p className="text-[13px] text-slate-700 mt-2">
                <strong>You added:</strong> &ldquo;{request.clientNote}&rdquo;
              </p>
            )}

            {!request.feasibility.achievable && (
              <p className="mt-3 text-[13px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                {request.feasibility.message}
              </p>
            )}

            {request.steps.length > 0 && (
              <details className="mt-3">
                <summary className="text-[12px] font-bold text-slate-600 cursor-pointer">
                  The passes, in order
                </summary>
                <ol className="mt-2 space-y-1 text-[13px] text-slate-700 list-decimal list-inside">
                  {request.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </details>
            )}

            <p className="mt-4 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
              {request.disclaimer}
            </p>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={() => setStage("style")}
              className="text-[11px] font-bold uppercase tracking-wider text-slate-600 border border-slate-200 bg-white rounded-md px-4 py-2.5"
            >
              Change style
            </button>
            <button
              type="button"
              disabled={working || sent}
              onClick={send}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-sm px-6 py-3"
            >
              {working ? <Loader2 className="w-4 h-4 animate-spin" /> : sent ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {sent ? "Sent to the barber" : "Send this to my barber"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function NewSessionButton({ onStart }: { onStart: (name: string) => Promise<void> }) {
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
      <label className="text-[13px] text-slate-700 flex-1 min-w-[180px]">
        <span className="block font-semibold mb-1">Who&apos;s being cut?</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Lamont"
          className="w-full border border-slate-200 rounded px-2.5 py-2 text-[13px]"
        />
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onStart(name.trim() || "Me");
          setBusy(false);
        }}
        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-5 py-2.5 disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
        Start
      </button>
    </div>
  );
}
