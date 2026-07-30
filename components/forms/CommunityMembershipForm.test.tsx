import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommunityMembershipForm } from "./CommunityMembershipForm";

/**
 * Post-signup redirect behaviour.
 *
 * The free audit tool sends people here with ?next=connect so they land in the
 * Google OAuth flow once the account exists. The security property worth pinning
 * is that the destination is whitelisted: a signup form that navigates to
 * whatever the query string says is a phishing primitive — send someone a
 * "membership" link and collect them on the far side.
 */

let params = new URLSearchParams();

vi.mock("next/navigation", () => ({ useSearchParams: () => params }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() } }));
vi.mock("@/lib/supabase/browser", () => ({
  createBrowserClient: () => ({
    auth: { signInWithPassword: async () => ({ error: null }) },
  }),
}));

const setHref = vi.fn();

beforeEach(() => {
  params = new URLSearchParams();
  setHref.mockClear();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { set href(v: string) { setHref(v); }, get href() { return ""; } },
  });
  vi.stubGlobal("fetch", vi.fn(async () => ({
    json: async () => ({ success: true, redirect: "/account/manage-listing" }),
  })));
});

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function signUp() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/first name/i), "A");
  await user.type(screen.getByLabelText(/last name/i), "B");
  await user.type(screen.getByLabelText(/email address/i), "a@b.com");
  await user.type(screen.getByLabelText(/phone number/i), "5555550100");
  await user.type(screen.getByLabelText(/create password/i), "password123");
  await user.type(screen.getByLabelText(/confirm password/i), "password123");
  await user.click(screen.getByRole("button", { name: /join for free/i }));
}

describe("CommunityMembershipForm — post-signup destination", () => {
  it("uses the server's redirect by default", async () => {
    render(<CommunityMembershipForm />);
    await signUp();
    await waitFor(() => expect(setHref).toHaveBeenCalledWith("/account/manage-listing"));
  });

  it("sends ?next=connect straight into the Google OAuth flow", async () => {
    params = new URLSearchParams("next=connect");
    render(<CommunityMembershipForm />);
    await signUp();
    await waitFor(() => expect(setHref).toHaveBeenCalledWith("/api/google-business/start"));
  });

  it("ignores an arbitrary next value instead of redirecting to it", async () => {
    params = new URLSearchParams("next=https://evil.example.com/phish");
    render(<CommunityMembershipForm />);
    await signUp();
    await waitFor(() => expect(setHref).toHaveBeenCalled());
    expect(setHref).toHaveBeenCalledWith("/account/manage-listing");
    expect(setHref).not.toHaveBeenCalledWith(expect.stringContaining("evil.example.com"));
  });

  it("explains why signup comes first when connecting", () => {
    params = new URLSearchParams("next=connect");
    render(<CommunityMembershipForm />);
    expect(screen.getByText(/Next: connecting your Google Business Profile/i)).toBeInTheDocument();
  });

  it("shows no connect notice on an ordinary signup", () => {
    render(<CommunityMembershipForm />);
    expect(screen.queryByText(/Next: connecting your Google Business Profile/i)).not.toBeInTheDocument();
  });
});
