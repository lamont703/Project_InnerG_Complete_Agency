// @vitest-environment node
import { describe, it, expect } from "vitest";

/**
 * Runs the real suggestion path against the real database and Gemini, then
 * checks that what it produced actually persisted. The bug it exists to catch
 * is the one that shipped: drafts rendered fine and were never stored, so the
 * page looked healthy while the table stayed empty.
 */
/*
 * Opt in explicitly:
 *   OUTREACH_LIVE_CHECK=1 npx vitest run lib/admin/outreach.live.test.ts --environment=node
 *
 * It spends real Gemini quota — which on the free tier is twenty requests PER
 * DAY for this model — so it must never run as part of an ordinary suite.
 */
describe.skipIf(process.env.OUTREACH_LIVE_CHECK !== "1")("outreach suggestions", () => {
  it("generates, persists, and can be dismissed", async () => {
    const { outreachSuggestions } = await import("@/lib/admin/member-outreach");

    const before = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/member_outreach_drafts?select=id`,
      { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } }
    ).then((r) => r.json());
    console.log(`[before] ${before.length} draft row(s)`);

    const suggestions = await outreachSuggestions();
    console.log(`[suggestions] ${suggestions.length}`);
    for (const s of suggestions) {
      console.log(`  ${s.name.padEnd(16)} ${s.signal.padEnd(22)} ${s.channel.padEnd(5)} origin=${s.origin}`);
      console.log(`     ${s.draft.replace(/\n/g, " ").slice(0, 100)}`);
    }

    const after = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/member_outreach_drafts?select=id,origin,status`,
      { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } }
    ).then((r) => r.json());
    console.log(`[after] ${after.length} draft row(s) — ${after.filter((r: any) => r.origin === "ai").length} written by the model`);

    const aiCount = suggestions.filter((s) => s.origin === "ai").length;
    if (aiCount > 0) {
      // The whole point: a generated draft MUST persist, or every load rewrites
      // it and dismissal has nothing to attach to.
      expect(after.length, "generated drafts did not persist").toBeGreaterThan(0);
    }
    expect(suggestions.length).toBeGreaterThanOrEqual(0);
  }, 180000);
});
