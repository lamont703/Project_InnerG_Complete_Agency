import { describe, it, expect } from "vitest";
import { assessShot, remainingShots, captureComplete, SHOTS, PROBLEM_ADVICE } from "./capture";

const good = { meanLuminance: 130, contrast: 40, width: 1080, height: 1440, shot: "front" as const, faceDetected: true };

describe("assessShot", () => {
  it("passes a well-lit, sharp, large photo", () => {
    expect(assessShot(good).ok).toBe(true);
    expect(assessShot(good).advice).toBe("");
  });

  it("catches a dark photo and says what to do about it", () => {
    const a = assessShot({ ...good, meanLuminance: 20 });
    expect(a.ok).toBe(false);
    expect(a.advice).toBe(PROBLEM_ADVICE.too_dark);
  });

  it("blames the light before the focus when a room is dark", () => {
    // A dark photo also reads as low contrast. Telling someone their photo is
    // blurry sends them to fix the wrong thing.
    const a = assessShot({ ...good, meanLuminance: 20, contrast: 5 });
    expect(a.problems).toContain("too_dark");
    expect(a.problems).toContain("blurry");
    expect(a.advice).toBe(PROBLEM_ADVICE.too_dark);
  });

  it("gives exactly one piece of advice, never a list of complaints", () => {
    const a = assessShot({ ...good, meanLuminance: 10, contrast: 2, width: 100, height: 100 });
    expect(a.problems.length).toBeGreaterThan(1);
    expect(a.advice.split("\n")).toHaveLength(1);
  });

  it("only demands a visible face on the FRONT shot", () => {
    // Requiring a face on the back-of-head shot would fail every correct capture.
    expect(assessShot({ ...good, shot: "back", faceDetected: false }).ok).toBe(true);
    expect(assessShot({ ...good, shot: "front", faceDetected: false }).ok).toBe(false);
  });

  it("rejects a photo too small to read a hairline from", () => {
    expect(assessShot({ ...good, width: 320, height: 400 }).problems).toContain("too_small");
  });

  it("catches a blown-out backlit shot", () => {
    expect(assessShot({ ...good, meanLuminance: 240 }).advice).toBe(PROBLEM_ADVICE.too_bright);
  });
});

describe("capture progress", () => {
  it("asks for the front shot first and the back near the end", () => {
    // Front is easiest and sets the frame; back is most awkward and someone who
    // has already taken four is likelier to finish.
    expect(SHOTS[0].id).toBe("front");
    expect(SHOTS.findIndex((s) => s.id === "back")).toBeGreaterThan(2);
  });

  it("counts down as shots are taken", () => {
    expect(remainingShots([])).toHaveLength(5);
    expect(remainingShots(["front", "left"])).toHaveLength(3);
    expect(captureComplete(["front", "left", "right", "back", "top"])).toBe(true);
  });

  it("is not complete just because five things were passed in", () => {
    expect(captureComplete(["front", "front", "front", "front", "front"])).toBe(false);
  });

  it("gives every shot a reason, not just an instruction", () => {
    // A step that explains itself gets finished; a chore does not.
    SHOTS.forEach((s) => {
      expect(s.why.length).toBeGreaterThan(10);
      expect(s.instruction.length).toBeGreaterThan(10);
    });
  });
});
