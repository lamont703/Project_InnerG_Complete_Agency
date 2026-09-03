import { describe, expect, it } from "vitest";
import core from "./transitions.js";
const { cutawayFilters, TRANSITIONS } = core;

const OPTS = { W: 1080, H: 1920, FPS: 25, prevLabel: "0:v" };
const CUT = { at: 10, seconds: 2.5 };

describe("cutawayFilters", () => {
  it("chains onto the previous label and names its own", () => {
    const { chain, label } = cutawayFilters(0, { ...CUT }, OPTS);
    expect(label).toBe("v0");
    expect(chain[chain.length - 1]).toContain("[0:v][b0]overlay");
    expect(chain[chain.length - 1]).toContain("[v0]");
  });

  it("gates the overlay to the cutaway window", () => {
    const { chain } = cutawayFilters(0, { ...CUT }, OPTS);
    expect(chain.join(";")).toContain("enable='between(t,10.000,12.500)'");
  });

  it("offsets the clip so it plays at the right moment", () => {
    const { chain } = cutawayFilters(0, { ...CUT }, OPTS);
    expect(chain[0]).toContain("setpts=PTS-STARTPTS+10.000/TB");
    expect(chain[0]).toContain("trim=start=0:duration=2.500");
  });

  /*
   * fade's alpha option needs somewhere to write. On yuv420p the option is
   * accepted and does nothing, so the dissolve silently becomes a hard cut and
   * nothing anywhere reports it.
   */
  it("converts to yuva420p BEFORE fading alpha, or the fade does nothing", () => {
    const f = cutawayFilters(0, { ...CUT, transition: "dissolve" }, OPTS).chain[0];
    expect(f).toContain("format=yuva420p");
    expect(f.indexOf("format=yuva420p")).toBeLessThan(f.indexOf("alpha=1"));
    expect(f).toContain("fade=t=in:st=10.000");
    expect(f).toContain("fade=t=out:st=12.150");
  });

  it("slides horizontally by moving x and leaving y alone", () => {
    const f = cutawayFilters(0, { ...CUT, transition: "slide-left" }, OPTS).chain[1];
    expect(f).toContain("y='0'");
    expect(f).toContain("1080*");
  });

  it("slides vertically by moving y and leaving x alone", () => {
    const f = cutawayFilters(0, { ...CUT, transition: "slide-up" }, OPTS).chain[1];
    expect(f).toContain("x='0'");
    expect(f).toContain("1920*");
  });

  /*
   * A transition longer than half the cutaway means the entry and exit overlap:
   * the clip fades up and straight back down and never fully arrives.
   */
  it("never animates for longer than half the cutaway", () => {
    const f = cutawayFilters(0, { at: 5, seconds: 0.5, transition: "dissolve" }, OPTS).chain[0];
    expect(f).toContain("fade=t=in:st=5.000:d=0.240");
  });

  it("falls back to a dissolve for an unknown transition name", () => {
    const f = cutawayFilters(0, { ...CUT, transition: "barrel-roll" }, OPTS).chain[0];
    expect(f).toContain("format=yuva420p");
  });

  it("offers the transitions the plan is allowed to name", () => {
    expect(TRANSITIONS).toContain("dissolve");
    expect(TRANSITIONS).toContain("slide-up");
    expect(TRANSITIONS).toContain("cut");
  });
});

describe("whip", () => {
  it("moves about three times as fast as a slide", () => {
    const whip = cutawayFilters(0, { at: 10, seconds: 3, transition: "whip-left" }, OPTS).chain[1];
    const slide = cutawayFilters(0, { at: 10, seconds: 3, transition: "slide-left" }, OPTS).chain[1];
    expect(whip).toContain("0.120");
    expect(slide).toContain("0.350");
    expect(whip).not.toEqual(slide);
  });

  it("uses the same geometry as the slide it is named after", () => {
    const w = cutawayFilters(0, { at: 10, seconds: 3, transition: "whip-up" }, OPTS).chain[1];
    expect(w).toContain("x='0'");
    expect(w).toContain("1920*");
  });
});
