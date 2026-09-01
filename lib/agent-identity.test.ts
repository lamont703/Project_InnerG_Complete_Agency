import { describe, it, expect } from "vitest";
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
    // AI Mode is the busiest consumer by far; it must stay cheap.
    expect(AI_MODE.length).toBeLessThan(4000);
    expect(COMMENT.length).toBeLessThan(22000);
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
