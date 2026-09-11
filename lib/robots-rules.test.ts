import { describe, it, expect } from "vitest";
import {
  AI_CRAWLERS,
  AI_CRAWLERS_UNVERIFIED,
  NOT_A_REAL_TOKEN,
  PRIVATE_PATHS,
  buildRobotsRules,
  DISALLOWED_CRAWLERS,
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

  it("no longer uses robots.txt to solve duplicate content", () => {
    // Google: "Don't use the robots.txt file for canonicalization purposes.
    // Google may still index URLs that are disallowed in robots.txt without
    // their content." A rel=canonical Link header on the .md response, set in
    // middleware.ts, is the documented mechanism — and unlike a Disallow it
    // does not make the Markdown layer's reach depend on a hand-kept list.
    expect(wildcard.disallow).not.toContain("/*.md$");
    expect(ai.disallow).not.toContain("/*.md$");
  });

  it("still states the Markdown permission explicitly for named crawlers", () => {
    expect(ai.allow).toContain("/*.md$");
  });
});

describe("crawler list", () => {
  it("carries no duplicates", () => {
    expect(new Set(AI_CRAWLERS).size).toBe(AI_CRAWLERS.length);
  });

  it("keeps unverified tokens out of the verified list", () => {
    // The two lists carry different guarantees — one was read from operator
    // docs, one was not — and collapsing them would erase that.
    for (const x of AI_CRAWLERS_UNVERIFIED) {
      expect(AI_CRAWLERS, `${x} has no operator documentation`).not.toContain(x);
    }
  });

  it("never allows a token confirmed not to exist", () => {
    // GoogleOther-Extended is in widely-copied robots.txt snippets and in no
    // Google documentation. Allowing it is inert, but listing it would imply
    // it was checked.
    const all = [...AI_CRAWLERS, ...AI_CRAWLERS_UNVERIFIED];
    for (const x of NOT_A_REAL_TOKEN) expect(all).not.toContain(x);
  });

  it("grants the unverified tokens the same private-path protection", () => {
    const ai = buildRobotsRules().find((r) => r.userAgent !== "*")!;
    for (const x of AI_CRAWLERS_UNVERIFIED) {
      expect(ai.userAgent).toContain(x);
    }
    expect(ai.disallow).toContain("/admin/");
  });

  it("includes the crawlers that fetch on a user's behalf, not only trainers", () => {
    // The original list had ClaudeBot (training) but not Claude-User or
    // Claude-SearchBot — the two that fetch because a person asked a question,
    // which is the traffic this site actually wants.
    //
    // Amzn-User WAS in this list and was deliberately removed. Amazon was the
    // largest crawler on the site by a wide margin and no Amazon surface sends
    // this directory traffic back, so all three Amazon tokens moved to
    // DISALLOWED_CRAWLERS. The principle above is unchanged — a fetch-on-behalf
    // crawler is worth more than a training one — but it only earns access when
    // somebody is actually being sent here.
    for (const t of ["Claude-User", "Claude-SearchBot", "ChatGPT-User", "Perplexity-User", "Meta-ExternalFetcher"]) {
      expect(AI_CRAWLERS).toContain(t);
    }
  });

  it("never allows and disallows the same crawler", () => {
    // A token in both lists produces two groups that match the same request.
    // Which one wins is a matter of rule ordering rather than intent, and the
    // file would read as though a decision had been made when none had.
    const allowed = new Set([...AI_CRAWLERS, ...AI_CRAWLERS_UNVERIFIED].map((t) => t.toLowerCase()));
    for (const t of DISALLOWED_CRAWLERS) {
      expect(allowed.has(t.toLowerCase()), `${t} is both allowed and disallowed`).toBe(false);
    }
  });

  it("refuses the disallowed crawlers everything, not just the private paths", () => {
    // The point of the group is the leading "/" — without it the group would
    // grant these crawlers the entire site, which is the exact precedence trap
    // this file exists to prevent.
    const refused = buildRobotsRules().find((r) => Array.isArray(r.userAgent) && r.userAgent.includes("SemrushBot"))!;
    expect(refused.disallow).toContain("/");
    expect(refused.allow ?? []).toHaveLength(0);
  });

  it("uses no whitespace or wildcards in a token", () => {
    // robots.txt matches the user-agent token as a case-insensitive substring;
    // a stray space or slash makes a group that can never match.
    for (const t of [...AI_CRAWLERS, ...AI_CRAWLERS_UNVERIFIED]) {
      expect(t, t).toMatch(/^[A-Za-z0-9._-]+$/);
    }
  });
});
