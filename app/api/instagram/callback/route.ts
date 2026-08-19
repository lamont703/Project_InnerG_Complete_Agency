import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForLongLivedToken, IG_GRAPH, IG_SCOPES } from "@/lib/instagram-oauth";

/**
 * Finish the authorisation and store a LONG-lived token.
 *
 * Writes to instagram_connection rather than an env var, which is the whole
 * point: the previous token lived in INSTAGRAM_ACCESS_TOKEN where no job could
 * refresh it, and it died quietly after 60 days.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const denied = url.searchParams.get("error");

  if (denied) {
    return NextResponse.redirect(`${url.origin}/admin/connectors?ig=denied`);
  }
  if (!code) {
    return NextResponse.redirect(`${url.origin}/admin/connectors?ig=missing_code`);
  }

  // The state cookie is the only thing proving this code came from the flow we
  // started, so a mismatch is refused rather than shrugged at.
  const jar = await cookies();
  const expected = jar.get("ig_oauth_state")?.value;
  if (!expected || expected !== state) {
    return NextResponse.redirect(`${url.origin}/admin/connectors?ig=bad_state`);
  }
  jar.delete("ig_oauth_state");

  const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID;
  const clientSecret = process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${url.origin}/admin/connectors?ig=missing_credentials`);
  }
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || `${url.origin}/api/instagram/callback`;

  const result = await exchangeCodeForLongLivedToken({ code, clientId, clientSecret, redirectUri });
  if (!result.ok || !result.accessToken) {
    console.error("[instagram] token exchange failed:", result.error);
    return NextResponse.redirect(`${url.origin}/admin/connectors?ig=exchange_failed`);
  }

  // Identify the account so the admin page can show which one is connected —
  // "connected" without a username is how you end up authorising a personal
  // account and not noticing.
  let username: string | null = null;
  let accountType: string | null = null;
  let igUserId: string | null = result.userId || null;
  try {
    const me = await fetch(
      `${IG_GRAPH}/me?fields=id,username,account_type&access_token=${result.accessToken}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const body: any = await me.json().catch(() => ({}));
    if (body?.id) {
      igUserId = String(body.id);
      username = body.username || null;
      accountType = body.account_type || null;
    }
  } catch { /* identity is nice to have, not worth failing the connect over */ }

  const admin = createAdminClient();
  const { error } = await (admin.from("instagram_connection") as any).upsert(
    {
      id: 1,
      token_type: "instagram_login",
      access_token: result.accessToken,
      expires_at: result.expiresAt,
      ig_user_id: igUserId,
      username,
      account_type: accountType,
      scopes: IG_SCOPES,
      last_refreshed_at: new Date().toISOString(),
      last_refresh_error: null,
      status: "connected",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("[instagram] could not store token:", error.message);
    return NextResponse.redirect(`${url.origin}/admin/connectors?ig=store_failed`);
  }

  return NextResponse.redirect(
    `${url.origin}/admin/connectors?ig=connected${username ? `&as=${encodeURIComponent(username)}` : ""}`
  );
}
