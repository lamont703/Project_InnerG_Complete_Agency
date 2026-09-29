import { describe, it, expect } from "vitest";
import { nextSteps, type SupportStatus } from "./agency-support-rules";

const healthy: SupportStatus = {
  googleConnection: "connected", claimedListing: true, pendingDrafts: 0, failedChanges: [], plan: "Manage",
  publishesLeft: null, autopilotFailures: 0, calendar: "live", textFailures: 0, instagram: "connected", auditScore: 88,
};

describe("where an agency should help first", () => {
  it("says nothing is stuck when nothing is", () => {
    expect(nextSteps(healthy)).toEqual(["Nothing is stuck. Everything connected is working."]);
  });

  it("puts a broken Google connection first", () => {
    const steps = nextSteps({ ...healthy, googleConnection: "revoked", pendingDrafts: 2, auditScore: 40 });
    expect(steps[0]).toMatch(/Google connection has broken/);
    // A low audit score isn't worth raising while Google can't be reached at all.
    expect(steps.join(" ")).not.toMatch(/scores 40/);
  });

  it("starts with claiming the listing when there's nothing yet", () => {
    expect(nextSteps({ ...healthy, googleConnection: "none", claimedListing: false })[0]).toMatch(/claiming the listing/);
  });

  it("names failures, waiting drafts, spent allowance, Autopilot and text problems", () => {
    const steps = nextSteps({
      ...healthy, failedChanges: [{ kind: "description", error: "too long", at: "2026-09-01" }], pendingDrafts: 1,
      publishesLeft: 0, autopilotFailures: 2, textFailures: 3, instagram: "expired", auditScore: 55,
    }).join("\n");
    for (const s of ["1 change failed", "1 draft is waiting", "free publishes", "Autopilot failed 2 times", "3 appointment texts", "Instagram connection has expired", "scores 55/100"]) {
      expect(steps).toContain(s);
    }
  });
});
