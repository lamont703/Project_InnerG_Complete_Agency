import { describe, it, expect } from "vitest";
import {
  buildServiceSelection,
  mergeServiceItems,
  mergeCategories,
  MAX_ADDITIONAL_CATEGORIES,
  type ServiceItem,
} from "./gbp-services";

const structured = (id: string): ServiceItem => ({ structuredServiceItem: { serviceTypeId: id } });
const freeForm = (label: string): ServiceItem => ({
  freeFormServiceItem: { label: { displayName: label, languageCode: "en" } },
});

const CATALOGUE = [
  { serviceTypeId: "job_type_id:fade_cut", displayName: "Fade cut" },
  { serviceTypeId: "job_type_id:beard_trimming", displayName: "Beard trim" },
  { serviceTypeId: "job_type_id:buzz_cut", displayName: "Buzz cut" },
];
const IDS = new Set(CATALOGUE.map((c) => c.serviceTypeId));

describe("buildServiceSelection", () => {
  it("marks what's already offered", () => {
    const s = buildServiceSelection(CATALOGUE, [structured("job_type_id:fade_cut")]);
    expect(s.options.find((o) => o.serviceTypeId === "job_type_id:fade_cut")!.selected).toBe(true);
    expect(s.options.find((o) => o.serviceTypeId === "job_type_id:buzz_cut")!.selected).toBe(false);
  });

  it("counts free-form services the owner wrote themselves", () => {
    const s = buildServiceSelection(CATALOGUE, [structured("job_type_id:fade_cut"), freeForm("Silk press")]);
    expect(s.freeForm).toEqual(["Silk press"]);
    expect(s.offeredCount).toBe(2);
  });

  it("puts offered services first", () => {
    const s = buildServiceSelection(CATALOGUE, [structured("job_type_id:buzz_cut")]);
    expect(s.options[0].serviceTypeId).toBe("job_type_id:buzz_cut");
  });
});

describe("mergeServiceItems — must never silently drop a service", () => {
  it("keeps everything already offered when the owner adds one", () => {
    // The real hazard: serviceItems is replaced wholesale, so a merge that
    // forgets existing entries deletes them from a live listing.
    const current = [structured("job_type_id:fade_cut"), structured("job_type_id:beard_trimming")];
    const merged = mergeServiceItems({
      current,
      selectedTypeIds: ["job_type_id:fade_cut", "job_type_id:beard_trimming", "job_type_id:buzz_cut"],
      catalogueIds: IDS,
    });
    expect(merged.map((i) => i.structuredServiceItem!.serviceTypeId).sort()).toEqual([
      "job_type_id:beard_trimming",
      "job_type_id:buzz_cut",
      "job_type_id:fade_cut",
    ]);
  });

  it("carries through free-form services it doesn't understand", () => {
    const merged = mergeServiceItems({
      current: [freeForm("Locs retwist"), structured("job_type_id:fade_cut")],
      selectedTypeIds: ["job_type_id:fade_cut"],
      catalogueIds: IDS,
    });
    expect(merged.some((i) => i.freeFormServiceItem?.label?.displayName === "Locs retwist")).toBe(true);
  });

  it("carries through structured services outside the catalogue we showed", () => {
    // A service from another category, or one Google added since. Removing it
    // because it wasn't on our screen would delete something real.
    const merged = mergeServiceItems({
      current: [structured("job_type_id:unknown_from_elsewhere")],
      selectedTypeIds: [],
      catalogueIds: IDS,
    });
    expect(merged).toHaveLength(1);
  });

  it("removes only what the owner deselected from the catalogue shown", () => {
    const merged = mergeServiceItems({
      current: [structured("job_type_id:fade_cut"), structured("job_type_id:buzz_cut")],
      selectedTypeIds: ["job_type_id:fade_cut"],
      catalogueIds: IDS,
    });
    expect(merged.map((i) => i.structuredServiceItem!.serviceTypeId)).toEqual(["job_type_id:fade_cut"]);
  });

  it("ignores a selected id that was never in the catalogue", () => {
    const merged = mergeServiceItems({
      current: [],
      selectedTypeIds: ["job_type_id:not_offered_here"],
      catalogueIds: IDS,
    });
    expect(merged).toHaveLength(0);
  });

  it("appends new free-form services without duplicating existing ones", () => {
    const merged = mergeServiceItems({
      current: [freeForm("Silk press")],
      selectedTypeIds: [],
      catalogueIds: IDS,
      newFreeForm: ["  Silk Press  ", "Locs retwist", "   "],
    });
    const labels = merged.map((i) => i.freeFormServiceItem?.label?.displayName);
    expect(labels).toEqual(["Silk press", "Locs retwist"]);
  });

  it("an empty selection with no current services yields an empty list, so the caller's guard applies", () => {
    expect(mergeServiceItems({ current: [], selectedTypeIds: [], catalogueIds: IDS })).toEqual([]);
  });
});

describe("mergeCategories", () => {
  const primary = { name: "categories/gcid:barber_shop", displayName: "Barber shop" };
  const cat = (n: string, d: string) => ({ name: `categories/gcid:${n}`, displayName: d });

  it("adds without dropping what's already there", () => {
    const r = mergeCategories({
      primary,
      currentAdditional: [cat("beauty_salon", "Beauty salon")],
      add: [cat("loctician", "Loctician service")],
    });
    expect(r.additionalCategories.map((c) => c.displayName)).toEqual(["Beauty salon", "Loctician service"]);
  });

  it("never changes the primary category through this path", () => {
    // What a business *is* isn't a bulk-edit operation.
    const r = mergeCategories({
      primary,
      currentAdditional: [],
      add: [cat("hair_salon", "Hair salon")],
    });
    expect(r.primaryCategory).toEqual(primary);
  });

  it("won't duplicate a category, or re-add the primary as an additional", () => {
    const r = mergeCategories({
      primary,
      currentAdditional: [cat("beauty_salon", "Beauty salon")],
      add: [cat("beauty_salon", "Beauty salon"), primary],
    });
    expect(r.additionalCategories).toHaveLength(1);
  });

  it("removes what the owner asked to remove", () => {
    const r = mergeCategories({
      primary,
      currentAdditional: [cat("beauty_salon", "Beauty salon"), cat("software", "Software company")],
      add: [],
      remove: ["categories/gcid:software"],
    });
    expect(r.additionalCategories.map((c) => c.displayName)).toEqual(["Beauty salon"]);
  });

  it("enforces Google's cap and reports what didn't fit", () => {
    const many = Array.from({ length: 12 }, (_, i) => cat(`c${i}`, `C${i}`));
    const r = mergeCategories({ primary, currentAdditional: [], add: many });
    expect(r.additionalCategories).toHaveLength(MAX_ADDITIONAL_CATEGORIES);
    expect(r.dropped).toHaveLength(12 - MAX_ADDITIONAL_CATEGORIES);
  });
});
