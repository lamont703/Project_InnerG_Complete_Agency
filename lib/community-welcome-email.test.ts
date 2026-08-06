import { describe, it, expect } from "vitest";
import { buildCommunityWelcomeEmail } from "./community-welcome-email";
import { SITE_URL } from "./site";

describe("buildCommunityWelcomeEmail", () => {
  it("greets the member by name", () => {
    const { html } = buildCommunityWelcomeEmail({ firstName: "Sharon" });
    expect(html).toContain("Welcome, Sharon.");
  });

  it("still reads properly with no first name", () => {
    const { html } = buildCommunityWelcomeEmail({ firstName: null });
    expect(html).toContain("Welcome.");
    expect(html).not.toContain("Welcome, .");
  });

  it("names what they claimed rather than saying 'your listing'", () => {
    const r = buildCommunityWelcomeEmail({
      firstName: "Joann",
      claimedEntityName: "Timber Lodge Parlor",
      claimedEntityUrl: "/shop/timber-lodge-parlor-abc123?claimed=1",
    });
    expect(r.subject).toBe("You've claimed Timber Lodge Parlor on ShearQuery");
    expect(r.html).toContain("Timber Lodge Parlor is yours");
    expect(r.html).toContain(`${SITE_URL}/shop/timber-lodge-parlor-abc123?claimed=1`);
  });

  it("leaves an absolute claim URL alone instead of double-prefixing it", () => {
    const { html } = buildCommunityWelcomeEmail({
      claimedEntityName: "X",
      claimedEntityUrl: "https://agency.innergcomplete.com/salons/x",
    });
    expect(html).not.toContain("innergcomplete.comhttps://");
    expect(html).toContain("https://agency.innergcomplete.com/salons/x");
  });

  it("says nothing about a claim when there wasn't one", () => {
    const r = buildCommunityWelcomeEmail({ firstName: "A" });
    expect(r.subject).toBe("You're on ShearQuery — here's what that means");
    expect(r.html).not.toMatch(/is yours|Claimed badge/);
  });

  it("promises only what the product does today", () => {
    // The failure this guards: a screen that promised an email nobody sent.
    // Nothing here may reference features that don't exist.
    const { html } = buildCommunityWelcomeEmail({ firstName: "A", claimedEntityName: "B" });
    expect(html).not.toMatch(/newsletter|weekly tips|每|coming soon|in the next few days/i);
    expect(html).toContain("search index");
    expect(html).toContain("/google-business-profile-audit");
  });

  it("carries exactly one call to action", () => {
    const { html } = buildCommunityWelcomeEmail({
      firstName: "A",
      claimedEntityName: "B",
      claimedEntityUrl: "/shop/b",
    });
    // The claim link is a plain text link; only the audit is a button.
    const buttons = html.match(/background:#1d4ed8;color:#fff/g) || [];
    expect(buttons).toHaveLength(1);
  });

  it("escapes a business name that contains HTML", () => {
    const { html } = buildCommunityWelcomeEmail({
      firstName: "A",
      claimedEntityName: '<script>alert("x")</script>',
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes a name with an ampersand", () => {
    const { html } = buildCommunityWelcomeEmail({ claimedEntityName: "Cut & Style" });
    expect(html).toContain("Cut &amp; Style");
  });

  it("tells the recipient why they got it and how to stop", () => {
    const { html } = buildCommunityWelcomeEmail({ firstName: "A" });
    expect(html).toMatch(/because you created a ShearQuery membership/i);
    expect(html).toMatch(/Reply to this email/i);
  });
});
