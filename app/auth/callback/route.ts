import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";

/**
 * Where a magic link lands. This is where an account actually becomes real.
 *
 * THE ORDER MATTERS AND IT IS THE WHOLE POINT. Nothing about a person's
 * conversions is joined, stamped or revealed until AFTER
 * exchangeCodeForSession succeeds — because clicking the link is the only
 * evidence that whoever asked controls that mailbox. A single typo'd character
 * in a booking form would otherwise hand a stranger someone else's name, phone
 * number and appointment. The invite row is a claim; this is the proof.
 *
 * WHAT HAPPENS ON A FIRST ARRIVAL:
 *   1. exchange the code for a session       (proves the mailbox)
 *   2. create the community_members row      (they are now a member)
 *   3. stamp audience from the invite        (inferred from what they DID)
 *   4. mark the invite claimed               (so it is stamped once)
 *
 * NOTHING IS BACK-FILLED INTO OTHER TABLES. The member's verified email IS the
 * join key — /account/my-requests reads booking_requests by it at request time.
 * That avoids four migrations adding a nullable member id to four tables, and
 * it cannot go stale. The trade is that changing your account email detaches
 * your history; at seven members that is the right way round, and the day it
 * isn't, a backfill is one query.
 */

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/account/my-requests";

  // Only ever an internal path. An open redirect on an auth callback is how a
  // session gets handed to somebody else's site.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/account/my-requests";

  if (!code) {
    return NextResponse.redirect(`${SITE_URL}/login?error=missing_code`);
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // Expired or already-used links land here. Neither is worth an error page.
    return NextResponse.redirect(`${SITE_URL}/login?error=link_expired`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.redirect(`${SITE_URL}/login?error=no_session`);
  }

  const admin = createAdminClient();

  try {
    // Already a member? Then this was just a sign-in. Nothing to create.
    const { data: existing } = await (admin.from("community_members") as any)
      .select("id, audience")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: invite } = await (admin.from("account_conversion_invites") as any)
      .select("id, source, audience")
      .ilike("email", user.email)
      .is("claimed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let memberId = existing?.id as string | undefined;

    if (!memberId) {
      const { data: created } = await (admin.from("community_members") as any)
        .insert({
          user_id: user.id,
          email: user.email,
          // Name comes from the conversion later if we have one; an empty
          // string here would be worse than null for anything that renders it.
          first_name: null,
          last_name: null,
          audience: invite?.audience ?? null,
        })
        .select("id")
        .maybeSingle();
      memberId = created?.id;
    } else if (!existing.audience && invite?.audience) {
      // An existing member with no audience gets one from what they just did.
      // Never OVERWRITES an audience already set — a stated identity beats an
      // inferred one, and this is the inference.
      await (admin.from("community_members") as any)
        .update({ audience: invite.audience })
        .eq("id", memberId);
    }

    /*
     * Normalise the role as well as creating the member. Belt and braces: the
     * metadata above fixes new sign-ups, and this fixes anyone provisioned
     * before that fix — they exist, and they would otherwise stay labelled
     * client_viewer forever. Only ever narrows toward community_member, and
     * never touches an admin or developer account.
     */
    await (admin.from("users") as any)
      .update({ role: "community_member" })
      .eq("id", user.id)
      .eq("role", "client_viewer");

    if (invite?.id) {
      await (admin.from("account_conversion_invites") as any)
        .update({ claimed_at: new Date().toISOString(), claimed_by: memberId ?? null })
        .eq("id", invite.id);
    }
  } catch (err: any) {
    // The session is already valid at this point. Failing to create the member
    // row must not strand them on an error page — they are signed in, and the
    // landing page handles a missing member row on its own.
    console.error("[auth/callback] member provisioning failed:", err?.message);
  }

  return NextResponse.redirect(`${SITE_URL}${safeNext}`);
}
