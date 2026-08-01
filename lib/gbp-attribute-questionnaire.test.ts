import { describe, it, expect } from "vitest";
import {
  buildQuestionnaire,
  answersToAttributes,
  groupQuestions,
  type AvailableAttribute,
} from "./gbp-attribute-questionnaire";

const av = (over: Partial<AvailableAttribute>): AvailableAttribute => ({
  parent: "attributes/x",
  displayName: "X",
  groupDisplayName: "Amenities",
  valueType: "BOOL",
  ...over,
});

describe("buildQuestionnaire", () => {
  it("separates unanswered from answered", () => {
    const q = buildQuestionnaire(
      [
        av({ parent: "attributes/a", displayName: "A" }),
        av({ parent: "attributes/b", displayName: "B" }),
      ],
      [{ name: "attributes/a", valueType: "BOOL", values: [true] }]
    );
    expect(q.answered.map((x) => x.name)).toEqual(["attributes/a"]);
    expect(q.askable.map((x) => x.name)).toEqual(["attributes/b"]);
    expect(q.answeredCount).toBe(1);
    expect(q.totalAvailable).toBe(2);
  });

  it("carries the existing answer so an owner can change their mind", () => {
    const q = buildQuestionnaire(
      [av({ parent: "attributes/a" })],
      [{ name: "attributes/a", valueType: "BOOL", values: [false] }]
    );
    expect(q.answered[0].currentValue).toBe(false);
  });

  it("treats an attribute with no values as unanswered, not as false", () => {
    // "No value" and "the owner said no" are different claims, and only one of
    // them should be shown to customers.
    const q = buildQuestionnaire([av({ parent: "attributes/a" })], [{ name: "attributes/a", values: [] }]);
    expect(q.askable).toHaveLength(1);
    expect(q.askable[0].currentValue).toBeNull();
  });

  it("puts identity and accessibility ahead of parking", () => {
    // These are live filters on Maps — an unset one removes the business from
    // the result set rather than ranking it lower.
    const q = buildQuestionnaire(
      [
        av({ parent: "attributes/p", displayName: "Free parking", groupDisplayName: "Parking" }),
        av({ parent: "attributes/i", displayName: "Identifies as Black-owned", groupDisplayName: "From the business" }),
        av({ parent: "attributes/w", displayName: "Wheelchair entrance", groupDisplayName: "Accessibility" }),
      ],
      []
    );
    expect(q.askable.map((x) => x.group)).toEqual(["From the business", "Accessibility", "Parking"]);
  });

  it("routes non-BOOL types to unsupported rather than asking a yes/no question", () => {
    const q = buildQuestionnaire(
      [
        av({ parent: "attributes/url", displayName: "Instagram", valueType: "URL" }),
        av({ parent: "attributes/pay", displayName: "Credit cards", valueType: "REPEATED_ENUM" }),
        av({ parent: "attributes/b", displayName: "Restroom" }),
      ],
      []
    );
    expect(q.askable.map((x) => x.name)).toEqual(["attributes/b"]);
    expect(q.unsupported.map((x) => x.valueType).sort()).toEqual(["REPEATED_ENUM", "URL"]);
  });

  it("skips deprecated attributes entirely", () => {
    const q = buildQuestionnaire(
      [av({ parent: "attributes/old", deprecated: true }), av({ parent: "attributes/new" })],
      []
    );
    expect(q.askable.map((x) => x.name)).toEqual(["attributes/new"]);
    expect(q.totalAvailable).toBe(1);
  });
});

describe("answersToAttributes", () => {
  const askable = new Set(["attributes/a", "attributes/b"]);

  it("builds Google's payload shape for true and false", () => {
    const { attributes } = answersToAttributes({ "attributes/a": true, "attributes/b": false }, askable);
    expect(attributes).toEqual([
      { name: "attributes/a", valueType: "BOOL", values: [true] },
      { name: "attributes/b", valueType: "BOOL", values: [false] },
    ]);
  });

  it("leaves an unanswered question unanswered instead of sending false", () => {
    // Sending false would publish "this business is not wheelchair accessible"
    // to customers on the strength of the owner having skipped the question.
    const { attributes } = answersToAttributes(
      { "attributes/a": null, "attributes/b": undefined },
      askable
    );
    expect(attributes).toEqual([]);
  });

  it("rejects any attribute that wasn't offered for this business", () => {
    // A client could otherwise post an id from another category and have us
    // write something Google never offered for this listing.
    const { attributes, rejected } = answersToAttributes(
      { "attributes/a": true, "attributes/not_offered": true },
      askable
    );
    expect(attributes.map((a) => a.name)).toEqual(["attributes/a"]);
    expect(rejected).toEqual(["attributes/not_offered"]);
  });

  it("produces an empty payload when nothing was answered, so the caller's empty-mask guard trips", () => {
    expect(answersToAttributes({}, askable).attributes).toEqual([]);
  });
});

describe("groupQuestions", () => {
  it("groups while keeping the priority order", () => {
    const q = buildQuestionnaire(
      [
        av({ parent: "attributes/p1", groupDisplayName: "Parking", displayName: "Free lot" }),
        av({ parent: "attributes/i1", groupDisplayName: "From the business", displayName: "Black-owned" }),
        av({ parent: "attributes/p2", groupDisplayName: "Parking", displayName: "Street parking" }),
      ],
      []
    );
    const grouped = groupQuestions(q.askable);
    expect(grouped.map((g) => g.group)).toEqual(["From the business", "Parking"]);
    expect(grouped[1].questions).toHaveLength(2);
  });
});
