import { describe, it, expect, afterEach } from "vitest";
import { dmAgentDisabled } from "./instagram-dm-agent";

/**
 * The switch defaults ON, and that direction is the point of the test.
 *
 * A kill switch that fails closed on a typo is a kill switch that silently
 * stops answering customers because someone misspelled a variable in Vercel.
 * These cases pin the opposite: only the explicit off values turn it off, and
 * anything unrecognised — including the empty string and a misspelling — leaves
 * the agent running.
 */
const set = (v: string | undefined) => {
  if (v === undefined) delete process.env.INSTAGRAM_DM_AGENT;
  else process.env.INSTAGRAM_DM_AGENT = v;
};

afterEach(() => set(undefined));

describe("dmAgentDisabled", () => {
  it("is on when the variable is absent", () => {
    set(undefined);
    expect(dmAgentDisabled()).toBe(false);
  });

  it.each(["off", "OFF", "false", "0", "disabled", " off "])(
    "turns off for %j", (v) => {
      set(v);
      expect(dmAgentDisabled()).toBe(true);
    });

  it.each(["on", "true", "1", "enabled", "", "no", "yes", "offf"])(
    "stays on for %j", (v) => {
      set(v);
      expect(dmAgentDisabled()).toBe(false);
    });
});
