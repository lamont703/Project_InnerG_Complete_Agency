import { describe, it, expect, vi, beforeAll } from "vitest";

let bookingEntityType: (k: string) => string;
beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  bookingEntityType = (await import("./booking-requests")).bookingEntityType;
});

/**
 * A claimed school's tour requests are stored as entity_type "school", but the
 * school is claimed as barber_school or cosmetology_school. Filtering by the
 * claim key showed a claimed school none of its tour requests (found 2026-09-28).
 */
describe("bookingEntityType", () => {
  it("maps both school claim keys to the type tour requests are stored under", () => {
    expect(bookingEntityType("barber_school")).toBe("school");
    expect(bookingEntityType("cosmetology_school")).toBe("school");
  });
  it("leaves every other listing type alone", () => {
    for (const k of ["shop", "salon", "barber", "cosmetologist", "barber_supply_store"]) expect(bookingEntityType(k)).toBe(k);
  });
});
