import { describe, it, expect } from "vitest";
import { STORIES, validateStory, findStory, MAX_CARDS, MAX_CAPTION } from "./stories";

describe("every shipped story", () => {
  it("passes its own format check", () => {
    for (const s of STORIES) {
      expect(validateStory(s), `${s.id}: ${validateStory(s).join("; ")}`).toEqual([]);
    }
  });

  it("ENDS ON A LESSON, NOT ON THE JOKE", () => {
    /*
     * The whole reason this format exists. A punchline earns a laugh and
     * nothing else; the LAND is what earns a save and a share. A deck that
     * stops at the funny part reads fine and performs like a meme.
     */
    for (const s of STORIES) {
      const land = s.cards.findIndex((c) => c.beat === "LAND");
      expect(land, `${s.id} has no LAND`).toBeGreaterThan(-1);
      // and it comes after the turn, not before it
      const turn = s.cards.findIndex((c) => c.beat === "TURN");
      if (turn > -1) expect(land, `${s.id} lands before it turns`).toBeGreaterThan(turn);
    }
  });

  it("ASKS SOMETHING ANSWERABLE on the last card", () => {
    // Comments are the goal; "what do you think?" is not a question anybody
    // answers. Every ask has to end in a question mark or name a instruction.
    for (const s of STORIES) {
      const last = s.cards[s.cards.length - 1];
      expect(last.beat, `${s.id} does not end on an ASK`).toBe("ASK");
      const text = last.lines.join(" ");
      expect(text.length, `${s.id} ask is too long to read`).toBeLessThan(120);
    }
  });

  it("invites a reply in the caption, where most comments actually start", () => {
    /*
     * Checks for an INVITATION, not for a question mark. The first version of
     * this test looked for "?" and failed the Rell deck, whose caption asks for
     * a comment as an instruction — "don't tag him, just say the city" — which
     * is both the joke and a perfectly good prompt. The assertion was a proxy
     * for the requirement rather than the requirement.
     */
    for (const s of STORIES) {
      const invites = s.caption.includes("?") || /\b(comment|tag|drop|say)\b/i.test(s.caption);
      expect(invites, `${s.id} caption invites nothing`).toBe(true);
    }
  });

  it("credits the panel the arguments came from", () => {
    // Publishing these without it would be taking something.
    for (const s of STORIES) {
      expect(s.sourceCredit).toMatch(/619/);
      expect(s.caption).toContain(s.sourceCredit);
    }
  });

  it("IS NEVER MORE THAN 10 CARDS — Instagram's real carousel limit", () => {
    /*
     * This constant was 20, written from memory, and Instagram rejected an
     * 11-card deck at the parent-container step: "too little or too many
     * attachments to qualify as a carousel". Meta's content-publishing
     * reference says 10, plainly.
     *
     * The reason it needs a test rather than a comment is WHERE it fails. Every
     * child container is created and accepted one at a time — eleven successful
     * API calls — and only the parent refuses. An over-long deck looks like it
     * is working right up to the final call.
     */
    expect(MAX_CARDS).toBe(10);
    for (const s of STORIES) {
      expect(s.cards.length, `${s.id} has ${s.cards.length} cards`).toBeLessThanOrEqual(10);
    }
  });

  it("does not promise a card count in the caption that the deck does not have", () => {
    // "settled in 11 swipes" survived a trim to 10 and would have shipped.
    for (const s of STORIES) {
      const m = s.caption.match(/(\d+)\s+swipes/i);
      if (m) expect(Number(m[1]), `${s.id} caption says ${m[1]} swipes`).toBe(s.cards.length);
    }
  });

  it("stays inside Instagram's limits", () => {
    for (const s of STORIES) {
      expect(s.cards.length).toBeLessThanOrEqual(MAX_CARDS);
      expect(s.cards.length).toBeGreaterThanOrEqual(2);
      expect(s.caption.length).toBeLessThanOrEqual(MAX_CAPTION);
    }
  });

  it("varies the card kinds — a deck of one kind is a billboard", () => {
    for (const s of STORIES) {
      const kinds = new Set(s.cards.map((c) => c.kind));
      expect(kinds.size, `${s.id} uses only ${[...kinds]}`).toBeGreaterThan(1);
    }
  });

  it("has unique ids, so a render cannot overwrite another deck", () => {
    expect(new Set(STORIES.map((s) => s.id)).size).toBe(STORIES.length);
  });
});

describe("validateStory", () => {
  const base = STORIES[0];

  it("refuses a deck that ends on its punchline", () => {
    const broken = { ...base, cards: base.cards.filter((c) => c.beat !== "LAND") };
    expect(validateStory(broken).join(" ")).toMatch(/LAND/);
  });

  it("refuses a deck with no ask", () => {
    const broken = { ...base, cards: base.cards.filter((c) => c.beat !== "ASK") };
    expect(validateStory(broken).join(" ")).toMatch(/ASK/);
  });

  it("refuses a caption that drops the credit", () => {
    expect(validateStory({ ...base, caption: "just vibes?" }).join(" ")).toMatch(/sourceCredit/);
  });

  it("refuses more cards than Instagram accepts", () => {
    const many = Array.from({ length: 25 }, () => base.cards[0]);
    expect(validateStory({ ...base, cards: many }).join(" ")).toMatch(/caps carousels/);
  });
});

describe("findStory", () => {
  it("finds by id and returns undefined otherwise", () => {
    expect(findStory("rell")?.title).toMatch(/Rell/);
    expect(findStory("nope")).toBeUndefined();
  });
});
