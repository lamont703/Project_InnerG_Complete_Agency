import { describe, it, expect } from "vitest";
import { buildBarberRequest, assessFeasibility, requestAsText, STYLE_PRESETS, CRAFT_DISCLAIMER } from "./request";

const midSkin = STYLE_PRESETS.find((p) => p.id === "mid-skin")!.spec;

describe("buildBarberRequest", () => {
  it("produces instructions, not just a name", () => {
    // The whole point: a picture makes a barber guess. This has to be
    // something they can act on — or disagree with — before the clippers start.
    const { request } = buildBarberRequest(midSkin);
    expect(request.headline.length).toBeGreaterThan(3);
    expect(request.placement.length).toBeGreaterThan(10);
    expect(request.steps.length).toBeGreaterThan(0);
  });

  it("describes placement in anatomy, not inches", () => {
    // "Two inches up" means nothing on a head it wasn't measured on.
    const { request } = buildBarberRequest(midSkin);
    expect(request.placement.toLowerCase()).toMatch(/ridge|ear|crown|occip|temple|perimeter|skull|head/);
  });

  it("always carries the craft disclaimer", () => {
    // Guard ladders are convention, not a regulated standard, and anything a
    // client sees has to say so.
    expect(buildBarberRequest(midSkin).request.disclaimer).toBe(CRAFT_DISCLAIMER);
  });

  it("carries a client note through verbatim when there is one", () => {
    const { request } = buildBarberRequest(midSkin, { clientNote: "  leave the beard alone  " });
    expect(request.clientNote).toBe("leave the beard alone");
  });

  it("treats an empty note as no note rather than an empty quote", () => {
    expect(buildBarberRequest(midSkin, { clientNote: "   " }).request.clientNote).toBeNull();
  });
});

describe("assessFeasibility", () => {
  it("says yes when there is plenty of length", () => {
    const f = assessFeasibility(midSkin, { currentInches: 3, source: "self_reported" });
    expect(f.achievable).toBe(true);
  });

  it("says how many weeks to wait rather than just refusing", () => {
    // A refusal manufactures disappointment. A plan does not.
    const f = assessFeasibility({ ...midSkin, topGuard: "4" }, { currentInches: 0.2, source: "self_reported" });
    expect(f.achievable).toBe(false);
    expect(f.weeksToWait).toBeGreaterThan(0);
    expect(f.message).toMatch(/week/);
  });

  it("hedges when no length was given instead of assuming a problem", () => {
    const f = assessFeasibility(midSkin, null);
    expect(f.achievable).toBe(true);
    expect(f.weeksToWait).toBeNull();
  });

  it("never states a self-reported length as a measurement", () => {
    const f = assessFeasibility({ ...midSkin, topGuard: "4" }, { currentInches: 0.2, source: "self_reported" });
    expect(f.message).toMatch(/about|roughly/);
  });
});

describe("requestAsText", () => {
  it("leads with the style and placement, so it reads on a phone", () => {
    const { request } = buildBarberRequest(midSkin);
    const t = requestAsText(request, "Lamont");
    const lines = t.split("\n").filter(Boolean);
    expect(lines[0]).toContain("Lamont");
    expect(t).toContain(request.headline.toUpperCase());
    expect(t).toContain(CRAFT_DISCLAIMER);
  });

  it("surfaces a length warning where the barber will see it", () => {
    const { request } = buildBarberRequest({ ...midSkin, topGuard: "4" }, {
      length: { currentInches: 0.2, source: "self_reported" },
    });
    expect(requestAsText(request)).toMatch(/Heads up/);
  });
});

describe("the preset space", () => {
  it("is points in a parameter space, not a catalogue of assets", () => {
    // Every preset is the same three knobs. That is what makes this buildable:
    // no hair models to author, no library to maintain.
    STYLE_PRESETS.forEach((p) => {
      expect(Object.keys(p.spec).sort()).toEqual(["bottom", "height", "topGuard"]);
    });
  });

  it("every preset produces a usable request", () => {
    STYLE_PRESETS.forEach((p) => {
      const { request } = buildBarberRequest(p.spec);
      expect(request.headline).toBeTruthy();
      expect(request.steps.length).toBeGreaterThan(0);
    });
  });
});

describe("an unknown guard", () => {
  it("refuses loudly instead of quietly approving everything", () => {
    // The bug this pins: `guardById(...)?.inches ?? 0` made a typo'd guard mean
    // "needs no length", so every style read as achievable. Two presets shipped
    // with guards that do not exist and this is how they passed.
    const f = assessFeasibility({ height: "mid", bottom: "skin", topGuard: "99" },
      { currentInches: 0.1, source: "self_reported" });
    expect(f.achievable).toBe(false);
    expect(f.message).toMatch(/misconfigured|Unknown guard/);
  });

  it("every shipped preset uses a guard that actually exists", () => {
    STYLE_PRESETS.forEach((p) => {
      const f = assessFeasibility(p.spec, { currentInches: 10, source: "self_reported" });
      expect(f.message).not.toMatch(/Unknown guard/);
    });
  });
});
