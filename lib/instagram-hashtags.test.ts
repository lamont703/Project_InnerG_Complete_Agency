import { describe, it, expect } from "vitest";
import { hashtagsFor, captionWithHashtags } from "./instagram-hashtags";

describe("the tag sets", () => {
  it("gives a style post consumer tags, not student ones", () => {
    const t = hashtagsFor("hairstyles");
    expect(t).toContain("#haircutideas");
    expect(t).not.toContain("#stateboardexam");
  });

  it("gives an exam post student tags, not haircut-shopping ones", () => {
    const t = hashtagsFor("stat");
    expect(t).toContain("#barberstudent");
    expect(t).not.toContain("#haircutideas");
  });

  it("mixes local in, since only local people can visit these shops", () => {
    expect(hashtagsFor("city-roundup").some((t) => /texas|houston|dallas|austin|satx/.test(t))).toBe(true);
  });

  it("stays well under Instagram's 30 — stuffing reads as desperation", () => {
    for (const c of ["hairstyles", "stat", "city-roundup", "deadline", "kit-list"]) {
      expect(hashtagsFor(c).length).toBeLessThanOrEqual(16);
      expect(hashtagsFor(c).length).toBeGreaterThan(8);
    }
  });

  it("never repeats a tag", () => {
    const t = hashtagsFor("city-roundup");
    expect(new Set(t).size).toBe(t.length);
  });

  it("falls back rather than returning nothing for an unknown concept", () => {
    expect(hashtagsFor("something-new").length).toBeGreaterThan(4);
  });
});

describe("appending to a caption", () => {
  it("pushes tags below the fold so the readable part stays readable", () => {
    const out = captionWithHashtags("Six cuts to ask for.", "hairstyles");
    expect(out.startsWith("Six cuts to ask for.")).toBe(true);
    expect(out).toContain("\n.\n.\n.\n");
  });

  it("does not duplicate a tag the caption already used", () => {
    const out = captionWithHashtags("Fresh #fade today", "hairstyles");
    expect((out.match(/#fade\b/g) || []).length).toBe(1);
  });

  it("leaves the caption alone when every tag is already present", () => {
    const all = hashtagsFor("hairstyles").join(" ");
    expect(captionWithHashtags(all, "hairstyles")).toBe(all);
  });
});
