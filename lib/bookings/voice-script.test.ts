import { describe, it, expect } from "vitest";
import {
  spokenPhone, bookingVoiceScript, bookingVoiceTwiml, withinCallWindow,
  CALL_WINDOW_CENTRAL,
} from "./voice-script";

describe("spokenPhone", () => {
  /*
   * The whole point. "7702805711" is read by a TTS engine as "seven billion,
   * seven hundred and two million…" — the single most important thing in the
   * call, mangled.
   */
  it("groups the digits so they can be written down", () => {
    expect(spokenPhone("7702805711")).toBe("7 7 0, 2 8 0, 5 7 1 1");
  });

  it("strips formatting and the US country code", () => {
    expect(spokenPhone("+1 (770) 280-5711")).toBe("7 7 0, 2 8 0, 5 7 1 1");
  });

  it("still spaces a number it cannot parse rather than reading it as an integer", () => {
    expect(spokenPhone("12345")).toBe("1 2 3 4 5");
  });
});

describe("bookingVoiceScript", () => {
  const s = bookingVoiceScript({
    shopName: "Greater Jerusalem Barber",
    customerName: "Dana Reed",
    customerPhone: "7702805711",
    serviceName: "Haircut",
    prettyDate: "Monday, August 31",
    requestedTime: "2:00 PM",
  });
  const all = s.join(" ");

  // "Who is this" has to be answered in the first sentence or the rest is not
  // heard.
  it("identifies itself in the opening line", () => {
    expect(s[0]).toMatch(/ShearQuery/);
    expect(s[0]).toMatch(/Greater Jerusalem Barber/);
  });

  it("says why it is calling rather than launching into detail", () => {
    expect(s[1]).toMatch(/could not reach you by text/i);
  });

  it("carries the name, service, date and time", () => {
    expect(all).toContain("Dana Reed");
    expect(all).toContain("Haircut");
    expect(all).toContain("Monday, August 31");
    expect(all).toContain("2:00 PM");
  });

  // Said at both points a listener reaches for a pen.
  it("reads the callback number twice, spoken", () => {
    const spoken = spokenPhone("7702805711");
    expect(all.split(spoken).length - 1).toBe(2);
  });

  it("never calls a request a booking", () => {
    expect(all).toMatch(/request, not a confirmed booking/i);
  });

  it("offers a way to stop the calls", () => {
    expect(all).toMatch(/stop/i);
  });
});

describe("bookingVoiceTwiml", () => {
  it("opens with a pause so the greeting does not eat the first line", () => {
    expect(bookingVoiceTwiml(["Hello"]).indexOf("<Pause")).toBeLessThan(
      bookingVoiceTwiml(["Hello"]).indexOf("<Say")
    );
  });

  // A shop name is scraped third-party text going into XML.
  it("escapes a shop name containing XML metacharacters", () => {
    const x = bookingVoiceTwiml(["Calling for Bob & Sons <Barbers>"]);
    expect(x).toContain("Bob &amp; Sons &lt;Barbers&gt;");
    expect(x).not.toContain("<Barbers>");
  });

  it("hangs up rather than leaving the line open", () => {
    expect(bookingVoiceTwiml(["x"])).toContain("<Hangup/>");
  });

  /*
   * The bug this pins cost nothing only because it was caught before a call
   * was placed. lib/twiml.ts prepends the XML declaration; emitting a second
   * one makes the document malformed, and Twilio reports malformed TwiML as a
   * generic "application error" — the caller hears dead air and no log says
   * why.
   */
  it("emits no XML declaration, because twiml() adds it", () => {
    expect(bookingVoiceTwiml(["x"])).not.toContain("<?xml");
    expect(bookingVoiceTwiml(["x"]).trimStart().startsWith("<Response>")).toBe(true);
  });
});

describe("withinCallWindow", () => {
  // 2026-09-01 is a Tuesday. 17:00 UTC = 12:00 Central (CDT).
  it("allows a Tuesday midday Central", () => {
    expect(withinCallWindow(new Date("2026-09-01T17:00:00Z"))).toBe(true);
  });

  /*
   * The case the window exists for: 9am Central is 7am Pacific. Calling a
   * California shop then is how an automated number gets blocked.
   */
  it("refuses before the window opens", () => {
    expect(withinCallWindow(new Date("2026-09-01T14:00:00Z"))).toBe(false); // 09:00 Central
  });

  it("refuses after it closes", () => {
    expect(withinCallWindow(new Date("2026-09-02T01:00:00Z"))).toBe(false); // 20:00 Central
  });

  it("refuses Sunday and Monday, when most shops are shut", () => {
    expect(withinCallWindow(new Date("2026-08-30T17:00:00Z"))).toBe(false); // Sunday
    expect(withinCallWindow(new Date("2026-08-31T17:00:00Z"))).toBe(false); // Monday
  });

  /*
   * Derived through Intl rather than a fixed offset. A hardcoded -6 would be an
   * hour wrong for eight months a year, and an hour wrong at this window's edge
   * is a 10am call.
   */
  it("follows daylight saving across the November change", () => {
    expect(withinCallWindow(new Date("2026-11-03T17:00:00Z"))).toBe(true);  // 11:00 CST, Tue
    expect(withinCallWindow(new Date("2026-11-03T16:00:00Z"))).toBe(false); // 10:00 CST, Tue
  });

  it("has a window that is safe in every continental timezone", () => {
    const [open, close] = CALL_WINDOW_CENTRAL;
    expect(open - 2).toBeGreaterThanOrEqual(9);  // Pacific never before 9am
    expect(close + 1).toBeLessThanOrEqual(19);   // Eastern never past 7pm
  });
});
