import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { VOICE_SUMMARY, BELIEFS } from "./voice-dna";
import { identityForChannel } from "./agent-identity";

const AI_MODE = identityForChannel(null);
const COMMENT = identityForChannel("instagram_comment");
const DM = identityForChannel("instagram_dm");

describe("every channel gets the brand facts", () => {
  /*
   * Any surface can be asked "what does this cost", and every surface can get
   * it wrong. The credit-reporting line is the one that would do real damage —
   * we do not report to the bureaus yet, and implying otherwise is a claim
   * about somebody's credit file.
   */
  it("tells every channel what is free and what is paid", () => {
    for (const block of [AI_MODE, COMMENT, DM]) {
      expect(block).toMatch(/Agents as a Service/);
      expect(block).toMatch(/FREE IS THE DEFAULT EVERYWHERE/);
      expect(block).toMatch(/WAITLIST for TransUnion/);
    }
  });

  it("warns every channel off the peer-language positioning", () => {
    for (const block of [AI_MODE, COMMENT, DM]) {
      expect(block).toMatch(/PEER language/);
    }
  });
});

describe("Lamont's voice goes only where he is the author", () => {
  /*
   * AI Mode is a product assistant answering directory questions. It is not
   * him. Giving it his faith, his stories and his rhythm would put words in a
   * real person's mouth on a surface he never chose to speak on — and this is
   * the assertion that stops someone "simplifying" the router later.
   */
  it("keeps his voice out of public AI Mode", () => {
    expect(AI_MODE).not.toMatch(/RULE ZERO/);
    expect(AI_MODE).not.toMatch(/WHAT HE BELIEVES/);
    expect(AI_MODE).not.toMatch(/worst business decision/);
  });

  it("gives it to the channels that speak as the brand", () => {
    for (const block of [COMMENT, DM]) {
      expect(block).toMatch(/RULE ZERO/);
      expect(block).toMatch(/WHAT HE BELIEVES/);
      expect(block).toMatch(/CALIBRATION|worked example|WORKED EXAMPLE/i);
    }
  });

  it("carries the rule that cost two rounds of testing to find", () => {
    // He expands; drafts that compress into punchy fragments stop sounding
    // like him. If this line ever falls out of the injected block, the voice
    // regresses to the version he rejected.
    expect(COMMENT).toMatch(/DOES NOT COMPRESS INTO FRAGMENTS/);
  });
});

describe("an unknown channel fails cheap, not expensive", () => {
  it("does not hand his voice to a channel nobody signed off", () => {
    const future = identityForChannel("some_new_surface");
    expect(future).toBe(AI_MODE);
    expect(future).not.toMatch(/RULE ZERO/);
  });
});

describe("the raw transcripts never reach the model", () => {
  /*
   * BELIEFS_RAW, STORIES_RAW and SOUND_RAW are ~4,400 tokens of reference
   * material for a human diagnosing a bad draft. Injecting them would roughly
   * double the block for no gain — VOICE_SUMMARY is already the reading of
   * them.
   */
  it("ships the summary, not the interview", () => {
    /*
     * Assert on the TRANSCRIPT MARKERS, not on phrases. A first version of this
     * test looked for "my boy Winchester" and failed — because that phrase is
     * legitimately listed in VOICE_SUMMARY as one of his signature phrases.
     * The summary is SUPPOSED to quote him. What must not ship is the
     * interview itself, and the "--- Q<n>." headers are what identify it.
     */
    for (const block of [AI_MODE, COMMENT, DM]) {
      expect(block).not.toMatch(/--- Q\d+\./);
      expect(block).not.toMatch(/Hallelujah is a phrase that I say/);
      expect(block).not.toMatch(/knocking down a wall, putting in uh six/);
    }
  });

  it("stays within a sane budget on the high-volume path", () => {
    // AI Mode is the busiest consumer by far and is genuinely public; it must
    // stay cheap. This cap is the one that matters.
    expect(AI_MODE.length).toBeLessThan(4000);

    /*
     * RAISED FROM 22,000 ON 2026-09-02, DELIBERATELY.
     *
     * 22,000 was set on the assumption that comment and DM are high-volume.
     * Measured against the tables: 7 comment replies and 28 DM messages ALL
     * TIME. At ~6,000 input tokens and the flash-lite rate in lib/ai-usage.ts,
     * a call costs about a tenth of a cent, so the entire history of this
     * surface has cost pennies.
     *
     * The old ceiling was not protecting a real cost, and it was doing damage:
     * a genuine voice rule had to be trimmed twice to fit inside eight
     * characters of headroom. The binding constraint on this block is the
     * model's attention, not the bill — a long prompt whose rules contradict
     * each other writes worse than a short consistent one. So this number is a
     * guard against sprawl, not against spend. Re-examine it if the surface
     * ever gets busy.
     */
    expect(COMMENT.length).toBeLessThan(26000);
  });
});

describe("pillars and packaging go only to the content channel", () => {
  const CONTENT = identityForChannel("content");

  /*
   * A comment reply does not write titles. Shipping the packaging formula to
   * the two highest-frequency agents would be ~1,200 tokens each for something
   * they cannot use.
   */
  it("keeps the title formula off comment and DM replies", () => {
    for (const block of [AI_MODE, COMMENT, DM]) {
      expect(block).not.toMatch(/THE FORMULA THAT WORKS/);
      expect(block).not.toMatch(/WHAT WE PUBLISH/);
    }
  });

  it("gives the content channel both installs", () => {
    expect(CONTENT).toMatch(/WHAT WE PUBLISH/);
    expect(CONTENT).toMatch(/THE FORMULA THAT WORKS/);
    expect(CONTENT).toMatch(/RULE ZERO/);
  });

  /*
   * The two findings most likely to be lost if someone rewrites this file: that
   * a Short must not open with a statistic, and that content is judged on views
   * per day rather than lifetime views. Both were counter to the obvious
   * reading of the raw leaderboard.
   */
  it("carries the two counterintuitive findings", () => {
    expect(CONTENT).toMatch(/DO NOT OPEN A SHORT WITH A STATISTIC/);
    expect(CONTENT).toMatch(/views per day, not lifetime views/);
  });
});

/**
 * THE CONTRACTION RULE, GUARDED AT ITS SOURCE.
 *
 * VOICE_SUMMARY rule 6 says he contracts always, and that claim is only worth
 * anything while the transcripts still back it. This asserts the measurement
 * rather than the prose: if someone "tidies" a transcript into full forms — the
 * exact thing the file's header forbids — the evidence for the rule quietly
 * disappears and this fails instead.
 */
describe("he contracts, and the transcripts prove it", () => {
  const src = readFileSync("lib/voice-dna.ts", "utf8");
  const block = (name: string) => {
    const i = src.indexOf(`export const ${name}`);
    const a = src.indexOf("`", i) + 1;
    return src.slice(a, src.indexOf("`", a));
  };
  const speech = ["BELIEFS_RAW", "NEVER_SAY", "STORIES_RAW"]
    .map(block).join("\n").replace(/^--- .*$/gm, "");

  it("is overwhelmingly contracted, and stays that way", () => {
    /*
     * NOT "zero expanded forms" — that was asserted once and was wrong. A
     * handful survive and every one is principled: impossible to contract
     * ("whatever it is", "who I am", "I have faith") or emphatic inside
     * concede-then-sharpen ("but what I am saying is"). What this guards is the
     * RATIO, so tidying a transcript into full forms shows up as red.
     */
    const con = (speech.match(/\b\w+['’](m|s|re|ve|ll|t)\b/gi) ?? []).length;
    expect(con, "contractions in the transcripts").toBeGreaterThan(80);

    const expanded = ["I am", "you are", "it is", "that is", "do not", "does not", "I have", "I will"]
      .reduce((n, p) => n + (speech.match(new RegExp(`\\b${p}\\b`, "gi")) ?? []).length, 0);
    expect(con / (con + expanded), "contraction ratio").toBeGreaterThan(0.85);

    // The emphatic exception is real and must survive any tidying.
    expect(speech).toMatch(/what I am saying is/i);
  });

  it("states the rule where the script writers read it", () => {
    expect(VOICE_SUMMARY).toMatch(/HE CONTRACTS/);
  });
});

/**
 * THE GUARDRAIL HE SET HIMSELF, GUARDED.
 *
 * BELIEFS records that he thinks people should be held accountable when a child
 * is harmed — a publishable principle — AND that he explicitly declined to
 * comment on a named defendant whose jury was still out. The second half is the
 * part that stops a future agent writing something reckless, and it is the half
 * most likely to be trimmed by someone shortening the file for budget. So it is
 * asserted rather than trusted.
 */
describe("his own guardrails survive editing", () => {
  it("keeps the do-not-name-an-undecided-case rule beside the principle", () => {
    /*
     * SHORT ANCHORS ONLY. The first version of this asserted a multi-word
     * phrase and failed because the file wraps mid-sentence — the words were
     * all present, with a newline between two of them. A guard that breaks on
     * reflow trains people to delete the guard.
     */
    expect(BELIEFS).toMatch(/held accountable/i);
    expect(BELIEFS).toMatch(/cant speak/i);
    expect(BELIEFS).toMatch(/named defendant/i);
    expect(BELIEFS).toMatch(/undecided case/i);
  });

  it("keeps the robots position and what actually carries it", () => {
    expect(BELIEFS).toMatch(/robots will be able to do human hair/i);
    // the argument, not just the claim — a machine only has to get good enough
    expect(BELIEFS).toMatch(/good enough/i);
    expect(BELIEFS).toMatch(/instructor/i);
  });

  it("keeps the smart-glasses position framed as opportunity, not alarm", () => {
    expect(BELIEFS).toMatch(/take the barber and cosmetology industry by storm/i);
    // the two obligations are his, and a draft that drops them misses the point
    expect(BELIEFS).toMatch(/tell the client explicitly/i);
    expect(BELIEFS).toMatch(/have a rule about it/i);
    // and the register correction that produced it
    expect(BELIEFS).toMatch(/OPPORTUNITY, NOT AS ALARM/);
  });

  it("marks which beliefs were spoken and which were only endorsed", () => {
    expect(BELIEFS).toMatch(/endorsed, not recorded/i);
  });
});
