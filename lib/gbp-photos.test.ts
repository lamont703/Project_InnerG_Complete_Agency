import { describe, it, expect } from "vitest";
import { analysePhotoCoverage, validateUpload, PHOTO_CATEGORIES, type MediaItem } from "./gbp-photos";

const photo = (category?: string): MediaItem => ({
  mediaFormat: "PHOTO",
  locationAssociation: category ? { category } : undefined,
});

describe("analysePhotoCoverage", () => {
  it("reports gaps even when the total looks healthy", () => {
    // The real listing: ninety photos, but one cover and the rest uncategorised.
    // Counting alone says "fine"; coverage says what's actually missing.
    const media = [photo("COVER"), ...Array.from({ length: 89 }, () => photo("ADDITIONAL"))];
    const c = analysePhotoCoverage(media);
    expect(c.total).toBe(90);
    expect(c.uncategorised).toBe(89);
    expect(c.gaps.map((g) => g.category)).toContain("INTERIOR");
    expect(c.gaps.map((g) => g.category)).toContain("TEAMS");
  });

  it("orders gaps by what matters first", () => {
    const c = analysePhotoCoverage([]);
    expect(c.gaps[0].category).toBe("COVER");
    expect(c.gaps[1].category).toBe("EXTERIOR");
  });

  it("treats an uncategorised photo as ADDITIONAL rather than dropping it", () => {
    expect(analysePhotoCoverage([photo()]).uncategorised).toBe(1);
  });

  it("marks a category with some photos but under target as thin, not missing", () => {
    const c = analysePhotoCoverage([photo("INTERIOR")]);
    const interior = c.items.find((i) => i.category === "INTERIOR")!;
    expect(interior.missing).toBe(false);
    expect(interior.thin).toBe(true);
  });

  it("ignores videos when counting photos", () => {
    const c = analysePhotoCoverage([photo("COVER"), { mediaFormat: "VIDEO", locationAssociation: { category: "INTERIOR" } }]);
    expect(c.total).toBe(1);
    expect(c.items.find((i) => i.category === "INTERIOR")!.count).toBe(0);
  });

  it("offers no food or menu categories to a barbershop", () => {
    const cats = PHOTO_CATEGORIES.map((c) => c.category);
    expect(cats).not.toContain("FOOD_AND_DRINK");
    expect(cats).not.toContain("MENU");
  });

  it("gives every category guidance on what to photograph", () => {
    // The bottleneck is knowing what to take a picture of, not the upload.
    for (const c of PHOTO_CATEGORIES) expect(c.guidance.length, c.category).toBeGreaterThan(30);
  });
});

describe("validateUpload", () => {
  const ok = { type: "image/jpeg", size: 500_000, width: 1200, height: 900 };

  it("accepts a normal photo", () => {
    expect(validateUpload(ok).ok).toBe(true);
  });

  it("rejects the wrong file type", () => {
    expect(validateUpload({ ...ok, type: "application/pdf" }).ok).toBe(false);
    expect(validateUpload({ ...ok, type: "image/gif" }).ok).toBe(false);
  });

  it("rejects a file over Google's limit and says how big it was", () => {
    const r = validateUpload({ ...ok, size: 9 * 1024 * 1024 });
    expect(r.ok).toBe(false);
    expect(r.issues[0].message).toMatch(/9\.0MB/);
  });

  it("warns about small dimensions without blocking", () => {
    const r = validateUpload({ ...ok, width: 100, height: 100 });
    expect(r.ok).toBe(true);
    expect(r.issues.some((i) => i.level === "warning")).toBe(true);
  });

  it("warns about a suspiciously tiny file", () => {
    expect(validateUpload({ ...ok, size: 2000 }).issues.some((i) => /blurry/i.test(i.message))).toBe(true);
  });

  it("copes when dimensions aren't known yet", () => {
    expect(validateUpload({ type: "image/png", size: 300_000 }).ok).toBe(true);
  });
});
