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
import {
  buildHeadFrame,
  deriveFadePlan,
  headBand,
  toPixelSpace,
  scale,
  add,
  type FadeSpec,
  type HeadFrame,
  type Vec3,
} from "@/lib/fade-geometry"

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

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
// Drawing
// ---------------------------------------------------------------------------

interface P2 {
  x: number
  y: number
  visible: boolean
}

/**
 * Sequential ramp for the ladder: darkest at the shortest guard.
 *
 * Ordinal data, so one hue with a lightness ramp — a categorical palette here
 * would imply the guards are unrelated categories when they are a sequence, and
 * the sequence is the entire thing being taught.
 */
function rungColour(i: number, n: number): string {
  const t = n <= 1 ? 0 : i / (n - 1)
  const l = 34 + t * 44
  const s = 88 - t * 26
  return `hsl(196 ${s}% ${l}%)`
}

/**
 * Project a head-space point to canvas pixels.
 *
 * Orthographic on purpose. MediaPipe's landmarks already arrive in a
 * screen-aligned space, so taking x and y directly keeps the overlay locked to
 * the mesh without having to reconstruct the camera intrinsics and match them
 * exactly — which is the usual source of an overlay that tracks well at the
 * centre of frame and slides off at the edges.
 */
const project = (p: Vec3, mirror: boolean, w: number) => ({
  x: mirror ? w - p.x : p.x,
  y: p.y,
})

/** One ring around the skull, rotated so the camera-facing arc is contiguous. */
function ring(frame: HeadFrame, u: number, mirror: boolean, w: number, segments = 96): P2[] {
  const band = headBand(frame, u, segments).map((bp) => ({
    ...project(bp.point, mirror, w),
    visible: bp.visible,
  }))

  // The visible points are a contiguous run on the ellipse, but the run wraps
  // through index 0 about half the time. Rotating to the run's start lets the
  // caller stroke it as a single path instead of two.
  const start = band.findIndex((p, i) => p.visible && !band[(i - 1 + band.length) % band.length].visible)
  return start <= 0 ? band : [...band.slice(start), ...band.slice(0, start)]
}

function strokeRing(ctx: CanvasRenderingContext2D, pts: P2[], colour: string, width: number, dashHidden = true) {
  const vis = pts.filter((p) => p.visible)
  const hid = pts.filter((p) => !p.visible)

  if (dashHidden && hid.length > 1) {
    ctx.save()
    ctx.setLineDash([6, 8])
    ctx.globalAlpha = 0.3
    ctx.strokeStyle = colour
    ctx.lineWidth = width
    ctx.beginPath()
    hid.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    ctx.stroke()
    ctx.restore()
  }

  if (vis.length > 1) {
    ctx.save()
    ctx.strokeStyle = colour
    ctx.lineWidth = width
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.beginPath()
    vis.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    ctx.stroke()
    ctx.restore()
  }
}

/** Fill the strip between two rings — one rung of the ladder. */
function fillBetween(ctx: CanvasRenderingContext2D, lower: P2[], upper: P2[], colour: string, alpha: number) {
  const a = lower.filter((p) => p.visible)
  const b = upper.filter((p) => p.visible)
  if (a.length < 2 || b.length < 2) return

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = colour
  ctx.beginPath()
  a.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
  for (let i = b.length - 1; i >= 0; i--) ctx.lineTo(b[i].x, b[i].y)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/**
 * A chip of text with its own backing plate.
 *
 * The plate is not decoration — the overlay is drawn over live camera video,
 * so any text without one is unreadable against a light wall half the time.
 * `align: "right"` puts the chip's right edge at x, which is what the labels on
 * the left of the head need; measuring is done here rather than by the caller
 * because the font has to be set before measureText means anything.
 */
function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  colour: string,
  size: number,
  align: "left" | "right" = "left"
) {
  ctx.save()
  ctx.font = `600 ${size}px ui-sans-serif, system-ui, sans-serif`
  ctx.textBaseline = "middle"
  const w = ctx.measureText(text).width
  const left = align === "right" ? x - w : x
  ctx.fillStyle = "rgba(2,6,23,0.72)"
  ctx.beginPath()
  // roundRect is Safari 16+. Older engines get square corners rather than an
  // exception that kills the whole frame.
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(left - 6, y - size * 0.78, w + 12, size * 1.56, size * 0.4)
  } else {
    ctx.rect(left - 6, y - size * 0.78, w + 12, size * 1.56)
  }
  ctx.fill()
  ctx.fillStyle = colour
  ctx.fillText(text, left, y)
  ctx.restore()
}

/**
 * The elevation protractor, anchored to the skull's own surface normal.
 *
 * This is the instrument the tool is really for. Elevation is measured against
 * the curve of the head, not against the floor or the mirror, which is why it
 * is so hard to feel and so easy to get wrong — and why drawing it on the head,
 * in the right plane, is something a book cannot do. Anchored near the
 * silhouette so the arc is seen close to edge-on rather than foreshortened into
 * a line.
 */
function drawProtractor(
  ctx: CanvasRenderingContext2D,
  frame: HeadFrame,
  u: number,
  mirror: boolean,
  w: number,
  size: number
) {
  const band = headBand(frame, u, 96)
  let best = -1
  let bestScore = -Infinity
  band.forEach((bp, i) => {
    if (!bp.visible) return
    // Nearest the silhouette: the normal lying most across the screen.
    const score = Math.abs(bp.normal.x)
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  })
  if (best < 0) return

  const anchor = band[best]
  const p0 = project(anchor.point, mirror, w)
  const nEnd = project(add(anchor.point, scale(anchor.normal, frame.headWidth * 0.42)), mirror, w)
  const tEnd = project(add(anchor.point, scale(frame.up, frame.headWidth * 0.42)), mirror, w)

  const aN = Math.atan2(nEnd.y - p0.y, nEnd.x - p0.x)
  const aT = Math.atan2(tEnd.y - p0.y, tEnd.x - p0.x)
  const r = frame.headWidth * 0.3

  ctx.save()
  ctx.lineWidth = Math.max(2, size * 0.14)

  // 0° — flat against the head, the direction of the pass.
  ctx.strokeStyle = "rgba(255,255,255,0.85)"
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(p0.x, p0.y)
  ctx.lineTo(tEnd.x, tEnd.y)
  ctx.stroke()
  ctx.setLineDash([])

  // 90° — straight off the surface.
  ctx.strokeStyle = "#f59e0b"
  ctx.beginPath()
  ctx.moveTo(p0.x, p0.y)
  ctx.lineTo(nEnd.x, nEnd.y)
  ctx.stroke()

  // The sweep between them, drawn the short way round.
  let delta = aN - aT
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  ctx.strokeStyle = "#f59e0b"
  ctx.globalAlpha = 0.9
  ctx.beginPath()
  ctx.arc(p0.x, p0.y, r, aT, aT + delta, delta < 0)
  ctx.stroke()
  ctx.globalAlpha = 1

  for (const f of [0, 0.5, 1]) {
    const a = aT + delta * f
    const inner = r * 0.86
    ctx.beginPath()
    ctx.moveTo(p0.x + Math.cos(a) * inner, p0.y + Math.sin(a) * inner)
    ctx.lineTo(p0.x + Math.cos(a) * r * 1.1, p0.y + Math.sin(a) * r * 1.1)
    ctx.stroke()
  }
  ctx.restore()

  const mid = aT + delta * 0.5
  label(ctx, "flick out", p0.x + Math.cos(mid) * r * 1.35 - size, p0.y + Math.sin(mid) * r * 1.35, "#fde68a", size * 0.82)
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

    const frame = buildHeadFrame(toPixelSpace(raw, W, H))
    if (!frame) return

    const plan = deriveFadePlan(specRef.current, frame.levels)
    const size = Math.max(13, W * 0.023)
    const active = rungRef.current

    // Which way the head is turned. `fwd` points out of the face, and the
    // camera looks down -z, so a head square to the lens reads 0.
    const deg = (Math.atan2(frame.fwd.x, -frame.fwd.z) * 180) / Math.PI
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

    // Anatomy first, underneath everything — the reference points the line is
    // placed against, so a student can see the reasoning and not just the answer.
    for (const [u, text] of [
      [frame.levels.earTop, "top of ear"],
      [frame.levels.parietal, "parietal ridge"],
    ] as const) {
      const pts = ring(frame, u, mirror, W)
      strokeRing(ctx, pts, "rgba(226,232,240,0.55)", Math.max(1.5, size * 0.09), false)
      const edge = pts.filter((p) => p.visible).reduce((m, p) => (p.x > m.x ? p : m), { x: -Infinity, y: 0, visible: true })
      if (edge.x > -Infinity) label(ctx, text, edge.x + size * 0.5, edge.y, "#e2e8f0", size * 0.78)
    }

    // The ladder, rung by rung.
    plan.ladder.forEach((rung, i) => {
      const lower = ring(frame, rung.uFrom, mirror, W)
      const upper = ring(frame, rung.uTo, mirror, W)
      const colour = rungColour(i, plan.ladder.length)
      const isActive = active === i
      fillBetween(ctx, lower, upper, colour, isActive ? 0.5 : active === null ? 0.28 : 0.12)
      strokeRing(ctx, lower, colour, Math.max(1.5, size * (isActive ? 0.14 : 0.08)))

      if (isActive || active === null) {
        const edge = lower
          .filter((p) => p.visible)
          .reduce((m, p) => (p.x < m.x ? p : m), { x: Infinity, y: 0, visible: true })
        if (edge.x < Infinity) {
          label(ctx, rung.guard.label, edge.x - size * 0.8, edge.y, isActive ? "#fde68a" : "#e0f2fe", size * 0.8, "right")
        }
      }
    })

    // The fade line itself — the target, and the one thing that must be
    // unmistakable at a glance.
    const line = ring(frame, plan.uLine, mirror, W)
    ctx.save()
    ctx.shadowColor = "rgba(2,6,23,0.9)"
    ctx.shadowBlur = size * 0.5
    strokeRing(ctx, line, "#ffffff", Math.max(2.5, size * 0.2))
    ctx.restore()

    const lineEdge = line.filter((p) => p.visible).reduce((m, p) => (p.x > m.x ? p : m), { x: -Infinity, y: 0, visible: true })
    if (lineEdge.x > -Infinity) {
      label(ctx, plan.perimeterOnly ? "perimeter" : "fade line", lineEdge.x + size * 0.5, lineEdge.y, "#ffffff", size * 0.9)
    }

    if (active !== null && plan.ladder[active]) {
      const rung = plan.ladder[active]
      drawProtractor(ctx, frame, (rung.uFrom + rung.uTo) / 2, mirror, W, size)
    }
  }, [mirror])

  const start = useCallback(async () => {
    setPhase("loading")
    setError(null)
    try {
      const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision")
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE)
      const landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 1,
      })

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
