import { describe, it, expect } from "vitest";
import {
  MODEL_PRICING,
  extractUsage,
  sumUsage,
  costUsd,
  formatUsd,
  projectMonthlyUsd,
  EMPTY_USAGE,
} from "./ai-usage";
import { slimContext, contextChars, DROPPED_FIELDS, TRUNCATED_FIELDS } from "./chat-context-slim";
import { resolveChatKey, keyFingerprint } from "./gemini-keys";

describe("extractUsage", () => {
  it("reads Gemini's camelCase usageMetadata", () => {
    const usage = extractUsage({
      usageMetadata: { promptTokenCount: 14000, candidatesTokenCount: 150, thoughtsTokenCount: 420, totalTokenCount: 14570 },
    });
    expect(usage).toEqual({ inputTokens: 14000, outputTokens: 150, thinkingTokens: 420, reportedTotal: 14570 });
  });

  it("also reads the snake_case shape", () => {
    const usage = extractUsage({ usage_metadata: { prompt_token_count: 10, candidates_token_count: 5 } });
    expect(usage.inputTokens).toBe(10);
    expect(usage.outputTokens).toBe(5);
  });

  it("degrades to zeros rather than throwing on an unexpected response", () => {
    // The response shape is the provider's to change. Accounting must never be
    // the reason a chat answer fails.
    expect(extractUsage(undefined)).toEqual(EMPTY_USAGE);
    expect(extractUsage({})).toEqual(EMPTY_USAGE);
    expect(extractUsage({ usageMetadata: { promptTokenCount: "lots" } }).inputTokens).toBe(0);
    expect(extractUsage({ usageMetadata: { promptTokenCount: -5 } }).inputTokens).toBe(0);
  });
});

describe("costUsd", () => {
  it("bills thinking tokens at the output rate", () => {
    // The trap this pins: thinking tokens are charged but appear in no answer,
    // so counting only visible output under-reports the real bill.
    const visible = costUsd("gemini-2.5-flash", { inputTokens: 0, outputTokens: 1_000_000, thinkingTokens: 0, reportedTotal: null });
    const thinking = costUsd("gemini-2.5-flash", { inputTokens: 0, outputTokens: 0, thinkingTokens: 1_000_000, reportedTotal: null });
    expect(visible).toBeCloseTo(2.5, 6);
    expect(thinking).toBeCloseTo(2.5, 6);
  });

  it("prices a realistic message the way the invoice will", () => {
    // ~14.3k input (the measured context) and a 100-word capped answer.
    const cost = costUsd("gemini-2.5-flash", { inputTokens: 14_300, outputTokens: 150, thinkingTokens: 300, reportedTotal: null })!;
    expect(cost).toBeCloseTo(14_300 / 1e6 * 0.3 + 450 / 1e6 * 2.5, 8);
    expect(cost).toBeLessThan(0.01);
  });

  it("returns null, not zero, for a model with no published rate", () => {
    // Zero would render as "free" on the dashboard. That's a claim; null is
    // the truth, and renders as "unknown".
    expect(costUsd("some-model-we-added-later", { ...EMPTY_USAGE, inputTokens: 5000 })).toBeNull();
  });

  it("keeps every price entry traceable to a source and a date", () => {
    for (const [model, p] of Object.entries(MODEL_PRICING)) {
      expect(p.verifiedOn, `${model} has no verified date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.source.length, `${model} has no source`).toBeGreaterThan(0);
    }
  });
});

describe("sumUsage", () => {
  it("adds the turns of a tool-calling request together", () => {
    const total = sumUsage([
      { inputTokens: 14_000, outputTokens: 0, thinkingTokens: 100, reportedTotal: 14_100 },
      { inputTokens: 14_500, outputTokens: 160, thinkingTokens: 90, reportedTotal: 14_750 },
    ]);
    expect(total.inputTokens).toBe(28_500);
    expect(total.outputTokens).toBe(160);
    expect(total.thinkingTokens).toBe(190);
  });
});

describe("formatUsd", () => {
  it("never rounds a real cost away to $0.00", () => {
    expect(formatUsd(0.0043)).toBe("$0.00430");
    expect(formatUsd(0.0000021)).toBe("$0.00000");
    expect(formatUsd(0)).toBe("$0");
    expect(formatUsd(null)).toBe("—");
    expect(formatUsd(12.5)).toBe("$12.50");
  });
});

describe("projectMonthlyUsd", () => {
  it("turns an unreadable per-message cost into a decision", () => {
    expect(projectMonthlyUsd(1.4, 7)).toBeCloseTo(6, 6);
    expect(projectMonthlyUsd(5, 0)).toBeNull();
  });
});

describe("slimContext", () => {
  it("truncates a scraped article body — the measured whale", () => {
    const article = { url: "/x", raw_text: "a".repeat(9477) };
    const slim = slimContext(article) as any;
    expect(slim.raw_text.length).toBeLessThanOrEqual(TRUNCATED_FIELDS.raw_text + 1);
    expect(slim.url).toBe("/x");
  });

  it("drops image URLs, which were silently whitelisted as link targets", () => {
    // collectValidLinks() harvests any key ending in "url" into the set of
    // links the model may emit — so these were legal destinations despite the
    // prompt forbidding them.
    const row = {
      profile_url: "/shop/x",
      og_image_url: "https://places.googleapis.com/aaa",
      booksy_photo_url: "https://places.googleapis.com/bbb",
      google_images: ["https://places.googleapis.com/ccc"],
    };
    const slim = slimContext(row) as any;
    expect(slim.profile_url).toBe("/shop/x");
    expect(slim.og_image_url).toBeUndefined();
    expect(slim.booksy_photo_url).toBeUndefined();
    expect(slim.google_images).toBeUndefined();
  });

  it("never touches profile_url — it is the whole linking mechanism", () => {
    expect(DROPPED_FIELDS.has("profile_url")).toBe(false);
    const slim = slimContext({ items: [{ profile_url: "/schools/abc" }] }) as any;
    expect(slim.items[0].profile_url).toBe("/schools/abc");
  });

  it("strips ranking internals the model has no rule for", () => {
    const slim = slimContext({ name: "X", match_score: 12, base_relevance: 3, quality_bonus: 1, total_matched: 40 }) as any;
    expect(slim).toEqual({ name: "X" });
  });

  it("drops nulls and empty strings, which cost bytes and say nothing", () => {
    const slim = slimContext({ a: 1, b: null, c: "", d: 0, e: false }) as any;
    // 0 and false are real values and must survive — only null/"" go.
    expect(slim).toEqual({ a: 1, d: 0, e: false });
  });

  it("recurses through arrays and nested objects", () => {
    const slim = slimContext({ rows: [{ match_score: 1, keep: "yes", nested: { google_photos: ["x"], ok: 2 } }] }) as any;
    expect(slim.rows[0]).toEqual({ keep: "yes", nested: { ok: 2 } });
  });

  it("does not mutate its input", () => {
    const original = { match_score: 5, raw_text: "b".repeat(2000) };
    const before = JSON.stringify(original);
    slimContext(original);
    expect(JSON.stringify(original)).toBe(before);
  });

  it("measurably shrinks a payload shaped like the real one", () => {
    // Two article rows at ~9.5k of raw_text each, which measurement showed to
    // be 43% of the whole context.
    const realistic = {
      articles_and_videos: [
        { url: "https://a.example/1", raw_text: "x".repeat(9477), og_image_url: "https://img/1", match_score: 4 },
        { url: "https://a.example/2", raw_text: "y".repeat(9200), og_image_url: "https://img/2", match_score: 3 },
      ],
      barbershops: [{ profile_url: "/shop/a", shop_name: "A", google_images: Array(12).fill("https://places.googleapis.com/xxxxxxxxxxxx") }],
    };
    const before = contextChars(realistic);
    const after = contextChars(slimContext(realistic));
    expect(after).toBeLessThan(before * 0.15);
  });
});

describe("resolveChatKey", () => {
  it("prefers the chat's own key, and reports it as isolated", () => {
    const r = resolveChatKey({ GEMINI_CHAT_API_KEY: "chat-key", GEMINI_API_KEY: "shared-key" });
    expect(r.key).toBe("chat-key");
    expect(r.source).toBe("GEMINI_CHAT_API_KEY");
    expect(r.isolated).toBe(true);
  });

  it("falls back to the shared key but never calls that isolated", () => {
    // The failure this guards: believing two Cloud projects have separated
    // your quota when the deploy is still on the shared key. Believing you're
    // isolated when you aren't is what makes the next outage inexplicable.
    const r = resolveChatKey({ GEMINI_API_KEY: "shared-key" });
    expect(r.key).toBe("shared-key");
    expect(r.isolated).toBe(false);
    expect(r.note).toMatch(/competing for quota/);
  });

  it("treats whitespace-only as unset", () => {
    // An env var set to "" or " " in a dashboard is a very common way to
    // think you've configured something.
    const r = resolveChatKey({ GEMINI_CHAT_API_KEY: "   ", GEMINI_API_KEY: "shared" });
    expect(r.source).toBe("GEMINI_API_KEY");
    expect(resolveChatKey({ GEMINI_CHAT_API_KEY: "", GEMINI_API_KEY: "" }).source).toBe("none");
  });

  it("reports 'none' rather than throwing when nothing is configured", () => {
    const r = resolveChatKey({});
    expect(r.key).toBeUndefined();
    expect(r.source).toBe("none");
  });
});

describe("keyFingerprint", () => {
  it("reveals only the last 4 characters", () => {
    // The leading characters of a Google key are a fixed prefix and would
    // distinguish nothing while still being part of the secret.
    expect(keyFingerprint("AIzaSyABCDEFGHIJKLMNOP1234")).toBe("…1234");
    expect(keyFingerprint(undefined)).toBe("none");
    expect(keyFingerprint("short")).toBe("invalid");
  });

  it("never contains the start of the key", () => {
    const key = "AQ.Ab8SecretMaterialHere9999";
    expect(keyFingerprint(key)).not.toContain("AQ.Ab8");
    expect(keyFingerprint(key).length).toBeLessThanOrEqual(6);
  });
});
