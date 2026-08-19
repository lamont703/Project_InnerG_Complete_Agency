import { describe, it, expect } from "vitest";
import { classifyAgent, isExternalAgent, SEARCH_CRAWLERS } from "./agent-classify";
import { AI_CRAWLERS, AI_CRAWLERS_UNVERIFIED } from "./robots-rules";

describe("classifyAgent", () => {
  it("files our own curl checks as a tool, not as unknown demand", () => {
    // The failure this whole module exists to fix: the table it replaced logged
    // 45 curl requests as `bot_name: null` and they were indistinguishable from
    // real crawler traffic without reading raw user-agent strings.
    expect(classifyAgent("curl/8.7.1")).toEqual({ name: "curl", kind: "tool" });
  });

  it("recognises the two AI crawlers that have actually shown up", () => {
    expect(classifyAgent("Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/bot)")).toEqual({
      name: "PerplexityBot",
      kind: "ai",
    });
    expect(classifyAgent("GPTBot/1.0")).toEqual({ name: "GPTBot", kind: "ai" });
  });

  it("does not mistake a browser-shaped crawler string for a browser", () => {
    // Googlebot's smartphone agent is a complete Mozilla/Chrome string with the
    // token appended. A shape heuristic running before the token match would
    // swallow it — and would swallow ChatGPT-User and Perplexity-User too.
    const googlebotMobile =
      "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/140.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
    expect(classifyAgent(googlebotMobile)).toEqual({ name: "Googlebot", kind: "search" });

    const chatgptUser =
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot";
    expect(classifyAgent(chatgptUser)).toEqual({ name: "ChatGPT-User", kind: "ai" });
  });

  it("prefers the longest matching token", () => {
    // Applebot-Extended contains "Applebot"; ClaudeBot and Claude-SearchBot
    // overlap on "Claude". Matching short-first would throw away the more
    // specific signal and misattribute a permission agent as a crawler.
    expect(classifyAgent("Applebot-Extended/1.0").name).toBe("Applebot-Extended");
    expect(classifyAgent("Applebot/0.1").name).toBe("Applebot");
    expect(classifyAgent("Claude-SearchBot/1.0").name).toBe("Claude-SearchBot");
    expect(classifyAgent("ClaudeBot/1.0").name).toBe("ClaudeBot");
  });

  it("separates our own jobs from outside callers", () => {
    expect(classifyAgent("shearquery-graph-validator")).toEqual({ name: "shearquery", kind: "internal" });
  });

  it("classifies an ordinary browser and an absent agent", () => {
    expect(classifyAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36"))
      .toEqual({ name: null, kind: "browser" });
    expect(classifyAgent(null)).toEqual({ name: null, kind: "unknown" });
    expect(classifyAgent("   ")).toEqual({ name: null, kind: "unknown" });
    expect(classifyAgent("something-nobody-has-seen/2.0")).toEqual({ name: null, kind: "unknown" });
  });

  it("recognises every token robots.txt grants access to", () => {
    // The drift guard. lib/robots-rules.ts opens the .md layer to these agents;
    // if one arrives and lands in `unknown`, the traffic is recorded as noise
    // and the measurement silently understates AI demand. Reading the tokens
    // from that file rather than restating them is what keeps the two in step.
    for (const token of [...AI_CRAWLERS, ...AI_CRAWLERS_UNVERIFIED]) {
      const { kind } = classifyAgent(`${token}/1.0`);
      expect(kind, `${token} should classify as ai`).toBe("ai");
    }
  });

  it("keeps the search list disjoint from the AI list", () => {
    // Overlap would make the ai/search split meaningless: whichever list ran
    // first would win, and the number that answers "is there AI demand" would
    // quietly include Googlebot.
    const ai = new Set([...AI_CRAWLERS, ...AI_CRAWLERS_UNVERIFIED].map((t) => t.toLowerCase()));
    for (const token of SEARCH_CRAWLERS) {
      expect(ai.has(token.toLowerCase()), `${token} is in both lists`).toBe(false);
    }
  });
});

describe("isExternalAgent", () => {
  it("counts crawlers as outside demand and everything else as not", () => {
    expect(isExternalAgent("ai")).toBe(true);
    expect(isExternalAgent("search")).toBe(true);
    expect(isExternalAgent("tool")).toBe(false);
    expect(isExternalAgent("internal")).toBe(false);
    expect(isExternalAgent("browser")).toBe(false);
    expect(isExternalAgent("unknown")).toBe(false);
  });
});
