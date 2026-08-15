/**
 * Where the hair actually is, per pixel.
 *
 * THE PROBLEM THIS SOLVES. Everything upstream of this file knows the geometry
 * of a skull and nothing about the head in front of the camera. Face landmarks
 * give a frame, the frame gives a parametric ellipsoid, and the bands get drawn
 * on that ellipsoid — which approximately coincides with a head but has no
 * concept of where the face stops and the hair starts. The front boundary was a
 * single hard-coded angle (FADE_FRONT_HALF_ANGLE) standing in for "the
 * hairline" on every head alive.
 *
 * On a real head with a real hairline that guess lands on the cheek, and the
 * same missing knowledge produces the ear overlap and the bands running off the
 * back of the head onto the wall. Three symptoms, one cause.
 *
 * A hair mask ends all three by construction: the overlay cannot be drawn on
 * skin, on an ear, or on a wall, because none of those are hair.
 *
 * WHAT THIS DOES NOT DO. It does not decide where the fade line belongs. That
 * is geometry — heights on the skull, the parietal ridge, the ladder spacing —
 * and a segmentation mask has no idea what a mid fade is. The two compose:
 * geometry produces the bands, the mask clips them. All the calibration work
 * stays valid.
 *
 * WHY THE SMALL MODEL. There is also a multiclass selfie segmenter that splits
 * background / hair / body-skin / face-skin / clothes, at 16MB. This one does
 * the single job we need at 782KB — twenty times smaller for a distinction we
 * would throw away.
 *
 * KNOWN RISK. MediaPipe has an open issue where the segmenter's GPU delegate
 * returns wrong categories on iOS Safari specifically
 * (google-ai-edge/mediapipe#6142) — which is the exact device this feature is
 * for. createHairSegmenter goes through the same GPU-then-CPU fallback as the
 * landmarker, and a wrong mask degrades to a clipped-away overlay rather than a
 * wrong one, so the failure is visible rather than silent.
 *
 * BEARDS ARE HAIR. The model does not distinguish scalp hair from a beard. The
 * geometry keeps the bands above the fade perimeter so it rarely matters, but
 * on a full beard the lowest rungs can legitimately clip into it.
 */

import type { ImageSegmenter } from '@mediapipe/tasks-vision'
import { WASM_BASE } from './face-landmarker'

export const HAIR_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/hair_segmenter/float32/latest/hair_segmenter.tflite'

export interface HairSegmenterHandle {
  segmenter: ImageSegmenter
  delegate: 'GPU' | 'CPU'
  fallbackReason?: string
}

/**
 * Build a hair segmenter, preferring GPU and falling back to CPU.
 *
 * Mirrors createFaceLandmarker deliberately rather than sharing code with it:
 * the two tasks have different option shapes, and the one thing that must be
 * identical is the fallback behaviour, which is short enough to state twice.
 */
export async function createHairSegmenter(
  runningMode: 'IMAGE' | 'VIDEO'
): Promise<HairSegmenterHandle> {
  const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision')
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE)

  const build = (delegate: 'GPU' | 'CPU') =>
    ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: HAIR_MODEL_URL, delegate },
      runningMode,
      // A confidence mask rather than a category mask: hair has soft edges, and
      // a hard 0/1 boundary makes the clipped overlay look torn at the hairline.
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    })

  try {
    return { segmenter: await build('GPU'), delegate: 'GPU' }
  } catch (e) {
    const reason = (e as Error)?.message || String(e)
    return { segmenter: await build('CPU'), delegate: 'CPU', fallbackReason: reason }
  }
}

/**
 * The mask as a canvas whose ALPHA channel is hair confidence.
 *
 * Shaped for `globalCompositeOperation = "destination-in"`, which keeps only
 * the pixels where the destination alpha is set — so a canvas of overlay
 * geometry composited against this one comes back clipped to the hair.
 *
 * The canvas is reused across frames. Allocating one per frame at 30fps is a
 * garbage-collection pause every few seconds, which reads as the overlay
 * stuttering and gets blamed on the tracker.
 */
let maskCanvas: HTMLCanvasElement | null = null

export function hairMaskToCanvas(confidence: Float32Array, width: number, height: number): HTMLCanvasElement | null {
  if (!width || !height || confidence.length < width * height) return null

  if (!maskCanvas) maskCanvas = document.createElement('canvas')
  if (maskCanvas.width !== width || maskCanvas.height !== height) {
    maskCanvas.width = width
    maskCanvas.height = height
  }
  const ctx = maskCanvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  const img = ctx.createImageData(width, height)
  for (let i = 0; i < width * height; i++) {
    const a = confidence[i]
    // Colour is irrelevant — only alpha survives a destination-in composite.
    img.data[i * 4 + 3] = a > 1 ? 255 : a < 0 ? 0 : Math.round(a * 255)
  }
  ctx.putImageData(img, 0, 0)
  return maskCanvas
}

/** Convenience: index of the hair confidence mask in the segmenter's output. */
export const HAIR_MASK_INDEX = 0
