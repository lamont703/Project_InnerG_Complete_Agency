import { describe, it, expect } from "vitest";
import { buildIndexNowRequest, toAbsoluteUrl, INDEXNOW_KEY } from "./indexnow";
import { SITE_URL, SITE_HOST } from "./site";

describe("buildIndexNowRequest", () => {
  it("sends a single URL as a GET, which is what Bing calls streaming", () => {
    // The bug this fixes: a urlList of one is still the batch SHAPE, and Bing
    // classifies by shape. Every ordinary publish looked like a batch.
    const r = buildIndexNowRequest([`${SITE_URL}/texas`]);
    expect(r.mode).toBe("streaming");
    expect(r.init.method).toBe("GET");
    expect(r.init.body).toBeUndefined();
  });

  it("puts the url, key and key location in the query string", () => {
    const r = buildIndexNowRequest([`${SITE_URL}/texas`]);
    const q = new URL(r.url).searchParams;
    expect(q.get("url")).toBe(`${SITE_URL}/texas`);
    expect(q.get("key")).toBe(INDEXNOW_KEY);
    expect(q.get("keyLocation")).toContain(`${INDEXNOW_KEY}.txt`);
  });

  it("encodes a URL with query parameters rather than breaking the request", () => {
    const r = buildIndexNowRequest([`${SITE_URL}/x?a=1&b=2`]);
    expect(new URL(r.url).searchParams.get("url")).toBe(`${SITE_URL}/x?a=1&b=2`);
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
    expect(body.host).toBe(SITE_HOST);
  });
});

describe("toAbsoluteUrl", () => {
  it("absolutizes a path onto production", () => {
    expect(toAbsoluteUrl("/texas")).toBe(`${SITE_URL}/texas`);
    expect(toAbsoluteUrl("texas")).toBe(`${SITE_URL}/texas`);
  });

  it("leaves an absolute URL alone", () => {
    expect(toAbsoluteUrl("https://example.com/x")).toBe("https://example.com/x");
  });
});
