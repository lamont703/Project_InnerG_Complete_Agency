import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { instagramAuthUrl, IG_SCOPES } from "@/lib/instagram-oauth";
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

  /*
   * ?debug=1 — SAY WHAT WE ARE ABOUT TO SEND INSTEAD OF SENDING IT.
   *
   * "Invalid redirect_uri" is Instagram refusing a string it does not
   * recognise, and it never tells you which string it received. That leaves
   * three candidates to guess between: the origin the request arrived on (which
   * differs between shearquery.com and www.shearquery.com, and Meta matches
   * EXACTLY, so those are two separate whitelist entries), a stale
   * INSTAGRAM_REDIRECT_URI left over from the agency.innergcomplete.com domain,
   * and whatever the dashboard actually holds.
   *
   * Guessing costs a round trip through a login screen each time. This returns
   * the exact string to paste into the dashboard, and says whether it came from
   * the env var or was derived from the origin — which is the part that decides
   * whether the fix is in Vercel or in Meta.
   *
   * Admin-gated by the check above, and it deliberately sets no state cookie:
   * it starts nothing, so there is no flow for a leaked URL to hijack.
   */
  if (new URL(req.url).searchParams.get("debug") === "1") {
    return NextResponse.json({
      redirectUri,
      source: process.env.INSTAGRAM_REDIRECT_URI ? "INSTAGRAM_REDIRECT_URI env var" : "derived from request origin",
      origin,
      clientId,
      scopes: IG_SCOPES,
      note: "This exact redirectUri must appear in Meta → Instagram → Business login settings → Valid OAuth Redirect URIs. Match is exact, including scheme, www and trailing slash.",
    });
  }

  // CSRF: a random state echoed back by Instagram and compared on return, so a
  // code delivered by anyone other than the flow we started is rejected.
  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set("ig_oauth_state", state, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/",
  });

  return NextResponse.redirect(instagramAuthUrl(clientId, redirectUri, state));
}
