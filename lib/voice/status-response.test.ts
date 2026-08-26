import { describe, it, expect } from "vitest";

/**
 * Regression guard for the bug that made /api/voice/status return 500 on every
 * correctly-signed request while forged ones returned a tidy 403 — because the
 * rejection path returns a response WITH a body and never reached the 204.
 */
describe("204 responses", () => {
  it("throws when a null-body status is given a body — even an empty string", () => {
    expect(() => new Response("", { status: 204 })).toThrow();
  });

  it("is fine with null", () => {
    const r = new Response(null, { status: 204 });
    expect(r.status).toBe(204);
  });
});
