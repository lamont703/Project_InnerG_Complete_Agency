import { describe, it, expect } from "vitest";
import { parseProposals, type NoteAgentCandidate } from "./note-agent";

const CANDIDATES: NoteAgentCandidate[] = [
  {
    customerId: "gid://c/kedrick",
    clientName: "Kedrick Emanuel",
    note: "this must be a duplicate. Kedrick came last week. KD Emmanuel",
    currentStatus: "active",
    hasMergePointer: false,
    cadenceDays: 37,
    daysOverdue: 154,
    visits: 15,
    currentMergeTargetId: null,
    currentSnoozeUntil: null,
    currentCadenceOverride: null,
  },
  {
    customerId: "gid://c/amber",
    clientName: "Amber C. Flynn",
    note: "may need to start seeing another barber closer to my house",
    currentStatus: "active",
    hasMergePointer: false,
    cadenceDays: 26,
    daysOverdue: -2,
    visits: 55,
    currentMergeTargetId: null,
    currentSnoozeUntil: null,
    currentCadenceOverride: null,
  },
];

const ROSTER = [
  { customerId: "gid://c/kedrick", name: "Kedrick Emanuel" },
  { customerId: "gid://c/kd", name: "KD Emanuel" },
  { customerId: "gid://c/amber", name: "Amber C. Flynn" },
];

describe("parseProposals", () => {
  it("returns nothing for a non-array", () => {
    expect(parseProposals({ action: "merge" }, CANDIDATES, ROSTER)).toEqual([]);
  });

  it("accepts a well-formed merge and resolves the target's name", () => {
    const out = parseProposals(
      [
        {
          customerId: "gid://c/kedrick",
          action: "merge",
          mergeTargetId: "gid://c/kd",
          reasoning: "The note says 'this must be a duplicate' and names KD Emmanuel.",
          confidence: "high",
        },
      ],
      CANDIDATES,
      ROSTER,
    );
    expect(out).toHaveLength(1);
    expect(out[0].mergeTargetName).toBe("KD Emanuel");
    expect(out[0].clientName).toBe("Kedrick Emanuel");
  });

  it("drops a proposal for a client that was never sent for review", () => {
    // Guards against the model inventing a customer id.
    const out = parseProposals(
      [{ customerId: "gid://c/ghost", action: "inactive", reasoning: "x", confidence: "high" }],
      CANDIDATES,
      ROSTER,
    );
    expect(out).toEqual([]);
  });

  it("drops a merge whose target is not a real record", () => {
    // A wrong merge silently hides a paying client from the queue — the most
    // expensive mistake available here, so it is rejected rather than repaired.
    const out = parseProposals(
      [
        {
          customerId: "gid://c/kedrick",
          action: "merge",
          mergeTargetId: "gid://c/nobody",
          reasoning: "x",
          confidence: "high",
        },
      ],
      CANDIDATES,
      ROSTER,
    );
    expect(out).toEqual([]);
  });

  it("refuses to merge a record into itself", () => {
    const out = parseProposals(
      [
        {
          customerId: "gid://c/kedrick",
          action: "merge",
          mergeTargetId: "gid://c/kedrick",
          reasoning: "x",
          confidence: "high",
        },
      ],
      CANDIDATES,
      ROSTER,
    );
    expect(out).toEqual([]);
  });

  it("hides 'none' rather than showing an empty suggestion", () => {
    const out = parseProposals(
      [{ customerId: "gid://c/amber", action: "none", reasoning: "Nothing implied.", confidence: "high" }],
      CANDIDATES,
      ROSTER,
    );
    expect(out).toEqual([]);
  });

  it("drops a proposal with no stated reason", () => {
    // An unexplained suggestion cannot be reviewed, so it must not be offered.
    const out = parseProposals(
      [{ customerId: "gid://c/amber", action: "inactive", reasoning: "  ", confidence: "high" }],
      CANDIDATES,
      ROSTER,
    );
    expect(out).toEqual([]);
  });

  it("rejects an unknown action", () => {
    const out = parseProposals(
      [{ customerId: "gid://c/amber", action: "delete_client", reasoning: "x", confidence: "high" }],
      CANDIDATES,
      ROSTER,
    );
    expect(out).toEqual([]);
  });

  it("rejects a malformed snooze date instead of guessing one", () => {
    const out = parseProposals(
      [{ customerId: "gid://c/amber", action: "snooze", snoozeUntil: "December", reasoning: "x", confidence: "low" }],
      CANDIDATES,
      ROSTER,
    );
    expect(out).toEqual([]);
  });

  it("falls back to 'other' for an unrecognised inactive reason", () => {
    const out = parseProposals(
      [
        {
          customerId: "gid://c/amber",
          action: "inactive",
          inactiveReason: "ghosted_me",
          reasoning: "She says she needs someone closer to home.",
          confidence: "medium",
        },
      ],
      CANDIDATES,
      ROSTER,
    );
    expect(out[0].inactiveReason).toBe("other");
  });

  it("rejects an out-of-range cadence rather than storing it", () => {
    expect(
      parseProposals(
        [{ customerId: "gid://c/amber", action: "cadence", cadenceDays: 0, reasoning: "x", confidence: "low" }],
        CANDIDATES,
        ROSTER,
      ),
    ).toEqual([]);
    expect(
      parseProposals(
        [{ customerId: "gid://c/amber", action: "cadence", cadenceDays: 5000, reasoning: "x", confidence: "low" }],
        CANDIDATES,
        ROSTER,
      ),
    ).toEqual([]);
  });

  it("defaults an unrecognised confidence to low rather than high", () => {
    // Failing toward caution: an unlabelled suggestion should look uncertain.
    const out = parseProposals(
      [{ customerId: "gid://c/amber", action: "inactive", reasoning: "x", confidence: "certain" }],
      CANDIDATES,
      ROSTER,
    );
    expect(out[0].confidence).toBe("low");
  });
});

describe("no-op proposals", () => {
  it("drops a merge that is already applied to the same target", () => {
    // Anthony Bennett's note still says "Duplicate", so the model keeps
    // proposing the merge that was set days ago. A suggestion that changes
    // nothing costs a read and a little trust every time it appears.
    const already = CANDIDATES.map((c) =>
      c.customerId === "gid://c/kedrick" ? { ...c, currentMergeTargetId: "gid://c/kd" } : c,
    );
    const out = parseProposals(
      [{ customerId: "gid://c/kedrick", action: "merge", mergeTargetId: "gid://c/kd", reasoning: "dup", confidence: "high" }],
      already,
      ROSTER,
    );
    expect(out).toEqual([]);
  });

  it("still proposes a merge that points somewhere new", () => {
    const already = CANDIDATES.map((c) =>
      c.customerId === "gid://c/kedrick" ? { ...c, currentMergeTargetId: "gid://c/amber" } : c,
    );
    const out = parseProposals(
      [{ customerId: "gid://c/kedrick", action: "merge", mergeTargetId: "gid://c/kd", reasoning: "dup", confidence: "high" }],
      already,
      ROSTER,
    );
    expect(out).toHaveLength(1);
  });

  it("drops an inactive proposal for someone already inactive", () => {
    const already = CANDIDATES.map((c) =>
      c.customerId === "gid://c/amber" ? { ...c, currentStatus: "inactive" } : c,
    );
    const out = parseProposals(
      [{ customerId: "gid://c/amber", action: "inactive", inactiveReason: "moved", reasoning: "gone", confidence: "high" }],
      already,
      ROSTER,
    );
    expect(out).toEqual([]);
  });

  it("drops a cadence override identical to the one already set", () => {
    const already = CANDIDATES.map((c) =>
      c.customerId === "gid://c/amber" ? { ...c, currentCadenceOverride: 40 } : c,
    );
    const out = parseProposals(
      [{ customerId: "gid://c/amber", action: "cadence", cadenceDays: 40, reasoning: "slower", confidence: "high" }],
      already,
      ROSTER,
    );
    expect(out).toEqual([]);
  });
});
