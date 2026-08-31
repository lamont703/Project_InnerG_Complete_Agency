import { describe, expect, it } from "vitest";
import {
  ENGAGEMENT_FLOOR,
  MIN_MINUTES_FOR_RATIO,
  engagedMinutes,
  lessonStanding,
  participation,
  type LessonSection,
  type SectionProgress,
} from "./learning";

const section = (id: string, position: number, hasQuestion = false): LessonSection => ({
  id, position, title: `Section ${position}`, hasQuestion,
});

const done = (
  sectionId: string,
  punchId: string | null,
  extra: Partial<SectionProgress> = {}
): SectionProgress => ({
  sectionId, punchId, completedAt: "2026-09-07T19:00:00Z",
  answerIndex: null, correct: null, ...extra,
});

/** n heartbeats one minute apart from a base time. */
const beats = (n: number, from = "2026-09-07T18:00:00Z"): string[] => {
  const t0 = new Date(from).getTime();
  return Array.from({ length: n }, (_, i) => new Date(t0 + i * 60_000).toISOString());
};

describe("engagedMinutes", () => {
  it("counts distinct minutes", () => {
    expect(engagedMinutes(beats(45), 180)).toBe(45);
  });

  it("cannot be inflated by repeating the same heartbeat", () => {
    const same = Array.from({ length: 500 }, () => "2026-09-07T18:00:00Z");
    expect(engagedMinutes(same, 180)).toBe(1);
  });

  it("collapses two tabs beating on the same minute", () => {
    const tabA = beats(30);
    const tabB = beats(30).map((s) => new Date(new Date(s).getTime() + 20_000).toISOString());
    // Same minutes, offset by 20 seconds — one student, not two.
    expect(engagedMinutes([...tabA, ...tabB], 180)).toBe(30);
  });

  it("is clamped to the length of the punch it belongs to", () => {
    // 200 minutes of heartbeats inside a 60-minute session is impossible;
    // reporting 200 would hide the fault rather than surface it.
    expect(engagedMinutes(beats(200), 60)).toBe(60);
  });

  it("handles a session with no heartbeats at all", () => {
    expect(engagedMinutes([], 180)).toBe(0);
  });
});

describe("participation", () => {
  const sections = [section("a", 0), section("b", 1), section("c", 2)];

  it("grades a session with real engagement and coursework as supported", () => {
    const p = participation({
      clockedMinutes: 180,
      minuteStamps: beats(150),
      sections,
      progress: [done("a", "p1"), done("b", "p1", { answerIndex: 2, correct: true })],
      punchId: "p1",
    });
    expect(p.grade).toBe("supported");
    expect(p.engagementRatio).toBeCloseTo(150 / 180);
    expect(p.sectionsCompleted).toBe(2);
    expect(p.checksAnswered).toBe(1);
    expect(p.checksCorrect).toBe(1);
  });

  it("grades the clock-in-and-walk-away as thin, without changing the hours", () => {
    const p = participation({
      clockedMinutes: 180,
      minuteStamps: beats(12),
      sections,
      progress: [done("a", "p1")],
      punchId: "p1",
    });
    expect(p.grade).toBe("thin");
    // The punch is still three hours. The evidence is what is weak, not the record.
    expect(p.clockedMinutes).toBe(180);
    expect(p.engagedMinutes).toBe(12);
  });

  it("grades a session with engagement but no coursework as no-coursework", () => {
    const p = participation({
      clockedMinutes: 180, minuteStamps: beats(170), sections, progress: [], punchId: "p1",
    });
    expect(p.grade).toBe("no-coursework");
  });

  it("does not compute a ratio for a session too short to mean anything", () => {
    const p = participation({
      clockedMinutes: MIN_MINUTES_FOR_RATIO - 1,
      minuteStamps: beats(1), sections, progress: [], punchId: "p1",
    });
    expect(p.engagementRatio).toBeNull();
    expect(p.grade).toBe("too-short");
  });

  it("counts only progress from THIS session", () => {
    const p = participation({
      clockedMinutes: 60,
      minuteStamps: beats(55),
      sections,
      // Two sections were finished in an earlier session; one in this one.
      progress: [done("a", "earlier"), done("b", "earlier"), done("c", "p1")],
      punchId: "p1",
    });
    expect(p.sectionsCompleted).toBe(1);
  });

  it("does not credit progress that has no punch attached", () => {
    const p = participation({
      clockedMinutes: 60, minuteStamps: beats(55), sections,
      progress: [done("a", null)], punchId: "p1",
    });
    expect(p.sectionsCompleted).toBe(0);
    expect(p.grade).toBe("no-coursework");
  });

  it("counts a wrong answer as answered but not correct", () => {
    const p = participation({
      clockedMinutes: 60, minuteStamps: beats(55), sections,
      progress: [done("a", "p1", { answerIndex: 0, correct: false })], punchId: "p1",
    });
    expect(p.checksAnswered).toBe(1);
    expect(p.checksCorrect).toBe(0);
    // A wrong answer is still participation. It is evidence the student was
    // there, which is the thing being measured.
    expect(p.grade).toBe("supported");
  });

  it("sits exactly on the floor without tipping under", () => {
    const p = participation({
      clockedMinutes: 100,
      minuteStamps: beats(ENGAGEMENT_FLOOR * 100),
      sections, progress: [done("a", "p1")], punchId: "p1",
    });
    expect(p.grade).toBe("supported");
  });
});

describe("lessonStanding", () => {
  const sections = [section("a", 0), section("b", 1), section("c", 2)];

  it("points at the first section, fresh", () => {
    const s = lessonStanding(sections, []);
    expect(s.nextSectionId).toBe("a");
    expect(s.complete).toBe(false);
  });

  it("accumulates across sessions, unlike participation", () => {
    const s = lessonStanding(sections, [done("a", "p1"), done("b", "p2")]);
    expect(s.sectionsCompleted).toBe(2);
    expect(s.nextSectionId).toBe("c");
  });

  it("does not strand a section skipped in the middle", () => {
    // Finished 1 and 3. The next thing to do is 2, not nothing.
    const s = lessonStanding(sections, [done("a", "p1"), done("c", "p1")]);
    expect(s.nextSectionId).toBe("b");
    expect(s.complete).toBe(false);
  });

  it("is complete only when every section is done", () => {
    const s = lessonStanding(sections, [done("a", "p1"), done("b", "p1"), done("c", "p1")]);
    expect(s.complete).toBe(true);
    expect(s.nextSectionId).toBeNull();
  });

  it("is not complete when the lesson has no sections", () => {
    // An empty lesson is unfinished, not finished. Otherwise a lesson published
    // before anybody wrote it would mark itself done for every student.
    expect(lessonStanding([], []).complete).toBe(false);
  });

  it("ignores which punch the progress came from", () => {
    const s = lessonStanding(sections, [done("a", null), done("b", "p9")]);
    expect(s.sectionsCompleted).toBe(2);
  });
});
