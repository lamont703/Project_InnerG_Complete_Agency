import { describe, it, expect } from "vitest";
import { parseReply, statusForIntent, replyAcknowledgement } from "./booking-reply";

describe("the plain answers we asked for", () => {
  it("reads a bare Y or N", () => {
    expect(parseReply("Y")).toBe("accept");
    expect(parseReply("y")).toBe("accept");
    expect(parseReply("N")).toBe("decline");
    expect(parseReply("n")).toBe("decline");
  });

  it("reads the words", () => {
    expect(parseReply("Yes")).toBe("accept");
    expect(parseReply("yep")).toBe("accept");
    expect(parseReply("Sure thing")).toBe("accept");
    expect(parseReply("No")).toBe("decline");
    expect(parseReply("nope")).toBe("decline");
  });
});

describe("the trap this module exists for", () => {
  // Marking a CONFIRMED booking as declined emails the customer that nobody is
  // coming. That is the one outcome worse than not understanding.
  it("treats 'no problem' as YES, not as a refusal", () => {
    expect(parseReply("No problem")).toBe("accept");
    expect(parseReply("no problem, send them at 2")).toBe("accept");
    expect(parseReply("No worries")).toBe("accept");
    expect(parseReply("yeah no problem")).toBe("accept");
    expect(parseReply("not a problem")).toBe("accept");
  });

  it("still hears a real refusal that happens to be polite", () => {
    expect(parseReply("Sorry, we're fully booked")).toBe("decline");
    expect(parseReply("I can't take that time")).toBe("decline");
    expect(parseReply("no openings that day")).toBe("decline");
    expect(parseReply("closed on Mondays")).toBe("decline");
  });
});

describe("ambiguity never becomes a guess", () => {
  it("refuses to decide when a message carries both signals", () => {
    expect(parseReply("yes but not at 9")).toBe("unclear");
    expect(parseReply("no, but I can do 10am — ok?")).toBe("unclear");
  });

  it("refuses to decide when it carries neither", () => {
    expect(parseReply("who is this")).toBe("unclear");
    expect(parseReply("What's the number")).toBe("unclear");
    expect(parseReply("👍")).toBe("unclear");
  });

  it("treats an empty body as unclear — that is what a photo-only MMS looks like", () => {
    expect(parseReply("")).toBe("unclear");
    expect(parseReply("   ")).toBe("unclear");
    expect(parseReply(null as any)).toBe("unclear");
    expect(parseReply(undefined as any)).toBe("unclear");
  });

  it("does not fire on words that merely contain a keyword", () => {
    // "any", "know", "nice" contain n/no; "yesterday" contains yes.
    expect(parseReply("Do you know anything else")).toBe("unclear");
    expect(parseReply("They came yesterday")).toBe("unclear");
  });
});

describe("opt-out outranks everything", () => {
  it("is never read as a decline", () => {
    expect(parseReply("STOP")).toBe("optout");
    expect(parseReply("stop")).toBe("optout");
    expect(parseReply("unsubscribe")).toBe("optout");
    expect(parseReply("quit")).toBe("optout");
  });

  it("wins even when the message also looks like an answer", () => {
    expect(parseReply("no stop texting me")).toBe("optout");
    expect(parseReply("yes but STOP")).toBe("optout");
  });

  it("gets no reply text — answering an opt-out is another message", () => {
    expect(
      replyAcknowledgement("optout", { customerName: "Dana", date: "Sat, Aug 22", time: "1:00 PM", othersOpen: 0 })
    ).toBeNull();
  });
});

describe("statusForIntent", () => {
  it("moves only on a clear answer", () => {
    expect(statusForIntent("accept")).toBe("booked");
    expect(statusForIntent("decline")).toBe("declined");
    expect(statusForIntent("unclear")).toBeNull();
    expect(statusForIntent("optout")).toBeNull();
  });
});

describe("the acknowledgement echoes what moved", () => {
  const ctx = { customerName: "Dana", date: "Sat, Aug 22", time: "1:00 PM", othersOpen: 0 };

  it("names the customer and slot so a wrong guess is visible", () => {
    const msg = replyAcknowledgement("accept", ctx)!;
    expect(msg).toContain("Dana");
    expect(msg).toContain("Sat, Aug 22");
    expect(msg).toContain("1:00 PM");
  });

  it("says how many others are still open, because 'Y' did not say which", () => {
    expect(replyAcknowledgement("accept", { ...ctx, othersOpen: 1 })).toContain("1 other request");
    expect(replyAcknowledgement("accept", { ...ctx, othersOpen: 3 })).toContain("3 other requests");
    expect(replyAcknowledgement("accept", ctx)).not.toContain("other request");
  });

  it("asks again rather than assuming, when unclear", () => {
    expect(replyAcknowledgement("unclear", ctx)).toMatch(/Reply Y .* or N/);
  });

  it("copes with no customer name", () => {
    expect(replyAcknowledgement("accept", { ...ctx, customerName: null })).toContain("the customer");
  });
});
