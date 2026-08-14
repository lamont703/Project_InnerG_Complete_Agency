"use client"

/**
 * Visual harness for the AR overlay. Development only — see layout.tsx.
 *
 * THE PROBLEM THIS SOLVES. The overlay's correctness was only observable by
 * holding a phone in front of a head. That made every change to the geometry an
 * act of faith: the unit tests prove the maths is self-consistent, but nothing
 * showed whether the bands actually sit where a barber would put them, or what
 * happens to the protractor at 60° of yaw.
 *
 * This page renders the SAME lib/fade-overlay.ts renderer the camera uses,
 * driven by synthetic landmarks at chosen poses (top) or by a real photograph
 * from local disk (bottom). scripts/ar_lab_shot.js drives it headless and
 * writes a PNG, which is a picture anyone — including an assistant with no
 * camera — can then actually look at and criticise.
 *
 * The pose grid prints "asked" against "measured" yaw under every tile. That
 * number is the harness checking itself: if the frame builder's basis were
 * skewed, the measured value would drift from the requested one and every tile
 * would say so, rather than the whole sheet looking confidently wrong.
 *
 * NOTHING HERE UPLOADS ANYTHING. The file input reads a local file into a
 * canvas in the browser. No photograph reaches a server, and none belongs in
 * this repository — put fixtures in a gitignored directory and point the script
 * at them.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { drawFadeOverlay, type OverlayReport } from "@/lib/fade-overlay"
import { syntheticHeadLandmarks, type Pose } from "@/lib/fade-synthetic-head"
import { fadeName, type FadeSpec } from "@/lib/fade-geometry"

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

const TILE = 300

const MID: FadeSpec = { height: "mid", bottom: "skin", topGuard: "3" }

interface Case {
  label: string
  pose: Pose
  spec: FadeSpec
  activeRung: number | null
}

/**
 * The sweeps worth looking at, chosen for where the geometry can break rather
 * than for coverage: yaw is where the visible/hidden arc split flips, pitch is
 * where a level band stops reading as a line, and the four heights are the
 * derivation itself.
 */
/**
 * The sweep carries a fixed 15° of pitch, which is not decoration.
 *
 * At zero pitch a level band around the head projects to a straight horizontal
 * line no matter which way the head is turned — rotating a circle about its own
 * axis maps it onto itself. That is geometrically correct and it made the first
 * version of this sweep useless: seven tiles, visibly identical, all reporting
 * "ok". A sweep that cannot fail is not a check.
 *
 * Fifteen degrees is also closer to how a phone is actually held — slightly
 * above or below the head, never exactly level with it.
 */
const YAW_SWEEP: Case[] = [-75, -50, -25, 0, 25, 50, 75].map((yaw) => ({
  label: `yaw ${yaw > 0 ? "+" : ""}${yaw}° (pitch 15°)`,
  pose: { yaw, pitch: 15 },
  spec: MID,
  activeRung: null,
}))

const TILT_SWEEP: Case[] = [
  { label: "pitch −25° (chin up)", pose: { pitch: -25 }, spec: MID, activeRung: null },
  { label: "pitch +25° (chin down)", pose: { pitch: 25 }, spec: MID, activeRung: null },
  { label: "roll +20°", pose: { roll: 20 }, spec: MID, activeRung: null },
  { label: "yaw +35°, pitch +15°", pose: { yaw: 35, pitch: 15 }, spec: MID, activeRung: null },
]

const TARGET_SWEEP: Case[] = (["taper", "low", "mid", "high"] as const).map((height) => ({
  label: fadeName({ height, bottom: "skin", topGuard: "3" }),
  pose: { yaw: 30 },
  spec: { height, bottom: "skin", topGuard: "3" },
  activeRung: null,
}))

const ACTIVE_SWEEP: Case[] = [0, 1, 2, 3].map((rung) => ({
  label: `active rung ${rung}`,
  pose: { yaw: 30 },
  spec: MID,
  activeRung: rung,
}))

function Tile({ c }: { c: Case }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const [report, setReport] = useState<OverlayReport | null>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = "#0b1220"
    ctx.fillRect(0, 0, TILE, TILE)

    const landmarks = syntheticHeadLandmarks(c.pose)
    setReport(
      drawFadeOverlay(ctx, {
        landmarks,
        width: TILE,
        height: TILE,
        spec: c.spec,
        activeRung: c.activeRung,
        mirror: false,
        debug: true,
      })
    )
  }, [c])

  const asked = c.pose.yaw ?? 0
  const measured = report ? Math.round(report.yawDeg) : null
  // A degree of slack for the rounding; more than that means the basis is off.
  const drift = measured === null ? null : Math.abs(measured - asked)

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-2">
      <canvas ref={ref} width={TILE} height={TILE} className="w-full rounded" />
      <p className="mt-1.5 text-[11px] font-semibold text-slate-300">{c.label}</p>
      <p className="font-mono text-[10px] text-slate-500">
        yaw asked {asked}° · measured {measured ?? "—"}°{" "}
        {drift !== null && (
          <span className={drift <= 1 ? "text-emerald-400" : "text-rose-400"}>{drift <= 1 ? "ok" : `drift ${drift}°`}</span>
        )}
      </p>
      {report && (
        <p className="font-mono text-[10px] text-slate-500">
          ear {report.levels.earTop.toFixed(2)} · ridge {report.levels.parietal.toFixed(2)} · line{" "}
          {report.uLine.toFixed(2)} · {report.ladder} rungs
        </p>
      )}
    </div>
  )
}

function Grid({ title, note, cases }: { title: string; note: string; cases: Case[] }) {
  return (
    <section className="mb-10">
      <h2 className="text-sm font-bold text-slate-100">{title}</h2>
      <p className="mb-3 text-xs text-slate-500">{note}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cases.map((c) => (
          <Tile key={c.label} c={c} />
        ))}
      </div>
    </section>
  )
}

/**
 * The half that synthetic landmarks cannot answer: whether MediaPipe puts the
 * landmarks where lib/fade-geometry.ts assumes on a real head, with real hair
 * over the forehead and a real ear.
 */
function RealImagePanel() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [status, setStatus] = useState("Choose a photo of a head — a mannequin is ideal.")
  const [report, setReport] = useState<OverlayReport | null>(null)

  const onFile = useCallback(async (file: File) => {
    setStatus("Loading tracker…")
    setReport(null)
    try {
      const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision")
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE)
      const landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "IMAGE",
        numFaces: 1,
      })

      const bitmap = await createImageBitmap(file)
      const canvas = canvasRef.current
      if (!canvas) return
      const W = Math.min(bitmap.width, 900)
      const H = Math.round((bitmap.height / bitmap.width) * W)
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.drawImage(bitmap, 0, 0, W, H)

      const result = landmarker.detect(canvas)
      landmarker.close()

      const raw = result.faceLandmarks?.[0]
      if (!raw?.length) {
        setStatus("No face found in that image. Tracking needs a face — a bare mannequin back-of-head will not work.")
        return
      }

      const r = drawFadeOverlay(ctx, {
        landmarks: raw,
        width: W,
        height: H,
        spec: MID,
        activeRung: 1,
        mirror: false,
        debug: true,
      })
      setReport(r)
      setStatus(r ? `Tracked. ${raw.length} landmarks.` : "Landmarks found but the head frame was rejected.")
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`)
    }
  }, [])

  return (
    <section className="mb-10">
      <h2 className="text-sm font-bold text-slate-100">Real photograph</h2>
      <p className="mb-3 text-xs text-slate-500">
        Read from local disk into a canvas. Nothing is uploaded, and no image here belongs in the repo.
      </p>
      <input
        id="ar-lab-file"
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        className="mb-3 block text-xs text-slate-400 file:mr-3 file:rounded-full file:border-0 file:bg-cyan-500 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-slate-950"
      />
      <p className="mb-2 font-mono text-[11px] text-amber-300">{status}</p>
      {report && (
        <p className="mb-2 font-mono text-[11px] text-slate-400">
          yaw {report.yawDeg.toFixed(1)}° · ear {report.levels.earTop.toFixed(3)} · temple{" "}
          {report.levels.temple.toFixed(3)} · ridge {report.levels.parietal.toFixed(3)} · line {report.uLine.toFixed(3)} ·
          head {report.headWidthPx.toFixed(0)}px
        </p>
      )}
      <canvas ref={canvasRef} className="w-full max-w-2xl rounded-lg border border-slate-800 bg-slate-950" />
    </section>
  )
}

export default function ArLabPage() {
  return (
    <main className="min-h-screen bg-slate-900 p-6 text-slate-200">
      <h1 className="text-lg font-bold text-white">AR overlay lab</h1>
      <p className="mb-8 max-w-2xl text-xs text-slate-500">
        Renders lib/fade-overlay.ts without a camera. Grey barrel and pink dots are the modelled skull and the nine
        landmarks the frame is built from — both debug-only, never shown in the live view.
      </p>

      <Grid
        title="Yaw sweep"
        note="Where the visible/hidden arc split flips. Carries 15° of pitch on purpose — at zero pitch every band projects to a straight line and the sweep cannot fail. Bands should stay wrapped on the head and the far arc should read as dashed."
        cases={YAW_SWEEP}
      />
      <Grid title="Tilt" note="Pitch and roll. A level band should stay level with the head, not with the frame." cases={TILT_SWEEP} />
      <Grid title="Targets" note="The derivation. Line height should climb taper → low → mid → high." cases={TARGET_SWEEP} />
      <Grid title="Active rung" note="Highlight and protractor placement as the student steps through the ladder." cases={ACTIVE_SWEEP} />
      <RealImagePanel />
    </main>
  )
}
