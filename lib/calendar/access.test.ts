import { describe, it, expect, afterEach, vi } from "vitest";
import { canUseCalendar } from "./access";

afterEach(() => vi.unstubAllEnvs());

/** Private testing: only the allowlist, until CALENDAR_OPEN is set to exactly "true". */
describe("calendar access", () => {
  it("admits the allowlisted admin only", () => {
    expect(canUseCalendar("lamont703@gmail.com")).toBe(true);
    expect(canUseCalendar(" LAMONT703@gmail.com")).toBe(true);
    expect(canUseCalendar("barber@example.com")).toBe(false);
    expect(canUseCalendar(null)).toBe(false);
  });
  it("opens only on the exact switch", () => {
    vi.stubEnv("CALENDAR_OPEN", "1");
    expect(canUseCalendar("barber@example.com")).toBe(false);
    vi.stubEnv("CALENDAR_OPEN", "true");
    expect(canUseCalendar("barber@example.com")).toBe(true);
  });
});
