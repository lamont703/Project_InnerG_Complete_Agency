import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewAsPicker, ViewAsMenuItem } from "./view-as";

// The picker only needs the browser Supabase client via useViewAs, which it
// doesn't use — stub the module so importing it can't require env vars.
vi.mock("@/lib/supabase/browser", () => ({
  createBrowserClient: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  }),
}));

const MEMBERS = [
  { memberId: "m1", userId: "u1", name: "Sharon Ainsworth", email: "sharon@example.com", claimedType: "salon" },
  { memberId: "m2", userId: "u2", name: "Barber To The Stars", email: "stars@example.com", claimedType: "shop" },
  { memberId: "m3", userId: null, name: "Never Signed In", email: "nobody@example.com", claimedType: null },
];

/**
 * Regression coverage for the picker. The first version of this shipped broken:
 * the modal's open/closed state lived inside ViewAsMenuItem, which the navbar
 * renders inside its `{isAccountOpen && …}` block — so clicking the item closed
 * the menu, unmounted the item, and the picker never appeared. The state now
 * lives in the navbar and the picker is a sibling of <header>.
 *
 * These tests exercise the picker directly, so they'd catch the selection and
 * filtering behaviour regressing independently of that wiring.
 */
describe("ViewAsPicker", () => {
  let reload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload },
    });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ success: true }) })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("lists every member the admin can view as", () => {
    render(<ViewAsPicker members={MEMBERS} activeMemberId={null} onClose={() => {}} />);
    for (const m of MEMBERS) {
      expect(screen.getByText(m.name)).toBeInTheDocument();
    }
  });

  it("shows what each member claimed, and flags one who never signed in", () => {
    render(<ViewAsPicker members={MEMBERS} activeMemberId={null} onClose={() => {}} />);
    expect(screen.getByText(/claimed a salon/)).toBeInTheDocument();
    expect(screen.getByText(/claimed a barbershop/)).toBeInTheDocument();
    expect(screen.getByText(/never signed in/)).toBeInTheDocument();
  });

  it("marks the member currently being viewed as", () => {
    render(<ViewAsPicker members={MEMBERS} activeMemberId="m2" onClose={() => {}} />);
    const badge = screen.getByText("Current");
    expect(badge.closest("button")?.textContent).toContain("Barber To The Stars");
  });

  it("filters by name and by email as the admin types", async () => {
    const user = userEvent.setup();
    render(<ViewAsPicker members={MEMBERS} activeMemberId={null} onClose={() => {}} />);
    const box = screen.getByPlaceholderText(/Search members/i);

    await user.type(box, "sharon");
    expect(screen.getByText("Sharon Ainsworth")).toBeInTheDocument();
    expect(screen.queryByText("Barber To The Stars")).not.toBeInTheDocument();

    await user.clear(box);
    await user.type(box, "stars@example");
    expect(screen.getByText("Barber To The Stars")).toBeInTheDocument();
    expect(screen.queryByText("Sharon Ainsworth")).not.toBeInTheDocument();
  });

  it("says so when nothing matches instead of rendering an empty list", async () => {
    const user = userEvent.setup();
    render(<ViewAsPicker members={MEMBERS} activeMemberId={null} onClose={() => {}} />);
    await user.type(screen.getByPlaceholderText(/Search members/i), "zzzz");
    expect(screen.getByText(/No members match/)).toBeInTheDocument();
  });

  it("selecting a member POSTs that member's id, then reloads so server-rendered pages re-resolve", async () => {
    const user = userEvent.setup();
    render(<ViewAsPicker members={MEMBERS} activeMemberId={null} onClose={() => {}} />);

    await user.click(screen.getByText("Sharon Ainsworth"));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe("/api/admin/view-as");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ memberId: "m1" });
    await waitFor(() => expect(reload).toHaveBeenCalled());
  });

  it("surfaces a refusal from the server rather than silently doing nothing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: "Unauthorized." }),
    })));
    const user = userEvent.setup();
    render(<ViewAsPicker members={MEMBERS} activeMemberId={null} onClose={() => {}} />);

    await user.click(screen.getByText("Sharon Ainsworth"));

    expect(await screen.findByText("Unauthorized.")).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });

  it("closes on the X without switching anyone", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ViewAsPicker members={MEMBERS} activeMemberId={null} onClose={onClose} />);
    await user.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("ViewAsMenuItem", () => {
  it("renders nothing for a non-admin, so it's safe to drop into the shared navbar", () => {
    const { container } = render(<ViewAsMenuItem isAdmin={false} onClick={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("reports the click to the navbar, which owns the picker's state", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<ViewAsMenuItem isAdmin onClick={onClick} />);
    await user.click(screen.getByText(/View As: Member Select/));
    expect(onClick).toHaveBeenCalled();
  });
});
