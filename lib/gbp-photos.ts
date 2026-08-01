/**
 * Photo coverage and uploads.
 *
 * The audit counts photos, which is the shallow version of the question. The
 * agency listing has ninety — and one COVER, forty-nine ADDITIONAL, and nothing
 * else. No interior, no exterior, no team. Google treats those categories
 * differently and customers look for them specifically: someone deciding
 * whether to walk into a barbershop wants to see the room and the people, and
 * ninety uncategorised shots don't answer that.
 *
 * So this is about coverage, not volume — which category is missing, and what
 * to take a picture of.
 *
 * Pure — no network, no storage.
 */

export type PhotoCategory =
  | "COVER" | "PROFILE" | "LOGO" | "EXTERIOR" | "INTERIOR"
  | "PRODUCT" | "AT_WORK" | "FOOD_AND_DRINK" | "MENU" | "TEAMS" | "ADDITIONAL";

export interface MediaItem {
  name?: string;
  mediaFormat?: string;
  locationAssociation?: { category?: string };
  googleUrl?: string;
  thumbnailUrl?: string;
  createTime?: string;
  dimensions?: { widthPixels?: number; heightPixels?: number };
}

export interface CategorySpec {
  category: PhotoCategory;
  label: string;
  /** What to actually photograph — the part owners get stuck on. */
  guidance: string;
  /** How many make a category feel covered. */
  target: number;
  /** Ordering: what to fix first. */
  priority: number;
}

/**
 * The categories worth chasing for this trade, in the order they're worth
 * chasing. Food and menu categories exist in the API but mean nothing to a
 * barbershop, so they aren't offered.
 */
export const PHOTO_CATEGORIES: CategorySpec[] = [
  { category: "COVER", label: "Cover photo", target: 1, priority: 1,
    guidance: "The main image on your listing. Your best shot of the shop itself." },
  { category: "EXTERIOR", label: "Outside", target: 2, priority: 2,
    guidance: "The storefront as someone approaching would see it, so they know they're in the right place." },
  { category: "INTERIOR", label: "Inside", target: 3, priority: 3,
    guidance: "The chairs, the waiting area, the room. This is what people check before walking in." },
  { category: "AT_WORK", label: "Work you've done", target: 4, priority: 4,
    guidance: "Finished cuts and styles. Good light, clean background, no faces unless the client agreed." },
  { category: "TEAMS", label: "The team", target: 2, priority: 5,
    guidance: "The people who'll be doing the work. Customers book people, not premises." },
  { category: "PROFILE", label: "Profile picture", target: 1, priority: 6,
    guidance: "The small round image next to your business name." },
  { category: "LOGO", label: "Logo", target: 1, priority: 7,
    guidance: "Your logo on a plain background, if you have one." },
];

export interface CoverageItem extends CategorySpec {
  count: number;
  missing: boolean;
  thin: boolean;
}

export interface PhotoCoverage {
  total: number;
  uncategorised: number;
  items: CoverageItem[];
  /** Categories with nothing at all, worst-priority first. */
  gaps: CoverageItem[];
}

export function analysePhotoCoverage(media: MediaItem[]): PhotoCoverage {
  const photos = media.filter((m) => (m.mediaFormat ?? "PHOTO") === "PHOTO");
  const counts = new Map<string, number>();
  for (const m of photos) {
    const c = m.locationAssociation?.category || "ADDITIONAL";
    counts.set(c, (counts.get(c) || 0) + 1);
  }

  const items: CoverageItem[] = PHOTO_CATEGORIES.map((spec) => {
    const count = counts.get(spec.category) || 0;
    return { ...spec, count, missing: count === 0, thin: count > 0 && count < spec.target };
  });

  return {
    total: photos.length,
    uncategorised: counts.get("ADDITIONAL") || 0,
    items,
    gaps: items.filter((i) => i.missing).sort((a, b) => a.priority - b.priority),
  };
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MIN_DIMENSION = 250;
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface UploadIssue {
  level: "error" | "warning";
  message: string;
}

/**
 * Check a file before it goes anywhere.
 *
 * Google's own limits, applied here so an owner gets a sentence they can act on
 * instead of a rejection from an API they can't see. The dimension check is a
 * warning rather than an error because Google accepts smaller images — they
 * just look poor on a phone, which is where the listing is read.
 */
export function validateUpload(file: { type: string; size: number; width?: number; height?: number }): {
  ok: boolean;
  issues: UploadIssue[];
} {
  const issues: UploadIssue[] = [];

  if (!ALLOWED_TYPES.includes(file.type)) {
    issues.push({ level: "error", message: "Use a JPG, PNG or WebP image." });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    issues.push({
      level: "error",
      message: `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is 5MB.`,
    });
  }
  if (file.size < 10 * 1024) {
    issues.push({ level: "warning", message: "That file is very small and may look blurry on a phone." });
  }
  if (file.width && file.height && (file.width < MIN_DIMENSION || file.height < MIN_DIMENSION)) {
    issues.push({
      level: "warning",
      message: `Google prefers images at least ${MIN_DIMENSION}px on each side.`,
    });
  }

  return { ok: !issues.some((i) => i.level === "error"), issues };
}
