import { describe, it, expect } from "vitest";
import { demoMemberFromToken, demoToken, isDemoEmail, isFictionalPhone, isRunningDemoBusiness, runInDemo } from "./core";

const ID = "3f2b8c1e-1111-4222-8333-944455556666";
const ctx = { ownerMemberId: "owner", demoMemberId: ID, demoEmail: "salon.abc@demo.shearquery.invalid", businessType: "salon" };

describe("demo fences", () => {
  it("round-trips a demo token and ignores real ones", () => {
    expect(demoMemberFromToken(demoToken(ID))).toBe(ID);
    expect(demoMemberFromToken("ya29.a0AfH6SMB-real-google-token")).toBeNull();
    expect(demoMemberFromToken("IGAAreal-instagram-token")).toBeNull();
    expect(demoMemberFromToken("sqdemo_not-a-uuid")).toBeNull();
  });

  it("recognizes only 555-0100 to 555-0199 as fiction", () => {
    for (const p of ["+17135550101", "(713) 555-0150", "713-555-0199", "17135550100"]) expect(isFictionalPhone(p), p).toBe(true);
    for (const p of ["+17135550200", "713-555-1234", "713-555-0099", "", null]) expect(isFictionalPhone(p), String(p)).toBe(false);
  });

  it("recognizes the demo email domain only", () => {
    expect(isDemoEmail("x@demo.shearquery.invalid")).toBe(true);
    expect(isDemoEmail("x@shearquery.com")).toBe(false);
  });

  it("lets a demo business through the testing gates ONLY while its own demo runs", async () => {
    expect(isRunningDemoBusiness(ctx.demoEmail)).toBe(false);
    await runInDemo(ctx, async () => {
      expect(isRunningDemoBusiness(ctx.demoEmail)).toBe(true);
      expect(isRunningDemoBusiness("barbershop.zzz@demo.shearquery.invalid")).toBe(false);
      expect(isRunningDemoBusiness("lamont703@gmail.com")).toBe(false);
    });
  });
});
