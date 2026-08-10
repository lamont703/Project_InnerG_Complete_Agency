import { describe, it, expect } from "vitest";
import {
  AI_CRAWLERS,
  DELIBERATELY_EXCLUDED,
  PRIVATE_PATHS,
  buildRobotsRules,
} from "./robots-rules";

/**
 * The bug these tests exist for shipped and stayed shipped: a named group
 * carrying only an `Allow` does not inherit the wildcard group's `Disallow`
 * lines, so seven AI crawlers were being handed /admin/ and /dashboard/. The
 * served file looked correct and every validator passed it.
 */

describe("group isolation", () => {
  it("repeats the private disallows into every group", () => {
    // Google: "User agent specific groups and global groups (*) are not
    // combined." A group without these lines grants everything not listed.
    for (const rule of buildRobotsRules()) {
      for (const p of PRIVATE_PATHS) {
        expect(rule.disallow, `${rule.userAgent} is missing ${p}`).toContain(p);
      }
    }
  });

  it("never leaves a group with an allow and no disallow", () => {
    for (const rule of buildRobotsRules()) {
      expect(rule.disallow?.length ?? 0, String(rule.userAgent)).toBeGreaterThan(0);
    }
  });
});

describe("the .md layer", () => {
  const rules = buildRobotsRules();
  const wildcard = rules.find((r) => r.userAgent === "*")!;
  const ai = rules.find((r) => r.userAgent !== "*")!;

  it("hides Markdown twins from general search engines", () => {
    // They are duplicates of the HTML pages; indexing both is a
    // duplicate-content problem of our own making.
    expect(wildcard.disallow).toContain("/*.md$");
  });

  it("serves Markdown to the named AI crawlers", () => {
    expect(ai.allow).toContain("/*.md$");
    expect(ai.disallow).not.toContain("/*.md$");
  });
});

describe("crawler list", () => {
  it("carries no duplicates", () => {
    expect(new Set(AI_CRAWLERS).size).toBe(AI_CRAWLERS.length);
  });

  it("never allows a token that was deliberately excluded", () => {
    // Catches the case where someone adds a familiar name back without
    // reading why it was left out.
    for (const x of DELIBERATELY_EXCLUDED) {
      expect(AI_CRAWLERS, `${x} is on the exclusion list`).not.toContain(x);
    }
  });

  it("includes the crawlers that fetch on a user's behalf, not only trainers", () => {
    // The original list had ClaudeBot (training) but not Claude-User or
    // Claude-SearchBot — the two that fetch because a person asked a question,
    // which is the traffic this site actually wants.
    for (const t of ["Claude-User", "Claude-SearchBot", "ChatGPT-User", "Perplexity-User", "Meta-ExternalFetcher", "Amzn-User"]) {
      expect(AI_CRAWLERS).toContain(t);
    }
  });

  it("uses no whitespace or wildcards in a token", () => {
    // robots.txt matches the user-agent token as a case-insensitive substring;
    // a stray space or slash makes a group that can never match.
    for (const t of AI_CRAWLERS) {
      expect(t, t).toMatch(/^[A-Za-z0-9._-]+$/);
    }
  });
});
