import { describe, it, expect } from "vitest";
import { compareNames, splitTdlrName, splitTypedName } from "./name-match";

describe("splitTdlrName", () => {
  it("reads TDLR's surname-first format", () => {
    expect(splitTdlrName("WEBB, MARCUS J")).toEqual({ last: "WEBB", first: "MARCUS" });
  });
  it("keeps a compound surname whole", () => {
    // Real record. Splitting on the hyphen would lose half the name.
    expect(splitTdlrName("GHOLSTON-JACKSON, BRITTIAN J").last).toBe("GHOLSTON-JACKSON");
  });
  it("ignores everything after the first given name", () => {
    // "MUNOZ, NESTOR NICOLAS" — no way to know if Nicolas is a middle name or
    // part of the surname, so it is simply not compared.
    expect(splitTdlrName("MUNOZ, NESTOR NICOLAS")).toEqual({ last: "MUNOZ", first: "NESTOR" });
  });
});

describe("compareNames", () => {
  it("matches what an owner would actually type", () => {
    expect(compareNames("Marcus Webb", "WEBB, MARCUS J")).toBe("exact");
    expect(compareNames("marcus webb", "WEBB, MARCUS J")).toBe("exact");
  });
  it("accepts a shortened first name as partial, not a mismatch", () => {
    // An owner writing "Marc" must not end the conversation.
    expect(compareNames("Marc Webb", "WEBB, MARCUS J")).toBe("partial");
  });
  it("treats a surname-only entry as partial", () => {
    expect(compareNames("Webb", "WEBB, MARCUS J")).toBe("partial");
  });
  it("rejects a different surname", () => {
    expect(compareNames("Marcus Reed", "WEBB, MARCUS J")).toBe("mismatch");
  });
  it("rejects a different first name under the same surname", () => {
    expect(compareNames("Tanya Webb", "WEBB, MARCUS J")).toBe("mismatch");
  });
});
