import { describe, it, expect, vi, afterEach } from "vitest";

const { plans } = vi.hoisted(() => ({ plans: new Map<string, string>() }));
vi.mock("@/lib/member-plan", () => ({ getPlanByEmail: async (e: string) => ({ plan: plans.get(e) ?? "free", type: "barber", email: e }) }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) }) }),
}));

import { hasCalendarAccess, hasInstagramAccess } from "./feature-access";

afterEach(() => { vi.unstubAllEnvs(); plans.clear(); });

describe("calendar and Instagram access", () => {
  it("while in testing: only the testers, whatever their plan", async () => {
    plans.set("pro@example.com", "manage");
    expect(await hasCalendarAccess("lamont703@gmail.com")).toBe(true);
    expect(await hasCalendarAccess("pro@example.com")).toBe(false);
    expect(await hasInstagramAccess("pro@example.com")).toBe(false);
  });

  it("once open: Manage and up get in, Free doesn't, testers still do", async () => {
    vi.stubEnv("CALENDAR_OPEN", "true");
    vi.stubEnv("INSTAGRAM_MEMBER_CONNECT_OPEN", "true");
    plans.set("manage@example.com", "manage");
    plans.set("auto@example.com", "autopilot");
    expect(await hasCalendarAccess("free@example.com")).toBe(false);
    expect(await hasCalendarAccess("manage@example.com")).toBe(true);
    expect(await hasCalendarAccess("auto@example.com")).toBe(true);
    expect(await hasInstagramAccess("free@example.com")).toBe(false);
    expect(await hasInstagramAccess("manage@example.com")).toBe(true);
    expect(await hasCalendarAccess("lamont703@gmail.com")).toBe(true);
  });

  it("never lets in a missing email", async () => {
    vi.stubEnv("CALENDAR_OPEN", "true");
    expect(await hasCalendarAccess(null)).toBe(false);
    expect(await hasInstagramAccess("")).toBe(false);
  });
});
