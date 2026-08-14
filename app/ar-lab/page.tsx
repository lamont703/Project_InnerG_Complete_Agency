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
import { drawFadeOverlay, measureU, type Measurement, type OverlayReport } from "@/lib/fade-overlay"
import { syntheticHeadLandmarks, type Pose } from "@/lib/fade-synthetic-head"
import { fadeName, PARIETAL_ABOVE_FOREHEAD, type FadeSpec } from "@/lib/fade-geometry"

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
 *
 * Takes a whole fixture set at once rather than one file at a time, because the
 * question being asked is comparative. A single head tells you the overlay
 * landed somewhere plausible; ten tell you whether a level drifts.
 *
 * CALIBRATION. Click a tracked head where the anatomy actually is and the
 * measured height is solved back out of that frame (measureU). That is what
 * turns PARIETAL_ABOVE_FOREHEAD from a guess into a number with a mean and a
 * spread behind it — it is the ceiling the whole high/mid/low derivation is
 * measured against, and it is the one constant in the model with no evidence
 * under it.
 *
 * Marks are kept in localStorage, keyed by filename. Clicking twenty heads and
 * losing it to a reload is the sort of thing that makes a tool get used once.
 */
type Mode = "parietal" | "earTop"

const MODES: { id: Mode; label: string; hint: string; derived: (l: OverlayReport["levels"]) => number }[] = [
  {
    id: "parietal",
    label: "Parietal ridge",
    hint: "Click the corner where the SIDE of the skull turns into the TOP. Highest point of the side, not the crown.",
    derived: (l) => l.parietal,
  },
  {
    id: "earTop",
    label: "Top of ear",
    hint: "Click the highest point where the ear meets the head. Checks the eye-corner proxy against a real ear.",
    derived: (l) => l.earTop,
  },
]

interface Result {
  name: string
  png: string | null
  report: OverlayReport | null
  status: string
  landmarks: { x: number; y: number; z: number }[] | null
  w: number
  h: number
}

interface Mark extends Measurement {
  /** Fractions of the canvas, so the crosshair survives responsive resizing. */
  fx: number
  fy: number
}

/**
 * Cheap invariants worth checking on every real head, since they are the ones
 * that would silently make the overlay wrong rather than make it fail. If the
 * ear lands above the temple on a real face, the landmark indices are wrong for
 * that head and no amount of looking at the picture will make that obvious.
 */
function verdict(r: OverlayReport | null): { ok: boolean; note: string } {
  if (!r) return { ok: false, note: "no frame" }
  const { earCanal, earTop, temple, parietal } = r.levels
  const problems: string[] = []
  if (!(earCanal < earTop)) problems.push("ear inverted")
  if (!(earTop < temple)) problems.push("temple below ear")
  if (!(temple < parietal)) problems.push("ridge below temple")
  if (!(r.uLine > earTop && r.uLine < parietal)) problems.push("line outside ear..ridge")
  return { ok: problems.length === 0, note: problems.join(", ") || "ordering ok" }
}

const STORE_KEY = "ar-lab-calibration-v1"

function RealImagePanel() {
  const [results, setResults] = useState<Result[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("Choose fixture images — mannequins ideal. Nothing is uploaded.")
  const [mode, setMode] = useState<Mode>("parietal")
  const [marks, setMarks] = useState<Record<string, Partial<Record<Mode, Mark>>>>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) setMarks(JSON.parse(raw))
    } catch {
      /* a corrupt store is not worth failing the page over */
    }
  }, [])

  const record = useCallback((name: string, m: Mode, mark: Mark | null) => {
    setMarks((prev) => {
      const next = { ...prev, [name]: { ...prev[name], [m]: mark ?? undefined } }
      if (!mark) delete next[name][m]
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(next))
      } catch {
        /* private mode, quota — the marks still work for this session */
      }
      return next
    })
  }, [])

  const onFiles = useCallback(async (files: File[]) => {
    setBusy(true)
    setResults([])
    setStatus("Loading tracker…")
    try {
      const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision")
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE)
      const landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "IMAGE",
        numFaces: 1,
      })

      const out: Result[] = []
      for (const file of [...files].sort((a, b) => a.name.localeCompare(b.name))) {
        setStatus(`Processing ${file.name}…`)
        try {
          const bitmap = await createImageBitmap(file)
          const W = Math.min(bitmap.width, 700)
          const H = Math.round((bitmap.height / bitmap.width) * W)
          const canvas = document.createElement("canvas")
          canvas.width = W
          canvas.height = H
          const ctx = canvas.getContext("2d")!
          ctx.drawImage(bitmap, 0, 0, W, H)

          const raw = landmarker.detect(canvas).faceLandmarks?.[0]
          if (!raw?.length) {
            out.push({ name: file.name, png: canvas.toDataURL(), report: null, status: "no face found", landmarks: null, w: W, h: H })
            continue
          }
          const report = drawFadeOverlay(ctx, {
            landmarks: raw,
            width: W,
            height: H,
            spec: MID,
            activeRung: null,
            mirror: false,
            debug: false,
          })
          out.push({
            name: file.name,
            png: canvas.toDataURL(),
            report,
            status: report ? "tracked" : "frame rejected",
            landmarks: raw.map((p) => ({ x: p.x, y: p.y, z: p.z })),
            w: W,
            h: H,
          })
        } catch (e) {
          out.push({ name: file.name, png: null, report: null, status: `error: ${(e as Error).message}`, landmarks: null, w: 0, h: 0 })
        }
        setResults([...out])
      }
      landmarker.close()
      setStatus(`Done — ${out.filter((r) => r.report).length}/${out.length} tracked.`)
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }, [])

  /**
   * Marking is on pointer events rather than click, and it matters on a phone.
   *
   * A click handler on a plain <img> is reliable under a mouse and flaky under
   * a finger — and this tool is most useful on the device the AR actually runs
   * on. Pointer events fire for both. The movement threshold is what keeps a
   * scroll that happens to start on a head from dropping a mark: a drag past a
   * few pixels is someone moving the page, not measuring a skull.
   */
  const downRef = useRef<{ x: number; y: number } | null>(null)

  const onPointerUp = useCallback(
    (r: Result, e: React.PointerEvent<HTMLImageElement>) => {
      const down = downRef.current
      downRef.current = null
      if (!r.landmarks || !down) return
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) return

      const rect = e.currentTarget.getBoundingClientRect()
      // The image is CSS-scaled to its column, so taps arrive in display pixels
      // and the solver works in canvas pixels.
      const x = ((e.clientX - rect.left) / rect.width) * r.w
      const y = ((e.clientY - rect.top) / rect.height) * r.h
      const m = measureU(r.landmarks, r.w, r.h, false, x, y)
      if (m) record(r.name, mode, { ...m, fx: x / r.w, fy: y / r.h })
    },
    [mode, record]
  )

  const active = MODES.find((m) => m.id === mode)!

  /**
   * The aggregate, as text. Rendered into a stable id so the headless script
   * can read the numbers out — a mean that only exists as pixels in a
   * screenshot cannot be pasted into a constant.
   *
   * Reports the mean DELTA against what the model currently derives, with a
   * standard error, and refuses to call it actionable until that delta clears
   * twice the error across at least three heads.
   *
   * That gate is the point. The first real reading came back with a parietal
   * delta of +0.023 at a 2.1% residual — a difference smaller than the
   * uncertainty of the click that produced it — under a line reading
   * "PARIETAL_ABOVE_FOREHEAD = 0.123". Printing that next to a single imprecise
   * tap is an invitation to edit a constant on the strength of nothing, and a
   * guess relabelled as a measurement is worse than the guess, because nobody
   * goes back and re-examines it.
   *
   * The two levels behaving differently is expected rather than a fault: the
   * top of an ear is a crisp thing to point at, the parietal ridge is a diffuse
   * curve with no line on it. Parietal residuals will always be worse, so
   * parietal needs more heads to average down — not better technique.
   */
  const summary = MODES.map((m) => {
    const rows = results
      .filter((r) => r.report && marks[r.name]?.[m.id])
      .map((r) => ({ r, mark: marks[r.name]![m.id]!, derived: m.derived(r.report!.levels) }))

    if (!rows.length) return `${m.label} — no marks yet`

    const deltas = rows.map((x) => x.mark.u - x.derived)
    const n = deltas.length
    const meanDelta = deltas.reduce((a, b) => a + b, 0) / n
    // Sample standard deviation, so n=1 is undefined rather than a flattering 0.
    const sd = n > 1 ? Math.sqrt(deltas.reduce((a, b) => a + (b - meanDelta) ** 2, 0) / (n - 1)) : NaN
    const sem = n > 1 ? sd / Math.sqrt(n) : NaN

    const lines = rows.map((x) => {
      const resid = (x.mark.dist / x.mark.headWidthPx) * 100
      const d = x.mark.u - x.derived
      const flag = resid > 5 ? "  <- residual too high, click missed the head" : ""
      return `  ${x.r.name.slice(0, 30).padEnd(32)} measured ${x.mark.u.toFixed(3)}  derived ${x.derived.toFixed(3)}  delta ${d >= 0 ? "+" : ""}${d.toFixed(3)}  residual ${resid.toFixed(1)}%${flag}`
    })

    let call: string
    if (n < 3) {
      call = `  n=${n} — NOT A MEASUREMENT YET. Mark at least 3 heads before reading anything into this.`
    } else if (!(Math.abs(meanDelta) > 2 * sem)) {
      call = `  mean delta ${meanDelta >= 0 ? "+" : ""}${meanDelta.toFixed(3)} +/- ${sem.toFixed(3)} (sem, n=${n}) — indistinguishable from the current value. No change justified.`
    } else {
      const suggestion =
        m.id === "parietal"
          ? `  ->  PARIETAL_ABOVE_FOREHEAD = ${(PARIETAL_ABOVE_FOREHEAD + meanDelta).toFixed(3)} (currently ${PARIETAL_ABOVE_FOREHEAD})`
          : `  ->  the eye-corner proxy reads ${meanDelta > 0 ? "low" : "high"} by ${Math.abs(meanDelta).toFixed(3)}`
      call = `  mean delta ${meanDelta >= 0 ? "+" : ""}${meanDelta.toFixed(3)} +/- ${sem.toFixed(3)} (sem, n=${n}) — real at 2 sem.\n${suggestion}`
    }

    return [`${m.label} — ${n} mark${n === 1 ? "" : "s"}`, ...lines, call].join("\n")
  }).join("\n\n")

  return (
    <section className="mb-10">
      <h2 className="text-sm font-bold text-slate-100">Real photographs</h2>
      <p className="mb-3 text-xs text-slate-500">
        Read from local disk into a canvas. Nothing is uploaded, and no image here belongs in the repo.
      </p>
      <input
        id="ar-lab-file"
        type="file"
        accept="image/*"
        multiple
        disabled={busy}
        onChange={(e) => e.target.files?.length && onFiles(Array.from(e.target.files))}
        className="mb-3 block text-xs text-slate-400 file:mr-3 file:rounded-full file:border-0 file:bg-cyan-500 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-slate-950"
      />
      <p className="mb-3 font-mono text-[11px] text-amber-300">{status}</p>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Measuring</span>
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              mode === m.id ? "bg-amber-400 text-slate-950" : "border border-slate-700 text-slate-300"
            }`}
          >
            {m.label}
          </button>
        ))}
        <button
          onClick={() => {
            setMarks({})
            try {
              localStorage.removeItem(STORE_KEY)
            } catch {
              /* nothing to clear */
            }
          }}
          className="rounded-full border border-slate-800 px-3 py-1.5 text-xs text-slate-500"
        >
          Clear marks
        </button>
      </div>
      <p className="mb-3 text-xs text-amber-300/80">{active.hint} Click again to move it.</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((r) => {
          const v = verdict(r.report)
          const mark = marks[r.name]?.[mode]
          return (
            <div key={r.name} className="rounded-lg border border-slate-800 bg-slate-950 p-2">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.png && (
                  <img
                    src={r.png}
                    alt={`Overlay on ${r.name}`}
                    onPointerDown={(e) => {
                      downRef.current = { x: e.clientX, y: e.clientY }
                    }}
                    onPointerUp={(e) => onPointerUp(r, e)}
                    className={`w-full rounded ${r.landmarks ? "cursor-crosshair" : ""}`}
                  />
                )}
                {mark && (
                  <span
                    className="pointer-events-none absolute block h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-400 bg-amber-400/30"
                    style={{ left: `${mark.fx * 100}%`, top: `${mark.fy * 100}%` }}
                  />
                )}
              </div>
              <p className="mt-1.5 truncate text-[11px] font-semibold text-slate-300" title={r.name}>
                {r.name}
              </p>
              <p className="font-mono text-[10px] text-slate-500">
                {r.status}
                {r.report && (
                  <>
                    {" · "}
                    <span className={v.ok ? "text-emerald-400" : "text-rose-400"}>{v.note}</span>
                  </>
                )}
              </p>
              {r.report && (
                <p className="font-mono text-[10px] text-slate-500">
                  yaw {r.report.yawDeg.toFixed(0)}° · canal {r.report.levels.earCanal.toFixed(2)} · ear{" "}
                  {r.report.levels.earTop.toFixed(2)} · temple {r.report.levels.temple.toFixed(2)} · ridge{" "}
                  {r.report.levels.parietal.toFixed(2)} · line {r.report.uLine.toFixed(2)}
                </p>
              )}
              {mark && r.report && (
                <p className="font-mono text-[10px] text-amber-300">
                  marked {mark.u.toFixed(3)} vs derived {active.derived(r.report.levels).toFixed(3)} · residual{" "}
                  {((mark.dist / mark.headWidthPx) * 100).toFixed(1)}% head
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold text-slate-100">Calibration</h3>
        <button
          onClick={() => {
            const el = document.getElementById("calibration-summary") as HTMLTextAreaElement | null
            if (!el) return
            el.select()
            // navigator.clipboard needs a secure context. Testing on a phone
            // means http://<lan-ip>, which is not one — so selecting the text is
            // the fallback that always works, and the copy is best effort.
            navigator.clipboard?.writeText(summary).catch(() => {})
          }}
          className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-950"
        >
          Select / copy
        </button>
      </div>
      <textarea
        id="calibration-summary"
        readOnly
        value={summary}
        rows={Math.min(24, summary.split("\n").length + 1)}
        className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-300"
      />
      <p className="mt-2 text-xs text-slate-500">
        Residual is how far the click sat from the ring that matched it, as a percentage of head width. Anything past
        about 5% means the click missed the head and the height is not a measurement.
      </p>
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
