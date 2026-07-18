import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Deliberately much simpler than /api/barber/register — community members
// get a search-visible directory profile, not a business dashboard, so
// there's no client/project/entitlement provisioning here at all.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, phone, password } = body;

    if (!firstName || !lastName || !email || !phone || !password) {
      return NextResponse.json(
        { success: false, error: "All fields are required." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: `${firstName} ${lastName}`,
        role: "community_member",
      },
    });

    if (authError) {
      console.error("[CommunityRegister] Identity Provisioning Error:", authError);
      throw authError;
    }

    const authUser = authData.user;
    if (!authUser) throw new Error("Failed to create user identity");

    const { error: memberError } = await (adminSupabase
      .from("community_members") as any)
      .insert({
        user_id: authUser.id,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
      });

    if (memberError) {
      console.error("[CommunityRegister] Member Profile Error:", memberError);
      // Roll back the auth user rather than leave an orphaned login with no
      // directory profile — a retry would otherwise collide on the unique
      // email/user_id constraints without ever succeeding.
      await adminSupabase.auth.admin.deleteUser(authUser.id);
      throw memberError;
    }

    return NextResponse.json({
      success: true,
      redirect: "/tools/barbershop-search?welcome=1",
    });
  } catch (error: any) {
    console.error("[CommunityRegister] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create membership." },
      { status: 500 }
    );
  }
}
