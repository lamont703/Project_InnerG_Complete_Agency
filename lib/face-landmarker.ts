/**
 * Building a MediaPipe face landmarker, with the GPU fallback that keeps it
 * working on a phone.
 *
 * WHY THIS EXISTS. Both callers — the live camera view and /ar-lab — asked for
 * `delegate: "GPU"` and had nowhere to go when that failed. On mobile Safari it
 * does fail, and the failure is not graceful:
 *
 *   INTERNAL: Service "kGpuService" ... was not provided and cannot be created:
 *   emscripten_webgl_create_context() returned error 0; StartRun failed
 *
 * That is WebGL context creation being refused, which Safari does under memory
 * pressure, with a page holding many live canvases, or on a backgrounded tab —
 * all three of which describe the lab. Nothing about it is permanent and
 * nothing about it needs to be fatal: the CPU delegate produces identical
 * landmarks, just slower, and for still images the difference does not matter.
 *
 * So this tries GPU, and on any failure builds a CPU landmarker instead. It
 * reports which one it got, because "why is this slow" and "why did this fail"
 * are different questions and the answer should be visible rather than guessed.
 *
 * Having one builder also fixes a quieter problem: the WASM and model URLs were
 * written out twice, and they are version-pinned. Two copies of a pinned URL is
 * one upgrade away from a page loading a runtime that does not match its model.
 */

import type { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

/**
 * The fileset's own type, `WasmFileset`, is declared but not exported by the
 * package, so it is recovered from the resolver's return type instead of being
 * re-declared here. A hand-written stand-in would silently stop matching on a
 * version bump.
 */
type VisionFileset = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>

/**
 * Pinned, and verified byte-identical to the installed package. See the note in
 * components/ar/fade-ar-view.tsx on why these are not vendored — and that a
 * Content-Security-Policy would have to allow both hosts.
 */
export const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
export const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

export type Delegate = 'GPU' | 'CPU'

export interface LandmarkerHandle {
  landmarker: FaceLandmarker
  /** Which delegate actually got built, not which one was asked for. */
  delegate: Delegate
  /** The GPU error, when we fell back. Worth surfacing; not worth failing on. */
  fallbackReason?: string
}

/**
 * The fileset is a ~12MB WASM fetch and is delegate-independent, so it is built
 * once per page rather than once per landmarker. A GPU failure does not
 * invalidate it — only the graph that was going to run on top of it.
 */
let filesetPromise: Promise<VisionFileset> | null = null

async function getFileset(): Promise<VisionFileset> {
  if (!filesetPromise) {
    const { FilesetResolver } = await import('@mediapipe/tasks-vision')
    filesetPromise = FilesetResolver.forVisionTasks(WASM_BASE).catch((e) => {
      // Don't cache a failed fetch — a flaky network on first load would
      // otherwise poison every retry for the life of the page.
      filesetPromise = null
      throw e
    })
  }
  return filesetPromise
}

/**
 * Build a landmarker, preferring the GPU delegate and falling back to CPU.
 *
 * Throws only when CPU fails too, which means something is wrong that a
 * fallback cannot paper over — no WASM, no network, an incompatible browser.
 */
export async function createFaceLandmarker(
  runningMode: 'IMAGE' | 'VIDEO',
  numFaces = 1
): Promise<LandmarkerHandle> {
  const fileset = await getFileset()
  const { FaceLandmarker } = await import('@mediapipe/tasks-vision')

  const build = (delegate: Delegate) =>
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode,
      numFaces,
    })

  try {
    return { landmarker: await build('GPU'), delegate: 'GPU' }
  } catch (e) {
    const reason = (e as Error)?.message || String(e)
    // Deliberately catches everything rather than matching on the message. The
    // GPU failure text is a MediaPipe internal trace with file paths and node
    // names in it; pattern-matching that would break on any version bump, and
    // the fallback is safe to take for any construction failure anyway.
    return { landmarker: await build('CPU'), delegate: 'CPU', fallbackReason: reason }
  }
}
