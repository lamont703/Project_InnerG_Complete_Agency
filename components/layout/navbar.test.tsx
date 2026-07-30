import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "./navbar";

/**
 * Regression test for a bug that shipped: the View As picker's open/closed state
 * lived inside ViewAsMenuItem, which is rendered inside the account dropdown's
 * `{isAccountOpen && …}` block. Clicking the item closed the dropdown, which
 * unmounted the item and threw away the state — so the picker never appeared and
 * the menu entry did nothing at all.
 *
 * This asserts the interaction end-to-end through the navbar: click Account,
 * click View As, and the member list must actually be on screen even though the
 * dropdown that contained the button is gone.
 */

const ADMIN_EMAIL = "lamont703@gmail.com";

const MEMBERS = [
  { memberId: "m1", userId: "u1", name: "Sharon Ainsworth", email: "sharon@example.com", claimedType: "salon" },
  { memberId: "m2", userId: "u2", name: "Barber To The Stars", email: "stars@example.com", claimedType: "shop" },
];

/** Minimal chainable stand-in for the postgrest query builder. */
function chain(result: any) {
  const o: any = {
    select: () => o,
    eq: () => o,
    neq: () => o,
    in: () => o,
    order: () => o,
    limit: () => o,
    maybeSingle: async () => result,
    // `await query` with no terminal method — the projects lookup does this.
    then: (resolve: any) => resolve(result),
  };
  return o;
}

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "admin-user", email: ADMIN_EMAIL } } }),
      getSession: async () => ({ data: { session: { user: { email: ADMIN_EMAIL } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({}),
    },
    from: (table: string) =>
      table === "users"
        ? chain({ data: { full_name: "Lamont Evans", role: "community_member" } })
        : chain({ data: [] }),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/analytics", () => ({
  trackNavClick: vi.fn(),
  trackCTAClick: vi.fn(),
}));

describe("Navbar — View As wiring", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          success: true,
          isAdmin: true,
          realEmail: ADMIN_EMAIL,
          viewingAs: null,
          effectiveAccount: null,
          members: MEMBERS,
        }),
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("opens the member picker from the account menu, and the picker survives the menu closing", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    // Wait for the client-side auth check to populate the account menu.
    const account = await screen.findByRole("button", { name: /Account/i });
    await user.click(account);

    const item = await screen.findByText(/View As: Member Select/);
    await user.click(item);

    // The dropdown that held the button is gone…
    await waitFor(() =>
      expect(screen.queryByText(/View As: Member Select/)).not.toBeInTheDocument()
    );
    // …and the picker is on screen with the members loaded. This is the assertion
    // that failed before the state was lifted into the navbar.
    expect(await screen.findByText("View site as a member")).toBeInTheDocument();
    expect(screen.getByText("Sharon Ainsworth")).toBeInTheDocument();
    expect(screen.getByText("Barber To The Stars")).toBeInTheDocument();
    // Rendering the whole navbar plus two userEvent interactions runs past the
    // 5s default in CI-like conditions.
  }, 20000);

  it("does not show the View As entry when the server says the session isn't an admin", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({ error: "Unauthorized." }) }))
    );
    const user = userEvent.setup();
    render(<Navbar />);

    const account = await screen.findByRole("button", { name: /Account/i });
    await user.click(account);

    // The ordinary member links are there; the admin entry is not.
    expect(await screen.findByText("Manage My Listing")).toBeInTheDocument();
    expect(screen.queryByText(/View As: Member Select/)).not.toBeInTheDocument();
  });
});
