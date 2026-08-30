import { describe, it, expect } from "vitest";
import {
  spokenPhone, bookingVoiceScript, bookingVoiceTwiml, withinCallWindow,
  CALL_WINDOW_EASTERN, resolveVoice, DEFAULT_VOICE, ALLOWED_VOICES,
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
  // 2026-09-01 is a Tuesday. 16:00 UTC = 12:00 Eastern (EDT).
  it("allows midday Eastern", () => {
    expect(withinCallWindow(new Date("2026-09-01T16:00:00Z"))).toBe(true);
  });

  it("refuses before it opens", () => {
    expect(withinCallWindow(new Date("2026-09-01T13:00:00Z"))).toBe(false); // 09:00 ET
  });

  it("opens exactly at 10 and closes exactly at 19", () => {
    expect(withinCallWindow(new Date("2026-09-01T14:00:00Z"))).toBe(true);  // 10:00 ET
    expect(withinCallWindow(new Date("2026-09-01T22:59:00Z"))).toBe(true);  // 18:59 ET
    expect(withinCallWindow(new Date("2026-09-01T23:00:00Z"))).toBe(false); // 19:00 ET
  });

  /*
   * All seven days, by the site owner's decision. Barbershops keep their own
   * hours and plenty trade on Sunday, so a weekday-only rule would skip the
   * days some of them are busiest.
   */
  it("calls on Sunday and Monday too", () => {
    expect(withinCallWindow(new Date("2026-08-30T16:00:00Z"))).toBe(true); // Sunday
    expect(withinCallWindow(new Date("2026-08-31T16:00:00Z"))).toBe(true); // Monday
  });

  /*
   * Derived through Intl, not a fixed offset. A hardcoded -5 would be an hour
   * wrong for eight months a year, and an hour wrong at the open edge is a 9am
   * call. 2026-11-03 is after the change, so Eastern is EST (UTC-5).
   */
  it("follows daylight saving across the November change", () => {
    expect(withinCallWindow(new Date("2026-11-03T15:00:00Z"))).toBe(true);  // 10:00 EST
    expect(withinCallWindow(new Date("2026-11-03T14:00:00Z"))).toBe(false); // 09:00 EST
  });

  it("is a nine-hour window", () => {
    const [open, close] = CALL_WINDOW_EASTERN;
    expect(close - open).toBe(9);
  });
});

describe("resolveVoice", () => {
  it("accepts a whitelisted voice", () => {
    expect(resolveVoice("Polly.Joanna-Neural")).toBe("Polly.Joanna-Neural");
  });

  /*
   * The reason this is a whitelist. Twilio does not report an unknown voice
   * usefully — it falls back silently or throws an application error mid-call,
   * so the symptom is a voice nobody chose, or dead air.
   */
  it("falls back to the default for anything unknown", () => {
    expect(resolveVoice("Polly.Nonexistent")).toBe(DEFAULT_VOICE);
    expect(resolveVoice(null)).toBe(DEFAULT_VOICE);
    expect(resolveVoice("")).toBe(DEFAULT_VOICE);
    expect(resolveVoice('"><Say>owned</Say>')).toBe(DEFAULT_VOICE);
  });

  // The default is the standard voice until a neural one is heard on a real
  // call: an unverified default risks every call, the parameter risks one.
  it("defaults to a voice that is on the list", () => {
    expect(ALLOWED_VOICES).toContain(DEFAULT_VOICE);
  });

  it("renders the chosen voice into the TwiML", () => {
    expect(bookingVoiceTwiml(["hi"], "Polly.Matthew-Neural")).toContain('voice="Polly.Matthew-Neural"');
  });
});

describe("keypad prompt and Gather", () => {
  const input = {
    shopName: "Greater Jerusalem Barber", customerName: "Dana Reed",
    customerPhone: "7702805711", serviceName: "Haircut",
    prettyDate: "Monday, August 31", requestedTime: "2:00 PM",
  };

  it("offers the keypad only when asked", () => {
    expect(bookingVoiceScript(input).join(" ")).not.toMatch(/press 1/i);
    expect(bookingVoiceScript(input, { offerKeypad: true }).join(" ")).toMatch(/press 1.*press 2/i);
  });

  /*
   * The prompt sits BEFORE the number is repeated and before the opt-out.
   * Somebody who has decided presses immediately; everything after it is for
   * somebody who has not.
   */
  it("puts the prompt before the repeated number, not last", () => {
    const lines = bookingVoiceScript(input, { offerKeypad: true });
    const prompt = lines.findIndex((l) => /press 1/i.test(l));
    const repeat = lines.findIndex((l) => /Once more/i.test(l));
    const optout = lines.findIndex((l) => /STOP/i.test(l));
    expect(prompt).toBeGreaterThan(0);
    expect(prompt).toBeLessThan(repeat);
    expect(repeat).toBeLessThan(optout);
  });

  /*
   * The message goes INSIDE the Gather so a digit can be pressed at any point,
   * not only after the opt-out line has played out.
   */
  it("wraps the whole message in the Gather", () => {
    const x = bookingVoiceTwiml(["one", "two"], DEFAULT_VOICE, "https://x/r?call=1");
    const g = x.indexOf("<Gather"), end = x.indexOf("</Gather>");
    expect(g).toBeGreaterThan(-1);
    expect(x.indexOf("one")).toBeGreaterThan(g);
    expect(x.indexOf("two")).toBeLessThan(end);
  });

  // Voicemail: no digit ever comes, the Gather times out, the call ends. The
  // message was still left.
  it("still hangs up after the Gather, so voicemail is unaffected", () => {
    expect(bookingVoiceTwiml(["x"], DEFAULT_VOICE, "https://x/r")).toContain("<Hangup/>");
  });

  it("omits the Gather entirely when no url is given", () => {
    expect(bookingVoiceTwiml(["x"], DEFAULT_VOICE)).not.toContain("<Gather");
  });

  it("escapes the action url rather than trusting it into the XML", () => {
    const x = bookingVoiceTwiml(["x"], DEFAULT_VOICE, 'https://x/r?a=1&b=2');
    expect(x).toContain("a=1&amp;b=2");
  });
});
