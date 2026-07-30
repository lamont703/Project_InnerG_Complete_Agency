import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GscWindowPicker } from "./gsc-window-picker";

/**
 * The window lives in the URL, so these assert on what gets pushed. The server
 * re-resolves and clamps whatever arrives (lib/gsc-window.ts), which is why the
 * picker is free to propose a range without validating dates itself.
 */

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams("view=best"),
}));

const PROPS = {
  activePreset: "28d",
  start: "2026-07-01",
  end: "2026-07-28",
  min: "2025-04-04",
  max: "2026-07-28",
};

/** The pushed URL, parsed. */
const pushedParams = () => new URLSearchParams(push.mock.calls.at(-1)![0].replace(/^\?/, ""));

describe("GscWindowPicker", () => {
  beforeEach(() => push.mockClear());

  it("offers the preset windows plus a custom option", () => {
    render(<GscWindowPicker {...PROPS} />);
    for (const label of [
      "Last 7 days",
      "Last 28 days",
      "Last 3 months",
      "Last 6 months",
      "Last 12 months",
      "Last 16 months",
      "Custom…",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("marks the active preset", () => {
    render(<GscWindowPicker {...PROPS} activePreset="90d" />);
    expect(screen.getByText("Last 3 months").className).toContain("bg-slate-900");
    expect(screen.getByText("Last 28 days").className).not.toContain("bg-slate-900");
  });

  it("pushes the preset and clears any custom dates, which would otherwise win server-side", async () => {
    const user = userEvent.setup();
    render(<GscWindowPicker {...PROPS} activePreset="custom" start="2026-06-01" end="2026-06-30" />);

    await user.click(screen.getByText("Last 3 months"));

    const params = pushedParams();
    expect(params.get("preset")).toBe("90d");
    expect(params.has("start")).toBe(false);
    expect(params.has("end")).toBe(false);
  });

  it("preserves unrelated params, so the chosen table view survives a range change", async () => {
    const user = userEvent.setup();
    render(<GscWindowPicker {...PROPS} />);
    await user.click(screen.getByText("Last 7 days"));
    expect(pushedParams().get("view")).toBe("best");
  });

  it("seeds the custom inputs from the resolved window", async () => {
    const user = userEvent.setup();
    render(<GscWindowPicker {...PROPS} />);
    await user.click(screen.getByText("Custom…"));

    expect((screen.getByLabelText(/From/i) as HTMLInputElement).value).toBe("2026-07-01");
    expect((screen.getByLabelText(/To/i) as HTMLInputElement).value).toBe("2026-07-28");
  });

  it("bounds the date inputs to what Search Console retains", async () => {
    const user = userEvent.setup();
    render(<GscWindowPicker {...PROPS} />);
    await user.click(screen.getByText("Custom…"));

    const from = screen.getByLabelText(/From/i) as HTMLInputElement;
    expect(from.min).toBe("2025-04-04");
    expect(from.max).toBe("2026-07-28");
  });

  it("pushes a custom range and drops the preset", async () => {
    const user = userEvent.setup();
    render(<GscWindowPicker {...PROPS} />);
    await user.click(screen.getByText("Custom…"));

    const from = screen.getByLabelText(/From/i);
    const to = screen.getByLabelText(/To/i);
    await user.clear(from);
    await user.type(from, "2026-05-01");
    await user.clear(to);
    await user.type(to, "2026-05-31");
    await user.click(screen.getByText("Apply"));

    const params = pushedParams();
    expect(params.get("start")).toBe("2026-05-01");
    expect(params.get("end")).toBe("2026-05-31");
    expect(params.has("preset")).toBe(false);
  });

  it("opens the custom panel already expanded when a custom range is active", () => {
    render(<GscWindowPicker {...PROPS} activePreset="custom" />);
    expect(screen.getByLabelText(/From/i)).toBeInTheDocument();
  });

  it("won't apply a half-filled range", async () => {
    const user = userEvent.setup();
    render(<GscWindowPicker {...PROPS} />);
    await user.click(screen.getByText("Custom…"));
    await user.clear(screen.getByLabelText(/From/i));

    expect(screen.getByText("Apply")).toBeDisabled();
    expect(push).not.toHaveBeenCalled();
  });
});
