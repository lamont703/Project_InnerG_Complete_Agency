import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimTypeConfig } from "@/lib/entity-claim";

// Deliberately much simpler than /api/barber/register — community members
// get a search-visible directory profile, not a business dashboard, so
// there's no client/project/entitlement provisioning here at all.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, phone, password, claimEntityType, claimEntityId } = body;

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

    // If they arrived from a "Claim your profile" CTA, link the entity now.
    // isEntityClaimed() reads community_member_entity_links, so writing this
    // row is what actually turns on the green "Claimed" badge. Without it the
    // claim CTA was a dead end — sign up, get nothing, badge never appears.
    let claimLinked = false;
    let claimRedirect: string | null = null;
    if (claimEntityType && claimEntityId) {
      // Validate against the canonical list rather than trusting the client —
      // these values come straight off a query string.
      const config = claimTypeConfig(String(claimEntityType));
      if (!config) {
        console.warn(`[CommunityRegister] Unknown claim entity type: ${claimEntityType}`);
      } else {
        // Confirm the entity actually exists before linking a member to it.
        const { data: entity } = await (adminSupabase as any)
          .from(config.table)
          .select("id, slug")
          .eq("id", claimEntityId)
          .maybeSingle();

        if (!entity) {
          console.warn(`[CommunityRegister] Claim target not found: ${claimEntityType}/${claimEntityId}`);
        } else {
          // Look up the member row we just created to get its own id.
          const { data: member } = await (adminSupabase as any)
            .from("community_members")
            .select("id")
            .eq("user_id", authUser.id)
            .maybeSingle();

          if (member) {
            const { error: linkError } = await (adminSupabase as any)
              .from("community_member_entity_links")
              .insert({
                community_member_id: member.id,
                entity_type: config.key,
                entity_id: claimEntityId,
              });

            if (linkError) {
              // A failed link must not fail the signup — they still have a
              // valid membership, and an admin can link them via
              // /admin/community-entity-links.
              console.error("[CommunityRegister] Entity link failed:", linkError);
            } else {
              claimLinked = true;
              // shop/salon also carry a claimed_at column that the rest of the
              // app reads; keep it in sync (see CLAIMED_AT_TYPES).
              if (config.key === "shop" || config.key === "salon") {
                await (adminSupabase as any)
                  .from(config.table)
                  .update({ claimed_at: new Date().toISOString() })
                  .eq("id", claimEntityId);
              }
              if (entity.slug) {
                const routes: Record<string, string> = {
                  shop: "/shop", salon: "/salons", barber: "/barbers",
                  cosmetologist: "/cosmetologists", barber_school: "/schools",
                  cosmetology_school: "/schools", barber_supply_store: "/stores",
                  beauty_supply_store: "/stores", event: "/events",
                };
                const base = routes[config.key];
                if (base) claimRedirect = `${base}/${entity.slug}?claimed=1`;
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      claimLinked,
      // Send a claimer back to the profile they just claimed so they see the
      // badge immediately, rather than dumping them in generic search.
      redirect: claimRedirect || "/tools/barbershop-search?welcome=1",
    });
  } catch (error: any) {
    console.error("[CommunityRegister] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create membership." },
      { status: 500 }
    );
  }
}
