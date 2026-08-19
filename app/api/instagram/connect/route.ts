import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { instagramAuthUrl } from "@/lib/instagram-oauth";
import { isAdminEmail } from "@/lib/admin-allowlist";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Start the Instagram authorisation. Admin only.
 *
 * This connects SHEARQUERY'S OWN account, not a member's — one token, used by
 * everything the platform posts. So it is gated on an admin session rather than
 * any signed-in user: a member walking through this flow would overwrite the
 * platform's credentials with their personal Instagram.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID;
  if (!clientId) return NextResponse.json({ error: "NEXT_PUBLIC_INSTAGRAM_APP_ID is not set." }, { status: 500 });

  const origin = new URL(req.url).origin;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || `${origin}/api/instagram/callback`;

  // CSRF: a random state echoed back by Instagram and compared on return, so a
  // code delivered by anyone other than the flow we started is rejected.
  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set("ig_oauth_state", state, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/",
  });

  return NextResponse.redirect(instagramAuthUrl(clientId, redirectUri, state));
}
