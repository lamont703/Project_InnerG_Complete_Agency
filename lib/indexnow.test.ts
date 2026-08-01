import { describe, it, expect } from "vitest";
import { buildIndexNowRequest, toAbsoluteUrl, INDEXNOW_KEY } from "./indexnow";

describe("buildIndexNowRequest", () => {
  it("sends a single URL as a GET, which is what Bing calls streaming", () => {
    // The bug this fixes: a urlList of one is still the batch SHAPE, and Bing
    // classifies by shape. Every ordinary publish looked like a batch.
    const r = buildIndexNowRequest(["https://agency.innergcomplete.com/texas"]);
    expect(r.mode).toBe("streaming");
    expect(r.init.method).toBe("GET");
    expect(r.init.body).toBeUndefined();
  });

  it("puts the url, key and key location in the query string", () => {
    const r = buildIndexNowRequest(["https://agency.innergcomplete.com/texas"]);
    const q = new URL(r.url).searchParams;
    expect(q.get("url")).toBe("https://agency.innergcomplete.com/texas");
    expect(q.get("key")).toBe(INDEXNOW_KEY);
    expect(q.get("keyLocation")).toContain(`${INDEXNOW_KEY}.txt`);
  });

  it("encodes a URL with query parameters rather than breaking the request", () => {
    const r = buildIndexNowRequest(["https://agency.innergcomplete.com/x?a=1&b=2"]);
    expect(new URL(r.url).searchParams.get("url")).toBe("https://agency.innergcomplete.com/x?a=1&b=2");
  });

  it("still posts a urlList for a genuine batch", () => {
    const r = buildIndexNowRequest(["https://a.com/1", "https://a.com/2"]);
    expect(r.mode).toBe("batch");
    expect(r.init.method).toBe("POST");
    expect(JSON.parse(String(r.init.body)).urlList).toHaveLength(2);
  });

  it("carries the key in the body on a batch too", () => {
    const body = JSON.parse(String(buildIndexNowRequest(["https://a.com/1", "https://a.com/2"]).init.body));
    expect(body.key).toBe(INDEXNOW_KEY);
    expect(body.host).toBe("agency.innergcomplete.com");
  });
});

describe("toAbsoluteUrl", () => {
  it("absolutizes a path onto production", () => {
    expect(toAbsoluteUrl("/texas")).toBe("https://agency.innergcomplete.com/texas");
    expect(toAbsoluteUrl("texas")).toBe("https://agency.innergcomplete.com/texas");
  });

  it("leaves an absolute URL alone", () => {
    expect(toAbsoluteUrl("https://example.com/x")).toBe("https://example.com/x");
  });
});
