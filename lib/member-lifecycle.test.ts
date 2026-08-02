import { describe, it, expect } from "vitest";
import {
  decide, currentStage, STAGE_DELAY_DAYS, QUIET_PERIOD_DAYS,
  type MemberFacts, type LifecycleStage,
} from "./member-lifecycle";

const NOW = new Date("2026-08-02T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

const facts = (over: Partial<MemberFacts> = {}): MemberFacts => ({
  memberId: "m1",
  createdAt: daysAgo(30),
  hasClaim: false,
  hasConnection: false,
  hasAudit: false,
  hasChangeApplied: false,
  sentStages: [],
  ...over,
});

describe("currentStage — the most advanced true statement wins", () => {
  it("a member with nothing is at no_claim", () => {
    expect(currentStage(facts(), NOW)).toBe("no_claim");
  });

  it("a claim without a connection is the cohort that matters", () => {
    expect(currentStage(facts({ hasClaim: true }), NOW)).toBe("claimed_not_connected");
  });

  it("connected but no audit recorded", () => {
    expect(currentStage(facts({ hasClaim: true, hasConnection: true }), NOW)).toBe("connected_no_audit");
  });

  it("saw the audit, changed nothing", () => {
    expect(currentStage(facts({ hasClaim: true, hasConnection: true, hasAudit: true }), NOW))
      .toBe("audit_no_action");
  });

  it("never tells a connected member to claim something", () => {
    // The failure this guards: crossing states and getting a message that reads
    // as though nobody was paying attention.
    const s = currentStage(facts({ hasClaim: false, hasConnection: true }), NOW);
    expect(s).not.toBe("no_claim");
  });

  it("says nothing about a member who has done everything", () => {
    const s = currentStage(
      facts({ hasClaim: true, hasConnection: true, hasAudit: true, hasChangeApplied: true, lastActivityAt: daysAgo(1) }),
      NOW
    );
    expect(s).toBeNull();
  });

  it("checks in on someone who did everything then went quiet", () => {
    const s = currentStage(
      facts({ hasClaim: true, hasConnection: true, hasAudit: true, hasChangeApplied: true, lastActivityAt: daysAgo(40) }),
      NOW
    );
    expect(s).toBe("dormant");
  });
});

describe("decide — one stage, ever", () => {
  it("sends when a stage is due", () => {
    const d = decide(facts({ hasClaim: true, claimedAt: daysAgo(5) }), NOW);
    expect(d).toMatchObject({ send: true, stage: "claimed_not_connected" });
  });

  it("never repeats a stage", () => {
    // A message that didn't work doesn't work better the second time.
    const d = decide(
      facts({ hasClaim: true, claimedAt: daysAgo(60), sentStages: ["claimed_not_connected"] }),
      NOW
    );
    expect(d.send).toBe(false);
    expect(d.reason).toMatch(/already sent/);
  });

  it("waits out the delay after the triggering event", () => {
    const d = decide(facts({ hasClaim: true, claimedAt: daysAgo(1) }), NOW);
    expect(d.send).toBe(false);
    expect(d.reason).toMatch(/not due/);
  });

  it("doesn't collide with the welcome email on a fresh signup", () => {
    // no_claim waits 3 days precisely so a new member isn't emailed twice on
    // their first day.
    expect(decide(facts({ createdAt: daysAgo(1) }), NOW).send).toBe(false);
    expect(decide(facts({ createdAt: daysAgo(4) }), NOW).send).toBe(true);
  });

  it("holds the quiet period between two different stages", () => {
    // Crossing two thresholds in a week must not produce two emails in a week.
    const d = decide(
      facts({ hasClaim: true, claimedAt: daysAgo(10), sentStages: ["no_claim"], lastSentAt: daysAgo(2) }),
      NOW
    );
    expect(d.send).toBe(false);
    expect(d.reason).toMatch(/quiet period/);
  });

  it("sends once the quiet period has passed", () => {
    const d = decide(
      facts({ hasClaim: true, claimedAt: daysAgo(20), sentStages: ["no_claim"], lastSentAt: daysAgo(QUIET_PERIOD_DAYS + 1) }),
      NOW
    );
    expect(d).toMatchObject({ send: true, stage: "claimed_not_connected" });
  });

  it("the sequence ends — nothing follows dormant", () => {
    const d = decide(
      facts({
        hasClaim: true, hasConnection: true, hasAudit: true, hasChangeApplied: true,
        lastActivityAt: daysAgo(90), sentStages: ["dormant"], lastSentAt: daysAgo(60),
      }),
      NOW
    );
    expect(d.send).toBe(false);
  });

  it("explains itself when it sends nothing", () => {
    // A quiet run is only reassuring if you can see why it was quiet.
    for (const f of [facts({ createdAt: daysAgo(1) }), facts({ sentStages: ["no_claim"] })]) {
      const d = decide(f, NOW);
      expect(d.send).toBe(false);
      expect(d.reason).toBeTruthy();
    }
  });

  it("survives a missing anchor date without sending", () => {
    const d = decide(facts({ createdAt: "" as any }), NOW);
    expect(d.send).toBe(false);
  });
});

describe("the first real cohort", () => {
  // Four members who claimed a listing weeks ago and never connected Google.
  const cohort = [
    { name: "Matthew", claimedAt: daysAgo(12) },
    { name: "Sharon", claimedAt: daysAgo(6) },
    { name: "Barber To The Stars", claimedAt: daysAgo(4) },
    { name: "Joann", claimedAt: daysAgo(1) },
  ];

  it("reaches everyone whose claim has had time to settle", () => {
    const due = cohort.filter((c) => decide(facts({ hasClaim: true, claimedAt: c.claimedAt }), NOW).send);
    expect(due.map((c) => c.name)).toEqual(["Matthew", "Sharon", "Barber To The Stars"]);
  });

  it("leaves yesterday's signup alone", () => {
    const joann = decide(facts({ hasClaim: true, claimedAt: daysAgo(1) }), NOW);
    expect(joann.send).toBe(false);
    expect(STAGE_DELAY_DAYS.claimed_not_connected).toBe(2);
  });
});
