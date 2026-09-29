import { describe, it, expect, vi, beforeEach } from "vitest";

const { sync, construct, inserted } = vi.hoisted(() => ({ sync: vi.fn(), construct: vi.fn(), inserted: [] as any[] }));
vi.mock("@/lib/billing/stripe", () => ({
  stripe: () => ({ webhooks: { constructEvent: construct } }),
  syncSubscription: sync,
  recordInvoicePaid: vi.fn(),
  recordRefund: vi.fn(),
}));
vi.mock("@/lib/commissions", () => ({ accrueForInvoice: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
      insert: async (row: any) => { inserted.push(row); return { error: null }; },
    }),
  }),
}));

import { POST } from "./route";

const req = (headers: Record<string, string> = {}) => new Request("http://x/api/stripe/webhook", { method: "POST", body: "{}", headers });

describe("the Stripe webhook", () => {
  beforeEach(() => { sync.mockReset(); construct.mockReset(); inserted.length = 0; vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test"); });

  it("refuses a request with no signature, and acts on nothing", async () => {
    expect((await POST(req())).status).toBe(400);
    expect(sync).not.toHaveBeenCalled();
  });

  it("refuses a forged signature", async () => {
    construct.mockImplementation(() => { throw new Error("No signatures found matching the expected signature"); });
    expect((await POST(req({ "stripe-signature": "t=1,v1=forged" }))).status).toBe(400);
    expect(sync).not.toHaveBeenCalled();
  });

  it("syncs a verified subscription event, then records it as handled", async () => {
    construct.mockReturnValue({ id: "evt_1", type: "customer.subscription.updated", data: { object: { id: "sub_1" } } });
    expect((await POST(req({ "stripe-signature": "t=1,v1=good" }))).status).toBe(200);
    expect(sync).toHaveBeenCalledWith("sub_1");
    expect(inserted).toEqual([{ stripe_event_id: "evt_1", type: "customer.subscription.updated" }]);
  });

  it("answers 500 and records nothing when handling fails, so Stripe retries", async () => {
    construct.mockReturnValue({ id: "evt_2", type: "customer.subscription.updated", data: { object: { id: "sub_2" } } });
    sync.mockRejectedValue(new Error("db down"));
    expect((await POST(req({ "stripe-signature": "t=1,v1=good" }))).status).toBe(500);
    expect(inserted).toEqual([]);
  });
});
