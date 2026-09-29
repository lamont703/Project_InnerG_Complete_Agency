import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviteByToken, creditReferral, INVITE_COOKIE } from "@/lib/agency-partners";

/**
 * The link in an agency's email invite.
 *
 * Signed in already: credit the agency now if nobody has this client yet, and
 * go to the account. Not signed in: remember the invite and go to signup,
 * where the register route credits it the moment the account exists.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const origin = new URL(req.url).origin;
  const invite = await inviteByToken(token);
  if (!invite) return NextResponse.redirect(`${origin}/membership`);

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: member } = await (createAdminClient().from("community_members") as any).select("id").eq("user_id", user.id).maybeSingle();
    if (member) {
      if (await creditReferral({ clientMemberId: member.id, agencyMemberId: invite.agency_member_id, source: "invite" })) {
        await (createAdminClient().from("agency_invites") as any)
          .update({ accepted_at: new Date().toISOString(), accepted_member_id: member.id })
          .eq("id", invite.id);
      }
      return NextResponse.redirect(`${origin}/account/manage-listing?agency_invite=1`);
    }
  }

  const res = NextResponse.redirect(`${origin}/membership?invited=1`);
  res.cookies.set(INVITE_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 30 * 86400, path: "/" });
  return res;
}
