import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin-allowlist";
import {
  VIEW_AS_COOKIE,
  VIEW_AS_MAX_AGE,
  effectiveAccountMenu,
  getViewAsContext,
  listViewAsMembers,
} from "@/lib/account/view-as";

/**
 * Start / stop / inspect View As. See lib/account/view-as.ts for what the
 * feature is and the three properties that make it safe.
 *
 * Every method re-derives admin status from the real Supabase session here as
 * well, even though middleware.ts already gates this path — the middleware
 * check is a convenience (it returns clean 401s), not the security boundary. A
 * route that grants visibility into other members' accounts should not depend
 * on a matcher pattern staying correct.
 */

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated.", status: 401 } as const;
  if (!isAdminEmail(user.email)) {
    // Deliberately the same shape a non-admin gets anywhere else — no hint that
    // this endpoint does anything interesting.
    return { error: "Unauthorized.", status: 403 } as const;
  }
  return { user } as const;
}

/** Current state plus, for the picker, the members available to view as. */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) {
    // Non-admins get a well-formed "nothing to see here" rather than an error:
    // the navbar calls this on every page load for every logged-in user, and a
    // 403 in the console on ordinary member pages is noise, not a signal.
    return NextResponse.json({ success: true, isAdmin: false, viewingAs: null, members: [] });
  }

  const ctx = await getViewAsContext();
  const members = await listViewAsMembers();

  return NextResponse.json({
    success: true,
    isAdmin: true,
    realEmail: ctx.realEmail,
    viewingAs: ctx.viewingAs,
    // The menu that member sees, so the navbar can render theirs instead of the
    // admin's while View As is active.
    effectiveAccount: ctx.viewingAs ? await effectiveAccountMenu(ctx.viewingAs) : null,
    members,
  });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ success: false, error: gate.error }, { status: gate.status });
  }

  const body = await req.json().catch(() => ({}));
  const memberId = typeof body?.memberId === "string" ? body.memberId.trim() : "";
  if (!memberId) {
    return NextResponse.json({ success: false, error: "memberId is required." }, { status: 400 });
  }

  // Confirm the member exists before writing a cookie for them, so a typo'd id
  // can't leave the admin in a half-state where every page thinks it's
  // impersonating a member that doesn't resolve.
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("community_members")
    .select("id, user_id, first_name, last_name, email")
    .eq("id", memberId)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ success: false, error: "No such community member." }, { status: 404 });
  }

  console.log("[view-as] start", { admin: gate.user.email, memberId, memberEmail: (member as any).email });

  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: VIEW_AS_COOKIE,
    value: memberId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VIEW_AS_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  // Intentionally not admin-gated: clearing the cookie only ever *reduces*
  // access, and someone holding a stale cookie should always be able to get rid
  // of it.
  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: VIEW_AS_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
