import { describe, expect, it } from "vitest";
import core from "./music.js";
const { bedGraph } = core;

describe("bedGraph", () => {
  /*
   * sidechaincompress takes [main][sidechain]. Wired the intuitive way round —
   * voice first, because the voice matters more — it ducks the VOICE under the
   * MUSIC. It does not error; it just sounds like a bad mix.
   */
  it("ducks the music under the voice, not the other way round", () => {
    const { graph } = bedGraph({ duration: 41 });
    expect(graph).toContain("[bed][voice_key]sidechaincompress");
    expect(graph).not.toContain("[voice_key][bed]sidechaincompress");
  });

  /*
   * The voice feeds both the sidechain trigger and the mix. Without asplit the
   * stream is consumed on first use and ffmpeg fails with a filtergraph error
   * naming neither cause.
   */
  it("splits the voice because it is needed twice", () => {
    expect(bedGraph({ duration: 41 }).graph).toContain("[0:a]asplit=2[voice_key][voice_mix]");
  });

  /*
   * Trimming before looping ends the bed early on any track shorter than the
   * video, leaving silence under the last third.
   */
  it("loops before trimming so a short track still fills the video", () => {
    const { graph } = bedGraph({ duration: 41 });
    expect(graph.indexOf("aloop")).toBeLessThan(graph.indexOf("atrim"));
  });

  it("fades out ending exactly at the end of the video", () => {
    const { graph } = bedGraph({ duration: 41, fadeOut: 2.5 });
    expect(graph).toContain("afade=t=out:st=38.500:d=2.500");
  });

  it("never starts a fade-out before zero on a very short clip", () => {
    const { graph } = bedGraph({ duration: 1, fadeOut: 2.5 });
    expect(graph).toContain("afade=t=out:st=0.000");
  });

  it("keeps the sum from clipping, like the stings do", () => {
    const { graph } = bedGraph({ duration: 41 });
    expect(graph).toContain("normalize=0");
    expect(graph).toContain("alimiter");
  });

  it("names the output the caller maps", () => {
    expect(bedGraph({ duration: 41 }).label).toBe("aout");
  });
});
