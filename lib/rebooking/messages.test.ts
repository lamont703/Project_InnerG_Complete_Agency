import { describe, it, expect } from "vitest";
import { draftMessages, BOOKING_URL } from "./messages";
import type { DueClient } from "./queue";

function client(over: Partial<DueClient> = {}): DueClient {
  return {
    customerId: "gid://1",
    name: "Amber C. Flynn",
    email: "a@example.com",
    phone: null,
    visits: 55,
    cadenceDays: 26,
    regularity: 0.9,
    lastVisit: "2026-07-27",
    daysSinceLastVisit: 24,
    daysOverdue: -2,
    status: "upcoming",
    averageTicket: 47,
    annualValue: 665,
    emailSubscribed: true,
    smsSubscribed: false,
    reachableBy: "email",
    note: null,
    cadenceIsOverridden: false,
    ...over,
  } as DueClient;
}

const NOTE = (over: Record<string, unknown>) =>
  ({
    shopifyCustomerId: "gid://1",
    clientName: "Amber C. Flynn",
    note: "she needs someone closer to home",
    status: "active",
    snoozeUntil: null,
    inactiveReason: null,
    cadenceOverrideDays: null,
    lastContactedAt: null,
    mergedIntoCustomerId: null,
    reducedServices: null,
    updatedAt: null,
    ...over,
  }) as DueClient["note"];

describe("draftMessages", () => {
  it("tells an on-time client they're about due", () => {
    expect(draftMessages(client(), BOOKING_URL).sms).toContain("about due");
  });

  it("asks a late client if everything's good rather than nagging", () => {
    const m = draftMessages(client({ status: "at_risk", daysOverdue: 80 }), BOOKING_URL);
    expect(m.sms).toContain("Been a minute");
    expect(m.sms).not.toContain("about due");
  });

  it("gives a reduced client NO urgency at all", () => {
    // The Amber case. She said she needs someone closer to home and asked to
    // still be welcome; "you're about due" and "been a minute, everything
    // good?" both read as though nobody listened.
    const m = draftMessages(client({ note: NOTE({ status: "reduced" }) }), BOOKING_URL);
    expect(m.sms).not.toContain("about due");
    expect(m.sms).not.toContain("Been a minute");
    expect(m.sms).toContain("No pressure");
    expect(m.emailSubject).toContain("door");
  });

  it("keeps the reduced tone even when the cadence says they're badly overdue", () => {
    // Status alone must not override the relationship the barber recorded.
    const m = draftMessages(
      client({ status: "at_risk", daysOverdue: 200, note: NOTE({ status: "reduced" }) }),
      BOOKING_URL,
    );
    expect(m.sms).toContain("No pressure");
    expect(m.sms).not.toContain("Been a minute");
  });

  it("never puts note text or reduced services into the message", () => {
    // The standing invariant: nothing from rebooking_client_notes reaches a
    // client. The STATUS picks the template; the words are code.
    const m = draftMessages(
      client({
        note: NOTE({
          status: "reduced",
          reducedServices: "eyebrows",
          note: "her son went off to college and money is tight",
        }),
      }),
      BOOKING_URL,
    );
    const all = `${m.sms} ${m.emailSubject} ${m.emailBody}`;
    expect(all).not.toContain("eyebrows");
    expect(all).not.toContain("college");
    expect(all).not.toContain("money is tight");
  });

  it("uses 'there' rather than a broken greeting when there's no name", () => {
    expect(draftMessages(client({ name: "(no name)" }), BOOKING_URL).sms).toContain("Hey there");
  });
});

describe("greeting safety", () => {
  it.each([
    ["(no name)", "there"],
    ["", "there"],
    ["   ", "there"],
    ["123", "there"],
    ["???", "there"],
    ["Amber C. Flynn", "Amber"],
    ["O'Brien", "O'Brien"],
    ["Renée Dubois", "Renée"],
  ])("greets %j as %j", (name, expected) => {
    // A malformed greeting is worse than a generic one — it goes out to a real
    // person looking like a broken mail merge.
    expect(draftMessages(client({ name }), BOOKING_URL).sms).toContain(`Hey ${expected},`);
  });
});

describe("attached offers", () => {
  const OFFER = { code: "BACK-CALVIN-H29H", percentOff: 20, expiresAt: "2026-08-30T12:00:00Z" };

  it("puts the code and a readable deadline in a late client's SMS", () => {
    const m = draftMessages(client({ status: "at_risk", daysOverdue: 90 }), BOOKING_URL, OFFER);
    expect(m.sms).toContain("BACK-CALVIN-H29H");
    expect(m.sms).toContain("20% off");
    expect(m.sms).toContain("Aug 30");     // not an ISO string
    expect(m.sms).not.toContain("2026-08-30T12:00:00Z");
  });

  it("keeps the SMS inside two segments even with a code appended", () => {
    const m = draftMessages(client({ status: "at_risk", daysOverdue: 90 }), BOOKING_URL, OFFER);
    expect(m.smsTooLong).toBe(false);
  });

  it("sends no code when none was issued", () => {
    const m = draftMessages(client({ status: "at_risk", daysOverdue: 90 }), BOOKING_URL, null);
    expect(m.sms).not.toContain("%");
    expect(m.emailBody).not.toContain("code");
  });

  it("never discounts an on-time client, even if a code is passed", () => {
    // Routine rebooking carries no discount: 82-96% of these people come back
    // unprompted, so a coupon buys a decision they had already made.
    const m = draftMessages(client({ status: "upcoming", daysOverdue: -2 }), BOOKING_URL, OFFER);
    expect(m.sms).not.toContain("BACK-CALVIN-H29H");
  });

  it("never discounts a reduced client", () => {
    // Amber said she needs someone closer to home. A 20%-off countdown in reply
    // is haggling with someone who was being kind.
    const m = draftMessages(
      client({ status: "at_risk", daysOverdue: 200, note: NOTE({ status: "reduced" }) }),
      BOOKING_URL,
      OFFER,
    );
    expect(m.sms).not.toContain("BACK-CALVIN-H29H");
    expect(m.sms).toContain("No pressure");
  });
});

describe("opt-in nudge for lapsed clients who can't be texted", () => {
  const NUDGE = { consentUrl: "https://shearquery.com/sms-consent/abc123", percentOff: 20 };
  const OFFER = { code: "BACK-CALVIN-H29H", percentOff: 20, expiresAt: "2026-08-30T12:00:00Z" };

  it("tells a lapsed client the discount exists and how to get it", () => {
    const m = draftMessages(client({ status: "at_risk", daysOverdue: 296 }), BOOKING_URL, null, NUDGE);
    expect(m.emailBody).toContain("20% off");
    expect(m.emailBody).toContain(NUDGE.consentUrl);
  });

  it("never shows both a code and a how-to-get-a-code", () => {
    // One has it; the other is being told how. Showing both is incoherent.
    const m = draftMessages(client({ status: "at_risk", daysOverdue: 296 }), BOOKING_URL, OFFER, NUDGE);
    expect(m.emailBody).toContain(OFFER.code);
    expect(m.emailBody).not.toContain(NUDGE.consentUrl);
  });

  it("does not nudge an on-time client", () => {
    // No discount is coming for them either way, so dangling one is a promise
    // the system will not keep.
    const m = draftMessages(client({ status: "upcoming", daysOverdue: -2 }), BOOKING_URL, null, NUDGE);
    expect(m.emailBody).not.toContain(NUDGE.consentUrl);
    expect(m.sms).not.toContain(NUDGE.consentUrl);
  });

  it("does not nudge a reduced client", () => {
    const m = draftMessages(
      client({ status: "at_risk", daysOverdue: 200, note: NOTE({ status: "reduced" }) }),
      BOOKING_URL,
      null,
      NUDGE,
    );
    expect(m.sms).not.toContain(NUDGE.consentUrl);
    expect(m.emailBody).not.toContain(NUDGE.consentUrl);
  });

  it("keeps the SMS inside two segments if a nudge ever lands there", () => {
    // Unreachable in practice — an SMS-reachable client is already subscribed —
    // but the guard costs nothing and the assumption could change.
    const m = draftMessages(client({ status: "at_risk", daysOverdue: 296 }), BOOKING_URL, null, NUDGE);
    expect(m.smsTooLong).toBe(false);
  });
});

describe("nudge visibility matches the agent's invite rule", () => {
  const NUDGE = { consentUrl: "https://shearquery.com/sms-consent/abc123", percentOff: 20 };

  it.each([
    ["at_risk", true],
    ["overdue", true],
    ["due", false],
    ["upcoming", false],
  ])("status %s -> nudge shown: %s", (status, shown) => {
    // lib/rebooking/agent.ts decides whether to CREATE an invite using this same
    // pair of statuses. If the two ever disagree, a client gets an invite row
    // they never see a link for — and the consent campaign then skips them,
    // because it skips anyone who already has a record.
    const m = draftMessages(
      client({ status: status as DueClient["status"], daysOverdue: 40 }),
      BOOKING_URL,
      null,
      NUDGE,
    );
    expect(m.emailBody.includes(NUDGE.consentUrl)).toBe(shown);
  });
});
