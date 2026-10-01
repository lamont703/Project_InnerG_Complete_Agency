import { describe, it, expect } from "vitest";
import { cleanMessage, cleanTopic, supportEmail, supportSms, SUPPORT_EMAIL, SUPPORT_PHONE, MESSAGE_MAX, type SupportAlertInput } from "./support-rules";

const base: SupportAlertInput = {
  id: "1c186a97-c7f0-466f-b3d3-9f111fd51407", name: "Jo Smith", email: "jo@example.com", phone: "+15125550100",
  audience: "barber", topic: "bug", message: "The calendar page won't load.\nIt spins forever.", door: "site",
};

describe("support messages", () => {
  it("go to the owner's inbox and phone", () => {
    expect(SUPPORT_EMAIL).toBe("info@innergcomplete.com");
    expect(SUPPORT_PHONE).toBe("+17702805711");
  });

  it("refuse an empty or oversized message", () => {
    expect(cleanMessage("  ").ok).toBe(false);
    expect(cleanMessage("x".repeat(MESSAGE_MAX + 1)).ok).toBe(false);
    expect(cleanMessage("  help with billing  ")).toEqual({ ok: true, message: "help with billing" });
  });

  it("file an unknown topic under other", () => {
    expect(cleanTopic("BILLING")).toBe("billing");
    expect(cleanTopic("refund please")).toBe("other");
  });

  it("email says who, from where, and how to reply — escaped", () => {
    const e = supportEmail({ ...base, message: "<script>x</script> broken" });
    expect(e.subject).toContain("Something's broken");
    expect(e.html).toContain("Jo Smith");
    expect(e.html).toContain("the /search chat");
    expect(e.html).toContain("mailto:jo@example.com");
    expect(e.html).not.toContain("<script>");
  });

  it("text fits on a lock screen and carries a way to reply", () => {
    const s = supportSms({ ...base, message: "word ".repeat(100) });
    expect(s.length).toBeLessThan(320);
    expect(s).toContain("jo@example.com");
    expect(supportSms({ ...base, email: null, phone: null })).toContain("no contact on file");
  });
});
