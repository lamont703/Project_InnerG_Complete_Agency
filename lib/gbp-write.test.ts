import { describe, it, expect } from "vitest";
import { revertBody } from "./gbp-write";

describe("revertBody — undoing a location change", () => {
  it("puts a DOTTED field back at its nested path (the description undo)", () => {
    const body = revertBody("locations/1", "profile.description", { profile: { description: "Old words." } });
    expect(body).toEqual({ name: "locations/1", profile: { description: "Old words." } });
    expect(body).not.toHaveProperty(["profile.description"]);
  });

  it("restores top-level fields as before", () => {
    const periods = [{ openDay: "MONDAY", openTime: { hours: 9 }, closeDay: "MONDAY", closeTime: { hours: 17 } }];
    expect(revertBody("locations/1", "regularHours", { regularHours: { periods } })).toEqual({ name: "locations/1", regularHours: { periods } });
  });

  it("clears a field that was unset before, and empties services rather than nulling them", () => {
    expect(revertBody("locations/1", "websiteUri,serviceItems", {})).toEqual({ name: "locations/1", websiteUri: null, serviceItems: [] });
    expect(revertBody("locations/1", "profile.description", {})).toEqual({ name: "locations/1", profile: { description: null } });
  });
});
