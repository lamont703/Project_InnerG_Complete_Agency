import { describe, it, expect } from "vitest";
import { classifyReply, CONSENT_TEXT, confirmationSms, welcomeSms } from "./disclosure";

describe("classifyReply", () => {
  it.each(["YES", "yes", " Yes ", "Y", "confirm"])("treats %j as opt-in", (t) => {
    expect(classifyReply(t)).toBe("opt_in");
  });

  it.each(["STOP", "stop", "Unsubscribe", "CANCEL", "quit", "end", "stopall"])(
    "treats %j as opt-out",
    (t) => {
      expect(classifyReply(t)).toBe("opt_out");
    },
  );

  it("strips punctuation so 'YES!' and 'stop.' still count", () => {
    expect(classifyReply("YES!")).toBe("opt_in");
    expect(classifyReply("stop.")).toBe("opt_out");
  });

  it("does not read a sentence containing 'yes' as consent", () => {
    // "yes I moved to Atlanta" is a conversation, not an opt-in. Consent has to
    // be unambiguous, so anything beyond the keyword falls through.
    expect(classifyReply("yes I moved last month")).toBe("other");
    expect(classifyReply("can you stop by later")).toBe("other");
  });

  it("treats an empty reply as neither", () => {
    expect(classifyReply("")).toBe("other");
    expect(classifyReply("   ")).toBe("other");
  });
});

describe("the disclosure", () => {
  it("carries every element an opt-in has to state", () => {
    const t = CONSENT_TEXT.toLowerCase();
    expect(t).toContain("inner g complete");        // who is sending
    expect(t).toContain("text messages");            // what they get
    expect(t).toContain("frequency");                // how often
    expect(t).toContain("rates may apply");          // cost
    expect(t).toContain("not a condition");          // not tied to purchase
    expect(t).toContain("stop");                     // how to leave
    expect(t).toContain("help");                     // how to get help
  });
});

describe("the confirmation text", () => {
  it("asks for a reply and carries the required footers", () => {
    const s = confirmationSms("Calvin");
    expect(s).toContain("Calvin");
    expect(s).toContain("YES");
    expect(s.toLowerCase()).toContain("stop");
    expect(s.toLowerCase()).toContain("help");
  });

  it("stays inside two SMS segments", () => {
    // A confirmation split into three parts arrives out of order on some
    // carriers, and an opt-in that reads as gibberish does not get a reply.
    expect(confirmationSms("Bartholomew").length).toBeLessThanOrEqual(320);
  });

  it("tells them how to leave in the welcome message too", () => {
    expect(welcomeSms("Calvin").toLowerCase()).toContain("stop");
  });
});

describe("the welcome message with an offer", () => {
  const OFFER = { code: "TEXT-CALVIN-K7M2", percentOff: 20, expiresAt: "2026-08-30T12:00:00Z" };

  it("delivers the code on the channel they just gave us", () => {
    const s = welcomeSms("Calvin", OFFER);
    expect(s).toContain("TEXT-CALVIN-K7M2");
    expect(s).toContain("20%");
    expect(s).toContain("Aug 30");
  });

  it("still tells them how to leave", () => {
    // Required on every marketing message, discount or not.
    expect(welcomeSms("Calvin", OFFER).toLowerCase()).toContain("stop");
  });

  it("stays inside two segments even with a long name and a code", () => {
    expect(welcomeSms("Bartholomew", OFFER).length).toBeLessThanOrEqual(320);
  });

  it("degrades gracefully when the discount could not be created", () => {
    // A failed code must not cost them the welcome — or the consent already
    // recorded a moment earlier.
    const s = welcomeSms("Calvin", null);
    expect(s).toContain("all set");
    expect(s).not.toContain("%");
    expect(s.toLowerCase()).toContain("stop");
  });
});
