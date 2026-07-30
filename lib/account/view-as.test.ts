import { describe, it, expect } from "vitest";
import { assertNotImpersonating } from "./view-as";

/**
 * assertNotImpersonating is what keeps View As read-only (property 2 in
 * view-as.ts). Every mutating account handler calls it, so its default has to be
 * "block" for anything that says it's impersonating and "allow" for anything
 * that doesn't.
 */
describe("assertNotImpersonating", () => {
  it("allows writes on a normal, non-impersonated request", () => {
    expect(assertNotImpersonating({ impersonating: false, viewingAs: null })).toBeNull();
  });

  it("blocks writes with a 403 while View As is active", () => {
    const blocked = assertNotImpersonating({
      impersonating: true,
      viewingAs: { memberId: "m1", userId: "u1", name: "Jane Doe", email: "jane@example.com" },
    });
    expect(blocked?.status).toBe(403);
    // The admin needs to know *who* they're currently viewing as to understand
    // why the write was refused.
    expect(blocked?.error).toContain("Jane Doe");
  });

  it("still blocks when the member record couldn't be named", () => {
    const blocked = assertNotImpersonating({ impersonating: true, viewingAs: null });
    expect(blocked?.status).toBe(403);
  });

  it("treats a missing flag as not impersonating, matching resolver results that omit it", () => {
    expect(assertNotImpersonating({})).toBeNull();
  });
});
