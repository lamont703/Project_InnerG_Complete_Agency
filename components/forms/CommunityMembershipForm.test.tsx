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

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useSearchParams: () => params, useRouter: () => ({ replace }), usePathname: () => "/membership" }));
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

async function signUp(accountType?: string) {
  const user = userEvent.setup();
  if (accountType) await user.selectOptions(screen.getByLabelText(/signing up as/i), accountType);
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

/**
 * Which surface gets the credit for a signup.
 *
 * This exists because the bug it pins was shipped and only caught while
 * repointing links. The audience landing pages pass source="membership-students"
 * on every render, so under the original precedence (prop first) an inbound
 * /membership/students?src=ai_mode recorded "membership-students" and the
 * ai_mode attribution vanished — silently, into a field nobody reads until they
 * ask "is AI Mode a funnel?" and get the wrong answer.
 */
describe("CommunityMembershipForm — signup attribution", () => {
  const bodyOf = () => JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);

  it("credits an explicit ?src= over the page's own default", async () => {
    params = new URLSearchParams("src=ai_mode");
    render(<CommunityMembershipForm source="membership-students" />);
    await signUp();
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(bodyOf().signupSource).toBe("ai_mode");
  });

  it("falls back to the page's default when no ?src= is present", async () => {
    render(<CommunityMembershipForm source="membership-students" />);
    await signUp();
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(bodyOf().signupSource).toBe("membership-students");
  });

  it("records the audience the page declared, and lets ?for= override it", async () => {
    params = new URLSearchParams("for=owner");
    render(<CommunityMembershipForm source="membership-students" audience="student" />);
    await signUp();
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    // "owner" is a retired type (2026-09-28); an old link records its successor.
    expect(bodyOf().audience).toBe("barbershop");
  });
});

/**
 * Signing up in the middle of connecting Claude. Claude's Connect sends a new
 * person to /login?redirect=/oauth/authorize?…; before this fix the form sent
 * them to /search and the connection never finished.
 */
describe("CommunityMembershipForm — signing up on the way to connecting Claude", () => {
  it("returns to Claude's Allow screen after signup on /login", async () => {
    params = new URLSearchParams({ redirect: "/oauth/authorize?client_id=https%3A%2F%2Fclaude.ai%2Fx&state=s" });
    render(<CommunityMembershipForm source="login" />);
    await signUp("client");
    await waitFor(() => expect(setHref).toHaveBeenCalled());
    expect(setHref).toHaveBeenCalledWith("/oauth/authorize?client_id=https%3A%2F%2Fclaude.ai%2Fx&state=s");
  });

  for (const r of ["https://evil.example/", "//evil.example/oauth/authorize?x", "/account/claude"]) {
    it(`never follows the redirect ${r}`, async () => {
      params = new URLSearchParams({ redirect: r });
      render(<CommunityMembershipForm source="login" />);
      await signUp("barber");
      await waitFor(() => expect(setHref).toHaveBeenCalled());
      expect(setHref).not.toHaveBeenCalledWith(r);
      expect(setHref).toHaveBeenCalledWith("/account/manage-listing");
    });
  }

  /*
   * ONE FORM, ONE CHOICE. /login and /membership both show the account-type
   * picker. /login knows nothing about who's signing up, so nothing is
   * pre-chosen there and it can't be submitted blank — a client connecting
   * Claude to book a haircut must never be stamped Barber by default.
   */
  it("asks for the account type on /login and won't submit without one", async () => {
    render(<CommunityMembershipForm source="login" />);
    expect((screen.getByLabelText(/signing up as/i) as HTMLSelectElement).value).toBe("");
    await signUp();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("records the type chosen on /login, and keeps ?for= in step without dropping the Claude redirect", async () => {
    params = new URLSearchParams({ redirect: "/oauth/authorize?client_id=x" });
    render(<CommunityMembershipForm source="login" />);
    await signUp("client");
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    const body = JSON.parse(((globalThis.fetch as any).mock.calls[0][1] as RequestInit).body as string);
    expect(body.audience).toBe("client");
    const url = replace.mock.calls.at(-1)![0] as string;
    expect(url).toContain("for=client");
    expect(url).toContain("redirect=%2Foauth%2Fauthorize");
  });

  it("offers the same account types on every page, Client included", () => {
    const { unmount } = render(<CommunityMembershipForm source="login" />);
    const onLogin = [...(screen.getByLabelText(/signing up as/i) as HTMLSelectElement).options].map((o) => o.value);
    unmount();
    render(<CommunityMembershipForm />);
    const onMembership = [...(screen.getByLabelText(/signing up as/i) as HTMLSelectElement).options].map((o) => o.value);
    expect(onLogin).toEqual(onMembership);
    expect(onLogin).toContain("client");
  });

  it("pre-chooses the membership page's default where the page shows it", () => {
    render(<CommunityMembershipForm />);
    expect((screen.getByLabelText(/signing up as/i) as HTMLSelectElement).value).toBe("barber");
  });
});

