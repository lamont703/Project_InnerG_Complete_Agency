import { describe, it, expect } from "vitest";
import { toOwnerRequest, OWNER_SETTABLE_STATUSES } from "./booking-requests";

const row = {
  id: "abc",
  requested_date: "2026-08-22",
  requested_time: "1:00 PM",
  service_name: "Haircut & Style",
  service_price: "45",
  status: "notified",
  created_at: "2026-08-20T10:00:00Z",
  customer_name: "Dana Rivers",
  customer_phone: "+17135550134",
  customer_email: "dana@example.com",
  customer_notes: "Please use the back entrance, I'm in a wheelchair",
};

describe("the PII gate", () => {
  it("hands over nothing identifying to an unverified owner", () => {
    const r = toOwnerRequest(row, false);
    expect(r.customerName).toBeNull();
    expect(r.customerPhone).toBeNull();
    expect(r.customerEmail).toBeNull();
  });

  it("withholds the notes too — they describe the customer", () => {
    // "I'm in a wheelchair" is not less sensitive than a phone number just
    // because it arrived as free text.
    expect(toOwnerRequest(row, false).notes).toBeNull();
  });

  it("never leaks a value through a field an unverified owner CAN see", () => {
    const r = toOwnerRequest(row, false);
    const visible = JSON.stringify(r);
    expect(visible).not.toContain("Dana");
    expect(visible).not.toContain("7135550134");
    expect(visible).not.toContain("dana@example.com");
    expect(visible).not.toContain("wheelchair");
  });

  it("still shows enough to be worth coming back to", () => {
    const r = toOwnerRequest(row, false);
    expect(r.requestedDate).toBe("2026-08-22");
    expect(r.requestedTime).toBe("1:00 PM");
    expect(r.serviceName).toBe("Haircut & Style");
    expect(r.status).toBe("notified");
  });

  it("opens up once ownership is proven", () => {
    const r = toOwnerRequest(row, true);
    expect(r.customerName).toBe("Dana Rivers");
    expect(r.customerPhone).toBe("+17135550134");
    expect(r.customerEmail).toBe("dana@example.com");
    expect(r.notes).toContain("wheelchair");
  });

  it("treats a missing field as absent, not as undefined leaking through", () => {
    const sparse = { ...row, customer_name: null, customer_notes: undefined };
    const r = toOwnerRequest(sparse, true);
    expect(r.customerName).toBeNull();
    expect(r.notes).toBeNull();
  });
});

describe("what an owner may set", () => {
  it("cannot set the machine-owned statuses", () => {
    // 'new', 'notified' and 'no_response' are written by the API and the cron.
    // Letting an owner set them would let a business erase the record of having
    // been asked.
    for (const forbidden of ["new", "notified", "no_response", "cancelled"]) {
      expect(OWNER_SETTABLE_STATUSES).not.toContain(forbidden as any);
    }
  });

  it("covers the three outcomes an owner actually knows about", () => {
    expect([...OWNER_SETTABLE_STATUSES].sort()).toEqual(["booked", "contacted", "declined"]);
  });
});
