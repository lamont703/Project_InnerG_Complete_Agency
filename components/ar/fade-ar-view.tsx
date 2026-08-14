"use client"

/**
 * The camera half of /ar-fade-trainer.
 *
 * Tracks a face, builds a skull frame from it (lib/fade-geometry.ts), and draws
 * the derived fade line and guard ladder wrapped around the head.
 *
 * WHY A FACE TRACKER FOR WORK DONE ON THE BACK OF THE HEAD. This is the honest
 * limitation and it shapes the whole design. MediaPipe finds faces, so tracking
 * survives to roughly ±70° of yaw and dies past that — there is no overlay
 * behind the head. That is survivable because the decision this tool exists to
 * make, where the line sits relative to the parietal ridge, is made at the
 * temple and the side, which are visible. So it is a planning and checking
 * instrument, not a heads-up display worn while cutting, and the UI says which.
 *
 * WHY THE ASSETS COME FROM A CDN. The WASM runtime is 12MB and the model 3.7MB.
 * Vendoring them would put 16MB into git and into every deployment of a site
 * that is mostly text pages. Both URLs are pinned to exact versions and were
 * verified byte-identical to the installed package. The tradeoff is a runtime
 * dependency on two external hosts, which is why the failure path below is a
 * real message rather than a spinner that never resolves. If a
 * Content-Security-Policy is ever added to this app, these two hosts have to be
 * allowed or this page silently stops working.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { type FadeSpec } from "@/lib/fade-geometry"
import { drawFadeOverlay } from "@/lib/fade-overlay"
import { createFaceLandmarker } from "@/lib/face-landmarker"

type Phase = "idle" | "loading" | "running" | "error"

/** Which sides the student has actually looked at. A blend is checked, not glanced at. */
export interface Coverage {
  front: boolean
  left: boolean
  right: boolean
}

interface Props {
  spec: FadeSpec
  /** Index into the plan's ladder to emphasise, or null to show the whole ladder evenly. */
  activeRung: number | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FadeArView({ spec, activeRung }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const landmarkerRef = useRef<{ detectForVideo: (v: HTMLVideoElement, t: number) => { faceLandmarks: { x: number; y: number; z: number }[][] }; close: () => void } | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef(-1)
  const yawRef = useRef(0)
  /** Set by `flip` so the effect below knows this stop() is a restart, not a stop. */
  const restartRef = useRef(false)

  // Read inside the animation loop, which is created once and must not close
  // over stale props.
  const specRef = useRef(spec)
  const rungRef = useRef(activeRung)
  useEffect(() => {
    specRef.current = spec
  }, [spec])
  useEffect(() => {
    rungRef.current = activeRung
  }, [activeRung])

  const [phase, setPhase] = useState<Phase>("idle")
  const [error, setError] = useState<string | null>(null)
  const [facing, setFacing] = useState<"user" | "environment">("user")
  const [tracking, setTracking] = useState(false)
  const [yaw, setYaw] = useState(0)
  const [coverage, setCoverage] = useState<Coverage>({ front: false, left: false, right: false })
  const [shot, setShot] = useState<string | null>(null)
  /**
   * Which MediaPipe delegate we ended up on. Shown because the CPU fallback is
   * noticeably slower, and a student whose overlay lags deserves to see why
   * rather than conclude the tool is broken.
   */
  const [delegate, setDelegate] = useState<"GPU" | "CPU">("GPU")

  const mirror = facing === "user"

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    landmarkerRef.current?.close()
    landmarkerRef.current = null
    lastTimeRef.current = -1
    setPhase("idle")
    setTracking(false)
  }, [])

  useEffect(() => stop, [stop])

  const render = useCallback(() => {
    rafRef.current = requestAnimationFrame(render)

    const video = videoRef.current
    const canvas = canvasRef.current
    const lm = landmarkerRef.current
    if (!video || !canvas || !lm || video.readyState < 2) return

    const W = video.videoWidth
    const H = video.videoHeight
    if (!W || !H) return
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W
      canvas.height = H
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.save()
    if (mirror) {
      ctx.translate(W, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, W, H)
    ctx.restore()

    // detectForVideo demands strictly increasing timestamps and re-running it on
    // a frame it has already seen throws rather than returning the cached result.
    if (video.currentTime === lastTimeRef.current) return
    lastTimeRef.current = video.currentTime

    let result
    try {
      result = lm.detectForVideo(video, performance.now())
    } catch {
      return
    }

    const raw = result.faceLandmarks?.[0]
    if (!raw?.length) {
      setTracking(false)
      return
    }
    setTracking(true)

    // Everything drawn is drawn by the shared renderer — the live view owns no
    // drawing code of its own. That is what lets /ar-lab and the headless
    // screenshot script exercise this exact code path instead of a copy that
    // drifts out of step with it.
    const report = drawFadeOverlay(ctx, {
      landmarks: raw,
      width: W,
      height: H,
      spec: specRef.current,
      activeRung: rungRef.current,
      mirror,
    })
    if (!report) return

    const deg = report.yawDeg
    // Only push a state update when the reading has actually moved. Rounding
    // alone still changes most frames, and a setState per frame re-renders the
    // component 30-60 times a second for a number nobody can read that fast.
    if (Math.abs(deg - yawRef.current) >= 2) {
      yawRef.current = deg
      setYaw(Math.round(deg))
    }
    setCoverage((c) => {
      const next = {
        front: c.front || Math.abs(deg) < 15,
        left: c.left || deg < -35,
        right: c.right || deg > 35,
      }
      return next.front === c.front && next.left === c.left && next.right === c.right ? c : next
    })
  }, [mirror])

  const start = useCallback(async () => {
    setPhase("loading")
    setError(null)
    try {
      const { landmarker, delegate } = await createFaceLandmarker("VIDEO")
      setDelegate(delegate)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })

      landmarkerRef.current = landmarker as unknown as typeof landmarkerRef.current
      streamRef.current = stream

      const video = videoRef.current
      if (!video) throw new Error("Video element went away during startup.")
      video.srcObject = stream
      await video.play()

      setPhase("running")
      rafRef.current = requestAnimationFrame(render)
    } catch (e) {
      const err = e as Error
      const name = (err as Error & { name?: string }).name
      setError(
        name === "NotAllowedError"
          ? "Camera permission was refused. The overlay needs the camera; nothing leaves the device."
          : name === "NotFoundError"
            ? "No camera found on this device."
            : `Could not start: ${err.message || String(err)}`
      )
      setPhase("error")
    }
  }, [facing, render])

  /**
   * Switching cameras means tearing the stream down and asking for the other
   * one, which cannot happen in the same tick — `start` is rebuilt when
   * `facing` changes, so the restart is deferred to the effect below rather
   * than calling a `start` that still points at the camera we just released.
   */
  const flip = useCallback(() => {
    restartRef.current = phase === "running"
    stop()
    setFacing((f) => (f === "user" ? "environment" : "user"))
  }, [phase, stop])

  useEffect(() => {
    if (!restartRef.current) return
    restartRef.current = false
    void start()
  }, [facing, start])

  const capture = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      setShot(canvas.toDataURL("image/png"))
    } catch {
      setError("Could not capture the frame.")
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 aspect-[4/3] sm:aspect-video">
        <video ref={videoRef} playsInline muted className="absolute h-px w-px opacity-0" aria-hidden="true" />
        <canvas ref={canvasRef} className="h-full w-full object-contain" />

        {phase !== "running" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            {phase === "loading" ? (
              <>
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400" />
                <p className="text-sm text-slate-300">Loading the tracker — about 16MB the first time, then cached.</p>
              </>
            ) : (
              <>
                <p className="max-w-md text-sm text-slate-300">
                  Point the camera at a mannequin head or a client. The overlay draws the fade line and the guard
                  ladder on the head itself. Video is processed on your device and never uploaded.
                </p>
                <button
                  onClick={start}
                  className="rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Start camera
                </button>
                {error && <p className="max-w-md text-sm text-rose-400">{error}</p>}
              </>
            )}
          </div>
        )}

        {phase === "running" && !tracking && (
          <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 p-3 text-center text-xs text-amber-300">
            No face in frame. Tracking works from the front round to about three-quarters — it drops at the back of
            the head, which is a limit of face tracking, not a bug.
          </div>
        )}
      </div>

      {phase === "running" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={capture}
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Freeze frame
            </button>
            <button
              onClick={flip}
              className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              Flip camera
            </button>
            <button
              onClick={stop}
              className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 transition hover:bg-slate-800"
            >
              Stop
            </button>
            <span className="ml-auto font-mono text-xs text-slate-400">
              {delegate === "CPU" && <span className="mr-3 text-amber-400">CPU mode</span>}
              viewing angle {yaw > 0 ? "+" : ""}
              {yaw}°
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500">Checked from:</span>
            {(["left", "front", "right"] as const).map((k) => (
              <span
                key={k}
                className={`rounded-full px-2.5 py-1 font-semibold ${
                  coverage[k] ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-500"
                }`}
              >
                {k}
              </span>
            ))}
            <span className="text-slate-500">
              — the back needs a mirror; the tracker cannot see it.
            </span>
          </div>
        </>
      )}

      {shot && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              Frozen frame — save it, or show it to your instructor and argue about where the line sits.
            </p>
            <div className="flex gap-2">
              <a
                href={shot}
                download="fade-plan.png"
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-950"
              >
                Save
              </a>
              <button
                onClick={() => setShot(null)}
                className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shot} alt="Frozen camera frame with the fade line and guard ladder drawn on the head" className="w-full rounded-lg" />
        </div>
      )}
    </div>
  )
}
