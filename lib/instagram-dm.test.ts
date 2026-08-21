import { describe, it, expect } from "vitest";
import { chunkForDm, plainForDm } from "./instagram-dm";

const bytes = (s: string) => new TextEncoder().encode(s).length;

describe("chunkForDm", () => {
  it("leaves a short reply alone", () => {
    expect(chunkForDm("4.8 stars, 212 reviews.")).toEqual(["4.8 stars, 212 reviews."]);
  });

  it("drops an empty reply rather than sending a blank message", () => {
    expect(chunkForDm("   ")).toEqual([]);
  });

  /**
   * THE BUG THIS FILE EXISTS FOR. Instagram's cap is 1000 BYTES, not
   * characters. A reply of 900 em dashes is 900 characters and 2,700 bytes —
   * a `.slice(0, 1000)` would pass it straight through and the send would be
   * rejected, on exactly the messages containing enough punctuation to cross
   * the line and no others.
   */
  it("measures bytes, not characters", () => {
    const emDashes = "—".repeat(900);
    expect(emDashes.length).toBe(900);
    expect(bytes(emDashes)).toBeGreaterThan(1000);
    for (const c of chunkForDm(emDashes)) expect(bytes(c)).toBeLessThanOrEqual(950);
  });

  it("never splits a multi-byte character in half", () => {
    const emoji = "💈".repeat(400);
    for (const c of chunkForDm(emoji)) {
      expect(c).not.toContain("�");
      // A clean split leaves a whole number of 2-unit surrogate pairs.
      expect([...c].every((ch) => ch === "💈")).toBe(true);
    }
  });

  it("keeps every chunk inside the budget", () => {
    const long = "The pass rate at this school is 61 percent. ".repeat(120);
    for (const c of chunkForDm(long)) expect(bytes(c)).toBeLessThanOrEqual(950);
  });

  it("prefers a sentence boundary over a hard cut", () => {
    const long = "Alpha beta gamma delta. ".repeat(90);
    const [first] = chunkForDm(long);
    expect(first.endsWith(".")).toBe(true);
  });

  /**
   * Three messages is already a lot in a DM thread; six reads as spam. The
   * trim has to ANNOUNCE itself — a silent truncation invites someone to act
   * on half an answer believing it whole, which on kit lists and pass rates
   * means turning up without something or ruling out a school on a part figure.
   */
  it("caps the burst and says when it trimmed", () => {
    const huge = "This is a long sentence about booth rent in Houston. ".repeat(200);
    const out = chunkForDm(huge);
    expect(out.length).toBeLessThanOrEqual(3);
    expect(out[out.length - 1]).toContain("trimmed");
    for (const c of out) expect(bytes(c)).toBeLessThanOrEqual(950);
  });

  it("keeps the trim note inside the budget even when the last chunk is full", () => {
    const huge = "x".repeat(6000);
    const out = chunkForDm(huge);
    expect(bytes(out[out.length - 1])).toBeLessThanOrEqual(950);
    expect(out[out.length - 1]).toContain("trimmed");
  });
});

describe("plainForDm", () => {
  /**
   * The exact string a real question produced through the live agent. It is
   * correct on the website and unreadable in a DM.
   */
  it("turns a markdown link into a label and an absolute URL", () => {
    const out = plainForDm(
      "For the [Ogle School Hair Skin Nails](/schools/ogle-school-hair-skin-nails-houston-b6bcf873) in Houston…"
    );
    expect(out).not.toContain("](");
    expect(out).toContain("Ogle School Hair Skin Nails");
    expect(out).toContain("https://shearquery.com/schools/ogle-school-hair-skin-nails-houston-b6bcf873");
  });

  it("leaves an already-absolute link alone", () => {
    expect(plainForDm("see [TDLR](https://tdlr.texas.gov/x)")).toContain("https://tdlr.texas.gov/x");
  });

  it("strips emphasis that cannot render", () => {
    expect(plainForDm("the **first-time** rate is *61%*")).toBe("the first-time rate is 61%");
  });

  it("turns markdown bullets into readable ones", () => {
    expect(plainForDm("* barber\n* cosmetology")).toBe("• barber\n• cosmetology");
  });

  it("drops heading marks", () => {
    expect(plainForDm("## Pass rates\nOgle: 61%")).toBe("Pass rates\nOgle: 61%");
  });

  it("does not eat an asterisk that is not emphasis", () => {
    expect(plainForDm("4.8 stars * 212 reviews")).toContain("4.8 stars");
  });
});
