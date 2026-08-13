import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  allJourneyRoutes,
  agentJourneyContext,
  currentPhase,
  datedMilestones,
  daysUntilExam,
  hasPracticalExam,
  isJourneyStarted,
  journeyHeadline,
  chatBannerLine,
  kitListRoute,
  milestones,
  missingJourneyFields,
  nextBestActions,
  type JourneyFacts,
} from "./member-journey";
import { audienceFromParam, storedAudience, LIVE_AUDIENCES, AUDIENCES } from "./audiences";

const TODAY = "2026-08-12";

function facts(over: Partial<JourneyFacts> = {}): JourneyFacts {
  return { state: "TX", track: "barber", ...over };
}

describe("routes", () => {
  // The reason this file reaches the filesystem: a milestone that 404s arrives
  // at the exact moment someone decided to trust it. Renaming a page is normal;
  // renaming it and leaving a student pointed at the old path is not.
  it("every route the journey can emit exists as a page", () => {
    const appDir = path.join(process.cwd(), "app");
    for (const route of allJourneyRoutes()) {
      const dir = path.join(appDir, route.replace(/^\//, ""));
      const exists =
        fs.existsSync(path.join(dir, "page.tsx")) || fs.existsSync(path.join(dir, "page.ts"));
      expect(exists, `${route} has no page under app/`).toBe(true);
    }
  });
});

describe("hasPracticalExam", () => {
  it("is false for California and true for Texas and Maryland", () => {
    expect(hasPracticalExam("CA")).toBe(false);
    expect(hasPracticalExam("TX")).toBe(true);
    expect(hasPracticalExam("MD")).toBe(true);
  });
});

describe("kitListRoute", () => {
  it("gives Texas students their own track's kit list", () => {
    expect(kitListRoute("TX", "barber")).toBe("/texas-barber-state-board-practical-exam-kit-list");
    expect(kitListRoute("TX", "manicurist")).toBe("/texas-manicurist-practical-exam-kit-list");
  });

  it("never gives a California student a kit list, on any track", () => {
    for (const track of ["barber", "cosmetology", "esthetician", "manicurist"] as const) {
      expect(kitListRoute("CA", track)).toBeNull();
    }
  });

  it("returns null rather than a near-miss when a track isn't covered", () => {
    expect(kitListRoute("TX", "hairstylist")).toBeNull();
    expect(kitListRoute("TX", "undecided")).toBeNull();
  });
});

describe("daysUntilExam", () => {
  it("counts whole days forward and backward", () => {
    expect(daysUntilExam(facts({ examDate: "2026-09-11" }), TODAY)).toBe(30);
    expect(daysUntilExam(facts({ examDate: "2026-08-12" }), TODAY)).toBe(0);
    expect(daysUntilExam(facts({ examDate: "2026-08-05" }), TODAY)).toBe(-7);
  });

  it("is null — not zero — when there's no usable date", () => {
    expect(daysUntilExam(facts(), TODAY)).toBeNull();
    expect(daysUntilExam(facts({ examDate: "next tuesday" }), TODAY)).toBeNull();
  });

  it("does not drift across a month boundary", () => {
    expect(daysUntilExam(facts({ examDate: "2026-09-01" }), "2026-08-31")).toBe(1);
  });
});

describe("currentPhase", () => {
  it("reads the exam date into the right band", () => {
    expect(currentPhase(facts({ examDate: "2026-12-01" }), TODAY)).toBe("enrolled");
    expect(currentPhase(facts({ examDate: "2026-10-01" }), TODAY)).toBe("exam_prep");
    expect(currentPhase(facts({ examDate: "2026-08-20" }), TODAY)).toBe("exam_imminent");
  });

  it("puts the band boundaries on the inclusive side", () => {
    // Exactly 30 days out is imminent, exactly 90 is prep — pinned because
    // the milestone copy ("30 days out, work the written exam") reads as a
    // promise about which side of the line a given day falls on.
    expect(currentPhase(facts({ examDate: "2026-09-11" }), TODAY)).toBe("exam_imminent");
    expect(currentPhase(facts({ examDate: "2026-09-12" }), TODAY)).toBe("exam_prep");
    expect(currentPhase(facts({ examDate: "2026-11-10" }), TODAY)).toBe("exam_prep");
    expect(currentPhase(facts({ examDate: "2026-11-11" }), TODAY)).toBe("enrolled");
  });

  it("treats a long-past exam date as stale, not imminent", () => {
    expect(currentPhase(facts({ examDate: "2026-01-01" }), TODAY)).toBe("enrolled");
  });

  it("lets licensed override a stale exam date, always", () => {
    const licensed = facts({ examDate: "2026-08-20", licensedAt: "2026-08-01" });
    expect(currentPhase(licensed, TODAY)).toBe("licensed");
  });

  it("distinguishes someone in school from someone still choosing one", () => {
    expect(currentPhase(facts({ schoolName: "Bladesmith Barber College" }), TODAY)).toBe("enrolled");
    expect(currentPhase(facts(), TODAY)).toBe("considering");
  });
});

describe("milestones", () => {
  it("gives a Texas barber student the kit sequence", () => {
    const ids = milestones(facts()).map((m) => m.id);
    expect(ids).toContain("kit");
    expect(ids).toContain("pack");
  });

  it("replaces the kit milestone with the reason there isn't one, in California", () => {
    const ids = milestones(facts({ state: "CA" })).map((m) => m.id);
    expect(ids).not.toContain("kit");
    expect(ids).not.toContain("pack");
    expect(ids).toContain("no_practical");
  });

  it("emits nothing at all without a state", () => {
    expect(milestones(facts({ state: null }))).toEqual([]);
  });

  it("drops a milestone rather than linking a page that doesn't apply", () => {
    // hairstylist has a requirements page in CA but no exam prep page.
    const ids = milestones({ state: "CA", track: "hairstylist" }).map((m) => m.id);
    expect(ids).not.toContain("written_prep");
    expect(ids).toContain("eligibility");
  });
});

describe("datedMilestones", () => {
  it("marks what's passed, what's due, and what's ahead", () => {
    // 45 days out: kit (due at 60) has passed, written prep (30) is due in 15.
    const dated = datedMilestones(facts({ examDate: "2026-09-26" }), TODAY);
    const byId = Object.fromEntries(dated.map((m) => [m.id, m]));
    expect(byId.kit.status).toBe("passed");
    expect(byId.written_prep.status).toBe("upcoming");
    expect(byId.pack.status).toBe("upcoming");
  });

  it("holds everything as upcoming when there's no exam date", () => {
    expect(datedMilestones(facts(), TODAY).every((m) => m.status === "upcoming")).toBe(true);
  });
});

describe("nextBestActions", () => {
  it("leads with what's actionable now, not with what's already behind", () => {
    // 14 days out: buying a kit is six weeks late and nagging about it helps
    // nobody. Packing the one they have is the thing they can still do.
    const actions = nextBestActions(facts({ examDate: "2026-08-26" }), TODAY);
    expect(actions[0].id).toBe("pack");
    expect(actions.map((a) => a.id)).not.toContain("kit");
  });

  it("switches to work and profile once they're licensed", () => {
    const actions = nextBestActions(facts({ licensedAt: "2026-08-01" }), TODAY);
    expect(actions.map((a) => a.id)).toEqual(["market", "passport"]);
  });

  it("never returns more than the cap", () => {
    expect(nextBestActions(facts({ examDate: "2026-08-13" }), TODAY, 2)).toHaveLength(2);
  });
});

describe("agentJourneyContext", () => {
  it("is null until the member has told us something", () => {
    expect(agentJourneyContext({ state: null, track: null }, TODAY)).toBeNull();
    expect(isJourneyStarted({ state: null, track: null })).toBe(false);
  });

  it("carries the state's practical-exam answer, not a default", () => {
    const ca = agentJourneyContext(facts({ state: "CA" }), TODAY)!;
    expect(ca.state_has_practical_exam).toBe(false);
    expect(ca.their_kit_list_url).toBeNull();

    const tx = agentJourneyContext(facts(), TODAY)!;
    expect(tx.state_has_practical_exam).toBe(true);
    expect(tx.their_kit_list_url).toBe("/texas-barber-state-board-practical-exam-kit-list");
  });

  it("gives the model a countdown rather than a raw date to subtract", () => {
    const ctx = agentJourneyContext(facts({ examDate: "2026-10-01" }), TODAY)!;
    expect(ctx.days_until_exam).toBe(50);
    expect(ctx.phase).toBe("exam_prep");
  });
});

describe("journeyHeadline", () => {
  it("counts down, in the student's own track", () => {
    expect(journeyHeadline(facts({ examDate: "2026-08-22" }), TODAY)).toBe("10 days until your barber exam.");
    expect(journeyHeadline(facts({ examDate: "2026-08-13" }), TODAY)).toBe("Your barber exam is tomorrow.");
  });

  it("says nothing it wasn't told", () => {
    expect(journeyHeadline({ state: null, track: null }, TODAY)).toBe("Let's work out where you're going.");
  });
});

describe("chatBannerLine", () => {
  // This banner sits above every conversation uninvited, so it has to earn the
  // space each time. journeyHeadline() always returns something because it
  // heads a page you chose to open; this one is allowed to say nothing.
  it("earns its space with a countdown", () => {
    expect(chatBannerLine(facts({ examDate: "2026-08-22" }), TODAY)).toBe("10 days until your barber exam.");
  });

  it("says nothing when there is nothing to count down to", () => {
    expect(chatBannerLine(facts(), TODAY)).toBeNull();
    // The exact string that was appearing on every chat and saying less than
    // the empty state it replaced.
    expect(journeyHeadline(facts(), TODAY)).toBe("Let's work out where you're going.");
  });

  it("will not recite a school back at someone who typed it in", () => {
    expect(chatBannerLine(facts({ schoolName: "Bladesmith Barber College" }), TODAY)).toBeNull();
  });

  it("drops a stale countdown rather than showing a negative one", () => {
    expect(chatBannerLine(facts({ examDate: "2026-08-05" }), TODAY)).toBeNull();
  });

  it("still speaks up once they are licensed", () => {
    expect(chatBannerLine(facts({ licensedAt: "2026-08-01" }), TODAY)).toBe("You're licensed — here's what's next.");
  });
});

describe("missingJourneyFields", () => {
  it("asks for the exam date before the ZIP", () => {
    const gaps = missingJourneyFields(facts()).map((g) => g.field);
    expect(gaps.indexOf("examDate")).toBeLessThan(gaps.indexOf("zip"));
  });

  it("is empty once everything's answered", () => {
    const full = facts({ examDate: "2026-09-01", schoolName: "X", zip: "77002" });
    expect(missingJourneyFields(full)).toEqual([]);
  });
});

describe("audiences", () => {
  it("resolves a known live audience from a query string", () => {
    expect(audienceFromParam("student")).toBe("student");
    expect(audienceFromParam("STUDENT")).toBe("student");
  });

  it("falls back to the existing default for junk and for planned audiences", () => {
    expect(audienceFromParam("nonsense")).toBe("professional");
    expect(audienceFromParam(null)).toBe("professional");
    // school is declared but not launched — a query string must not render it.
    expect(audienceFromParam("school")).toBe("professional");
  });

  it("does let a stored value be a planned audience, and keeps unknown null", () => {
    expect(storedAudience("school")).toBe("school");
    expect(storedAudience("nonsense")).toBeNull();
    expect(storedAudience(null)).toBeNull();
  });

  it("never publishes an audience with no benefits", () => {
    for (const a of LIVE_AUDIENCES) {
      expect(a.status).toBe("live");
      expect(a.benefits.length).toBeGreaterThan(0);
    }
  });

  it("keeps owner-only language away from the student brief", () => {
    // The student agent brief exists to stop exactly this: a student being
    // pitched a verified badge on a listing they don't have.
    expect(AUDIENCES.student.agentBrief).toMatch(/never pitch/i);
    for (const benefit of AUDIENCES.student.benefits) {
      expect(`${benefit.title} ${benefit.body}`.toLowerCase()).not.toMatch(/verified badge|claim your listing/);
    }
  });
});
