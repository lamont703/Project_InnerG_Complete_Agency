import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimTypeConfig, entityPath } from "@/lib/entity-claim";
import { upsertGhlContact, memberTags, isTestContact } from "@/lib/ghl-contacts";
import { sendGhlEmail } from "@/lib/ghl-email";
import { buildCommunityWelcomeEmail } from "@/lib/community-welcome-email";
import { storedAudience } from "@/lib/audiences";

// Deliberately much simpler than /api/barber/register — community members
// get a search-visible directory profile, not a business dashboard, so
// there's no client/project/entitlement provisioning here at all.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, phone, password, claimEntityType, claimEntityId } = body;

    // Which audience they signed up as. Validated against the registry rather
    // than trusted — it arrives from a query string via the form — and stored
    // as NULL when absent, which honestly records "we never asked" rather than
    // guessing them into a lifecycle sequence written for somebody else.
    const memberAudience = storedAudience(body.audience);

    /*
     * WHICH SURFACE PRODUCED THIS SIGNUP. Every entry point links to the same
     * /membership URL, so seven members exist and not one can be attributed —
     * which makes "is AI Mode a funnel?" unanswerable rather than answered.
     *
     * Sanitised, not validated against a list: the entry points are still being
     * added, and rejecting an unknown value would turn shipping a new CTA into
     * a broken signup. Length-capped and stripped to a slug so it cannot carry
     * anything but a label.
     */
    const signupSource = typeof body.signupSource === "string"
      ? body.signupSource.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) || null
      : null;

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
        audience: memberAudience,
        signup_source: signupSource,
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
    let claimedName: string | null = null;
    let ghlContactId: string | undefined;
    if (claimEntityType && claimEntityId) {
      // Validate against the canonical list rather than trusting the client —
      // these values come straight off a query string.
      const config = claimTypeConfig(String(claimEntityType));
      if (!config) {
        console.warn(`[CommunityRegister] Unknown claim entity type: ${claimEntityType}`);
      } else {
        // Confirm the entity actually exists before linking a member to it.
        // nameCol comes along so the welcome email can name what they claimed
        // rather than saying "your listing".
        const { data: entity } = await (adminSupabase as any)
          .from(config.table)
          .select(`id, slug, ${config.nameCol}`)
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
              claimedName = entity[config.nameCol] || null;
              // shop/salon also carry a claimed_at column that the rest of the
              // app reads; keep it in sync (see CLAIMED_AT_TYPES).
              if (config.key === "shop" || config.key === "salon") {
                await (adminSupabase as any)
                  .from(config.table)
                  .update({ claimed_at: new Date().toISOString() })
                  .eq("id", claimEntityId);
              }
              if (entity.slug) {
                const path = entityPath(config.key, entity.slug);
                if (path) {
                  claimRedirect = `${path}?claimed=1`;
                  // Entity pages are cached and regenerated hourly, so a fresh
                  // claim would otherwise show no badge for up to an hour —
                  // on the one page the new member is about to be sent to.
                  // Rebuild it now instead of waiting out the window.
                  try {
                    revalidatePath(path);
                  } catch (e: any) {
                    console.warn("[CommunityRegister] revalidate failed:", e?.message);
                  }
                }
              }
            }
          }
        }
      }
    }

    // Push the member into GoHighLevel.
    //
    // Runs last, after the claim is resolved, so the contact carries the right
    // tags on its first write rather than needing a second pass. Awaited rather
    // than fired and forgotten: this route runs serverless, and work left
    // in flight when the response returns may simply be killed.
    //
    // A CRM failure must never cost someone their membership — the rows that
    // matter are already committed — so this only ever logs. Contacts missed
    // here are picked up by scripts/sync_members_to_ghl.js, which treats a null
    // contact_id as its work queue.
    try {
      const ghl = await upsertGhlContact({
        firstName,
        lastName,
        email,
        phone,
        source: "Community Signup",
        tags: memberTags({ claimedEntityType: claimEntityType, claimLinked, audience: memberAudience }),
      });

      if (ghl.ok && ghl.contactId) {
        await (adminSupabase.from("community_members") as any)
          .update({ contact_id: ghl.contactId, contact_synced_at: new Date().toISOString() })
          .eq("user_id", authUser.id);
        if (!ghl.tagged) {
          console.warn(`[CommunityRegister] GHL contact ${ghl.contactId} saved without tags`);
        }
      } else if (!ghl.skipped) {
        console.error("[CommunityRegister] GHL sync failed:", ghl.error);
      }
      ghlContactId = ghl.contactId;
    } catch (ghlError: any) {
      console.error("[CommunityRegister] GHL sync threw:", ghlError?.message);
    }

    // The welcome email.
    //
    // Signup used to end in a toast on a page people navigate away from, so a
    // member left with nothing in their inbox and no route back. Sent from here
    // rather than a CRM workflow because it confirms an account someone just
    // created — that has to fire on the actual event.
    //
    // Skipped for test accounts, which reach this route like anyone else.
    // Recorded either way: a row with no welcome_email_sent_at is a member who
    // signed up and heard nothing.
    if (!isTestContact({ email, phone })) {
      try {
        const { subject, html } = buildCommunityWelcomeEmail({
          firstName,
          claimedEntityName: claimLinked ? claimedName : null,
          claimedEntityUrl: claimRedirect,
          audience: memberAudience,
        });
        const sent = await sendGhlEmail({
          email,
          subject,
          html,
          name: `${firstName} ${lastName}`,
          contactId: ghlContactId,
        });
        await (adminSupabase.from("community_members") as any)
          .update(
            sent.ok
              ? { welcome_email_sent_at: new Date().toISOString(), welcome_email_error: null }
              : { welcome_email_error: sent.error || "unknown" }
          )
          .eq("user_id", authUser.id);
        if (!sent.ok) console.error("[CommunityRegister] Welcome email failed:", sent.error);
      } catch (mailError: any) {
        console.error("[CommunityRegister] Welcome email threw:", mailError?.message);
      }
    }

    return NextResponse.json({
      success: true,
      claimLinked,
      // Send a claimer back to the profile they just claimed so they see the
      // badge immediately, rather than dumping them in generic search.
      //
      // A student goes to the journey setup instead. Search is the right
      // landing for someone whose next move is looking something up; a student
      // who just signed up has an account that has changed nothing yet, and
      // the minute it takes to say state/licence/exam date is what turns it
      // on. Claim still wins if somehow both are present.
      redirect:
        claimRedirect ||
        (memberAudience === "student"
          ? "/account/journey?welcome=1"
          : "/tools/barbershop-search?welcome=1"),
    });
  } catch (error: any) {
    console.error("[CommunityRegister] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create membership." },
      { status: 500 }
    );
  }
}
