import { describe, it, expect } from "vitest";
import { kindOf, isUndoable, describeChange, sourceOf } from "./gbp-change-describe";

describe("change history wording", () => {
  it("returns the preview a Claude draft was approved with, untouched", () => {
    const preview = ["BEFORE: Saturday 9am–6pm", "AFTER: Saturday 10am–4pm"];
    expect(describeChange({ surface: "regularHours", proposed: { kind: "regular_hours", preview } })).toEqual(preview);
  });

  it("derives a kind for website rows, which never stored one", () => {
    expect(kindOf({ surface: "specialHours", proposed: {} })).toBe("holiday_hours");
    expect(kindOf({ surface: "serviceItems", proposed: {} })).toBe("services");
    expect(kindOf({ surface: "media", proposed: { action: "delete" } })).toBe("photo_remove");
    expect(kindOf({ surface: "somethingNew", proposed: {} })).toBeNull();
  });

  it("describes website rows from what each route stored", () => {
    expect(describeChange({ surface: "reviews", proposed: { comment: "Thanks Dee!" } })).toEqual(['Reply: "Thanks Dee!"']);
    expect(
      describeChange({
        surface: "categories",
        proposed: { added: [{ name: "categories/gcid:hair_salon", displayName: "Hair salon" }], removed: ["categories/gcid:spa"] },
      })
    ).toEqual(["Added: Hair salon", "Removed: spa"]);
  });

  it("offers no undo for the two changes that have none", () => {
    expect(isUndoable("booking_link")).toBe(false);
    expect(isUndoable("photo_remove")).toBe(false);
    expect(isUndoable("regular_hours")).toBe(true);
    expect(isUndoable(null)).toBe(false);
  });

  it("tells Claude changes from website ones by origin", () => {
    expect(sourceOf({ surface: "x", origin: "claude:sq_abc1234" })).toEqual({ via: "claude", keyPrefix: "sq_abc1234" });
    expect(sourceOf({ surface: "x", origin: "owner holiday hours" })).toEqual({ via: "website" });
  });
});
