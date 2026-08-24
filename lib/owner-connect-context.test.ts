import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { AUDIENCES } from "@/lib/audiences";

/**
 * These guard the two ways this feature goes wrong quietly.
 *
 * The first is the bug that started it: the assistant telling an owner it
 * cannot help with something that shipped months ago, because nothing in its
 * brief mentioned the capability. That is invisible in code review — the brief
 * reads fine, it is just silent.
 *
 * The second is a link to a page that does not exist. The assistant is told to
 * hyperlink these, so a renamed route turns into a 404 handed to a customer.
 */

// Kept in step with UNLOCKED in lib/owner-connect-context.ts. Imported as data
// rather than from the module because that module is server-only.
const UNLOCKED_URLS = [
  "/account/gbp-audit",
  "/account/gbp-posts",
  "/account/gbp-reviews",
  "/account/gbp-hours",
  "/account/gbp-photos",
];
const OTHER_URLS = ["/api/google-business/start", "/account/add-business"];

describe("owner connect — the pages the assistant may link", () => {
  it("every unlocked page exists as a route", () => {
    for (const url of UNLOCKED_URLS) {
      expect(existsSync(`app${url}/page.tsx`), `${url} has no page.tsx`).toBe(true);
    }
  });

  it("the connect and claim destinations exist", () => {
    expect(existsSync("app/api/google-business/start/route.ts")).toBe(true);
    expect(existsSync("app/account/add-business/page.tsx")).toBe(true);
    expect(OTHER_URLS.length).toBe(2);
  });
});

describe("owner brief", () => {
  const brief = AUDIENCES.owner.agentBrief;

  it("tells the assistant the Google connection is something it can help with", () => {
    // The original failure: an owner asked, and the assistant said it couldn't.
    expect(brief.toLowerCase()).toContain("google business profile");
  });

  it("names claiming the listing", () => {
    expect(brief.toLowerCase()).toContain("claim");
  });

  it("states the assistant cannot approve the connection itself", () => {
    // The ceiling is one click, not zero. An assistant that implies it can
    // connect on their behalf is making the booking-rule mistake in
    // lib/agent-policy.ts: promising a capability that cannot exist.
    expect(brief.toLowerCase()).toMatch(/cannot approve it for them|you cannot approve/);
  });
});

describe("student brief still refuses the pitch", () => {
  it("forbids pitching listing claims to a student", () => {
    // owner_connect_context is deliberately not built for students. If this
    // ever loosens, a student asking about exam prep gets steered into
    // connecting a business they do not own.
    expect(AUDIENCES.student.agentBrief).toMatch(/never pitch/i);
  });
});
