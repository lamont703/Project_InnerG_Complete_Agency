import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForLongLivedToken, IG_GRAPH, IG_SCOPES } from "@/lib/instagram-oauth";
import { canConnectInstagram, memberEmail, storeMemberInstagram } from "@/lib/instagram-member";

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

  // A MEMBER connecting their own account (api/instagram/member/connect) shares
  // this callback URL, because Meta matches redirect URIs exactly and this one
  // is registered. Its own state cookie decides the branch, before anything
  // here can touch the platform's single-row instagram_connection.
  const jar0 = await cookies();
  const memberCookie = jar0.get("ig_member_oauth_state")?.value;
  // Matched on the state value, not mere presence: a member flow abandoned a
  // few minutes ago must not capture an admin reconnecting @shearquery.
  if (memberCookie && state && memberCookie.split(".")[0] === state) {
    return finishMemberConnect({ url, code, state, denied, memberCookie });
  }

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

/**
 * The member branch. Writes ONLY member_instagram_connections, keyed by the
 * member id that was stored with the state when the flow started.
 */
async function finishMemberConnect(args: {
  url: URL;
  code: string | null;
  state: string | null;
  denied: string | null;
  memberCookie: string;
}) {
  const { url, code, state, denied, memberCookie } = args;
  const back = (reason: string, extra = "") => NextResponse.redirect(`${url.origin}/account/instagram?ig=${reason}${extra}`);

  const jar = await cookies();
  jar.delete("ig_member_oauth_state");
  if (denied) return back("denied");
  if (!code) return back("missing_code");

  const [expectedState, memberId] = memberCookie.split(".");
  if (!expectedState || !memberId || expectedState !== state) return back("bad_state");

  // The allowlist is checked again here, not only when the flow started.
  if (!canConnectInstagram(await memberEmail(memberId))) return back("not_available");

  const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID;
  const clientSecret = process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET;
  if (!clientId || !clientSecret) return back("missing_credentials");
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || `${url.origin}/api/instagram/callback`;

  const result = await exchangeCodeForLongLivedToken({ code, clientId, clientSecret, redirectUri });
  if (!result.ok || !result.accessToken) {
    console.error("[instagram/member] token exchange failed:", result.error);
    return back("exchange_failed");
  }

  let username: string | null = null;
  let accountType: string | null = null;
  let igUserId: string | null = result.userId || null;
  try {
    const me = await fetch(`${IG_GRAPH}/me?fields=id,username,account_type&access_token=${result.accessToken}`, {
      signal: AbortSignal.timeout(10000),
    });
    const body: any = await me.json().catch(() => ({}));
    if (body?.id) {
      igUserId = String(body.id);
      username = body.username || null;
      accountType = body.account_type || null;
    }
  } catch { /* identity is nice to have */ }

  try {
    await storeMemberInstagram({ memberId, accessToken: result.accessToken, expiresAt: result.expiresAt ?? null, igUserId, username, accountType });
  } catch (e: any) {
    console.error("[instagram/member] could not store token:", e?.message);
    return back("store_failed");
  }
  return back("connected", username ? `&as=${encodeURIComponent(username)}` : "");
}
