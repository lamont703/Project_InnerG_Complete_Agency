import { describe, it, expect } from "vitest";
import { missingMaterial } from "@/lib/video-agent/materials";

const spec = (segments: any[]) => ({ kind: "spec" as const, spec: { segments } });

describe("missingMaterial", () => {
  it("refuses a Lookbook with no grid — the case that shipped a fabricated proposal", () => {
    expect(missingMaterial({ kind: "grid" } as any, [])).toEqual([
      "a Lookbook needs a 2x3 grid image attached, and none was",
    ]);
  });

  it("passes a Lookbook once a grid is attached", () => {
    expect(missingMaterial({ kind: "grid" } as any, [{ mimeType: "image/png" }])).toEqual([]);
  });

  it("asks for nothing for a Data Reel — the figure is in the words, not a file", () => {
    expect(missingMaterial({ kind: "card" } as any, [])).toEqual([]);
  });

  it("refuses a News Desk that shows the article with no screenshot", () => {
    expect(missingMaterial(spec([{ mode: "voice", visual: "headline" }]) as any, [])).toHaveLength(1);
  });

  it("accepts a Drive link in place of an attached clip", () => {
    expect(missingMaterial(spec([{ mode: "clip" }]) as any, [{ driveFileId: "abc" }])).toEqual([]);
  });

  it("refuses a clip segment with neither a video nor a link", () => {
    expect(missingMaterial(spec([{ mode: "clip" }]) as any, [{ mimeType: "image/png" }])).toHaveLength(1);
  });

  it("does not ask for an image when every segment is avatar", () => {
    expect(missingMaterial(spec([{ mode: "avatar" }, { mode: "avatar" }]) as any, [])).toEqual([]);
  });
});
