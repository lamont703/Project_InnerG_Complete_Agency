import { describe, expect, it } from "vitest";
import { assertPublishChannel, YOUTUBE_PUBLISH_CHANNEL_ID } from "@/lib/youtube-publish";

/*
 * The two channels share a title, so this id is the only thing that tells them
 * apart. The older channel is the one uploads silently went to before this
 * check existed — it must be refused, not just "not preferred".
 */
describe("assertPublishChannel", () => {
  it("publishes to @shearqueryai", () => {
    expect(YOUTUBE_PUBLISH_CHANNEL_ID).toBe("UC2R_pYoza1bxm-iOhWtO6AA");
    expect(() => assertPublishChannel(["UC2R_pYoza1bxm-iOhWtO6AA"])).not.toThrow();
  });

  it("refuses the older @shearquery channel", () => {
    expect(() => assertPublishChannel(["UC0gJXad-Y8_Mlg8rMN8U57Q"])).toThrow(/refusing to upload/);
  });

  it("refuses a token with no channel, or with more than one", () => {
    expect(() => assertPublishChannel([])).toThrow(/no channel/);
    expect(() => assertPublishChannel(["UC2R_pYoza1bxm-iOhWtO6AA", "UC0gJXad-Y8_Mlg8rMN8U57Q"])).toThrow();
  });
});
