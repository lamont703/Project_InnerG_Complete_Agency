import { describe, it, expect } from "vitest";
import { isSetAside, isCoolingOff, CONTACT_COOLDOWN_DAYS } from "./queue";
import type { ClientNote } from "./notes";

const NOW = new Date("2026-08-20T12:00:00Z");

function note(over: Partial<ClientNote>): ClientNote {
  return {
    shopifyCustomerId: "gid://1",
    clientName: "Test",
    note: null,
    status: "active",
    snoozeUntil: null,
    inactiveReason: null,
    cadenceOverrideDays: null,
    lastContactedAt: null,
    mergedIntoCustomerId: null,
    reducedServices: null,
    updatedAt: null,
    ...over,
  };
}

describe("isSetAside", () => {
  it("keeps a client with no note in the queue", () => {
    expect(isSetAside(null, NOW)).toBe(false);
  });

  it("removes someone marked no longer a client", () => {
    // Justin Avery: 173 visits on a 7-day rhythm, moved to Las Vegas. He is not
    // "at risk", he is gone, and leaving him in overstates revenue at risk.
    expect(isSetAside(note({ status: "inactive", inactiveReason: "moved" }), NOW)).toBe(true);
  });

  it("removes a duplicate record that points at the real one", () => {
    // Anthony Bennett has three Shopify records. Two are hidden; the one he
    // actually books under stays.
    expect(isSetAside(note({ mergedIntoCustomerId: "gid://shopify/Customer/684" }), NOW)).toBe(true);
  });

  it("holds a snoozed client until the date arrives", () => {
    // Alicia Heard: her son went off to college, back at the holidays.
    expect(isSetAside(note({ status: "snoozed", snoozeUntil: "2026-12-15" }), NOW)).toBe(true);
  });

  it("returns a snoozed client on their own once the date passes", () => {
    // Nothing sweeps the table — the snooze simply stops applying.
    expect(isSetAside(note({ status: "snoozed", snoozeUntil: "2026-08-19" }), NOW)).toBe(false);
  });

  it("returns them on the day itself rather than one day late", () => {
    expect(isSetAside(note({ status: "snoozed", snoozeUntil: "2026-08-20" }), NOW)).toBe(false);
  });

  it("does NOT hide a snooze that has no date", () => {
    // Failing toward "visible" on purpose. A half-filled form must not make a
    // client vanish silently.
    expect(isSetAside(note({ status: "snoozed", snoozeUntil: null }), NOW)).toBe(false);
  });
});

describe("isCoolingOff", () => {
  it("is false when nobody has reached out", () => {
    expect(isCoolingOff(note({}), NOW)).toBe(false);
  });

  it("rests someone contacted yesterday", () => {
    expect(isCoolingOff(note({ lastContactedAt: "2026-08-19T10:00:00Z" }), NOW)).toBe(true);
  });

  it("surfaces them again once the cooldown expires", () => {
    const past = new Date(NOW.getTime() - (CONTACT_COOLDOWN_DAYS + 1) * 86_400_000).toISOString();
    expect(isCoolingOff(note({ lastContactedAt: past }), NOW)).toBe(false);
  });

  it("still rests them one day short of the cooldown", () => {
    const past = new Date(NOW.getTime() - (CONTACT_COOLDOWN_DAYS - 1) * 86_400_000).toISOString();
    expect(isCoolingOff(note({ lastContactedAt: past }), NOW)).toBe(true);
  });

  it("does not rest someone who was contacted but then set aside separately", () => {
    // The two rules are independent: being set aside is not a cooldown, and a
    // cooldown is not a dismissal. The queue applies set-aside first.
    const n = note({ lastContactedAt: "2026-01-01T00:00:00Z", status: "inactive" });
    expect(isCoolingOff(n, NOW)).toBe(false);
    expect(isSetAside(n, NOW)).toBe(true);
  });
});

describe("reduced clients", () => {
  it("is held out of the queue when no realistic cadence has been set", () => {
    // Amber C. Flynn: still a client, but there is no honest answer to "when is
    // she due" until someone sets one, so she is not chased on a guess.
    expect(isSetAside(note({ status: "reduced", cadenceOverrideDays: null }), NOW)).toBe(true);
  });

  it("is chased normally once a longer cadence is set", () => {
    expect(isSetAside(note({ status: "reduced", cadenceOverrideDays: 90 }), NOW)).toBe(false);
  });

  it("is not treated as gone — reactivating is a separate decision", () => {
    // 'reduced' must not behave like 'inactive'; the distinction is the whole
    // point of the state.
    const reduced = note({ status: "reduced", cadenceOverrideDays: 90 });
    const gone = note({ status: "inactive", inactiveReason: "moved" });
    expect(isSetAside(reduced, NOW)).toBe(false);
    expect(isSetAside(gone, NOW)).toBe(true);
  });
});
