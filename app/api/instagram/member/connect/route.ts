import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { instagramAuthUrl } from "@/lib/instagram-oauth";
import { createServerClient } from "@/lib/supabase/server";
import { resolveMemberContext } from "@/lib/account/view-as";
import { MEMBER_IG_SCOPES } from "@/lib/instagram-member";
import { hasInstagramAccess } from "@/lib/feature-access";

/**
 * Start connecting a MEMBER'S Instagram — their own account, for their Claude
 * to read. Not /api/instagram/connect, which connects ShearQuery's own account.
 *
 * SHARES THE CALLBACK URL with the platform flow on purpose. Meta matches
 * redirect URIs exactly against the dashboard list, and the platform callback
 * is already registered there; a second path would mean a dashboard change
 * before anyone could test. The callback tells the two flows apart by which
 * state cookie it finds — this one sets ig_member_oauth_state — and the member
 * branch can only ever write member_instagram_connections.
 *
 * Allowlisted while Meta's Advanced Access is pending (lib/instagram-member.ts).
 */

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?redirect=${encodeURIComponent("/account/instagram")}`);
  if (!(await hasInstagramAccess(user.email))) {
    return NextResponse.redirect(`${origin}/account/instagram?ig=not_available`);
  }

  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.redirect(`${origin}/account/instagram?ig=no_member`);
  // Connecting someone else's Instagram while viewing as them would attach an
  // account they never chose.
  if (ctx.impersonating) return NextResponse.redirect(`${origin}/account/instagram?ig=view_as`);

  const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID;
  if (!clientId) return NextResponse.json({ error: "NEXT_PUBLIC_INSTAGRAM_APP_ID is not set." }, { status: 500 });
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || `${origin}/api/instagram/callback`;

  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  // The member id rides with the state, so the callback writes to the member
  // who STARTED the flow — not whoever's session happens to be present later.
  jar.set("ig_member_oauth_state", `${state}.${ctx.memberId}`, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/",
  });
  return NextResponse.redirect(instagramAuthUrl(clientId, redirectUri, state, MEMBER_IG_SCOPES));
}
