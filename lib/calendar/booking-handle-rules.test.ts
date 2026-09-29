import { describe, it, expect } from "vitest";
import { isBookingHandle, makeBookingHandle } from "./booking-handle-rules";

describe("booking handles", () => {
  it("are short and readable", () => {
    expect(makeBookingHandle("Marcus Cuts & Co.", new Set())).toBe("marcus-cuts-and-co");
    expect(makeBookingHandle("ShearQuery Demo Barbershop", new Set())).toBe("shearquery-demo-barbershop");
    expect(makeBookingHandle("Café Fadez", new Set())).toBe("cafe-fadez");
    expect(makeBookingHandle("", new Set())).toBe("book");
    expect(makeBookingHandle("A", new Set())).toBe("a-book");
  });

  it("are made unique with a number", () => {
    expect(makeBookingHandle("Marcus Cuts", new Set(["marcus-cuts"]))).toBe("marcus-cuts-2");
    expect(makeBookingHandle("Marcus Cuts", new Set(["marcus-cuts", "marcus-cuts-2"]))).toBe("marcus-cuts-3");
  });

  it("always pass their own check, and reject anything else", () => {
    for (const n of ["Marcus Cuts & Co.", "Café Fadez", "", "A", "x".repeat(80)]) expect(isBookingHandle(makeBookingHandle(n, new Set()))).toBe(true);
    for (const bad of ["Marcus", "-x", "a b", "../etc", ""]) expect(isBookingHandle(bad)).toBe(false);
  });
});
