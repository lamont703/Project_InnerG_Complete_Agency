import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gbpExchangeCode, gbpFetchLocations, emailFromIdToken, matchLocationToEntity } from "@/lib/google-business";

// OAuth callback: verifies the state nonce, exchanges the code for tokens,
// fetches the account's GBP locations, and stores the connection for the
// signed-in member. If exactly one location, it's auto-selected; multiple →
// status "needs_selection" for a follow-up pick step. Entity matching + the
// enrichment sync run in a later phase.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const host = req.headers.get("host") || "agency.innergcomplete.com";
  const origin = `${host.includes("localhost") ? "http" : "https"}://${host}`;
  const back = (q: string) => NextResponse.redirect(`${origin}/account/manage-listing?${q}`);

  if (url.searchParams.get("error")) return back("gbp=denied");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.headers.get("cookie")?.match(/gbp_oauth_state=([a-f0-9]+)/)?.[1];
  if (!code || !state || !cookieState || state !== cookieState) return back("gbp=error");

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?redirect=/account/manage-listing`);

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("community_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return back("gbp=nomember");

  try {
    const tokens = await gbpExchangeCode(origin, code);
    const accessToken = tokens.access_token;
    if (!accessToken) return back("gbp=error");

    let locations: any[] = [];
    try {
      locations = await gbpFetchLocations(accessToken);
    } catch (e: any) {
      // Token is valid but the GBP API may not be granted/approved yet — still
      // record the connection so the owner isn't stuck re-authing.
      console.warn("[gbp callback] location fetch failed:", e?.message);
    }
    const single = locations.length === 1 ? locations[0] : null;

    // "Connect = claim": if there's a single location and it matches a directory
    // entity by place_id, auto-link the member to it — unless that entity is
    // already claimed by someone else (don't hijack a claim).
    let entityType: string | null = null;
    let entityId: string | null = null;
    let status = locations.length > 1 ? "needs_selection" : "connected";
    if (single?.placeId) {
      const match = await matchLocationToEntity(admin, single.placeId);
      if (match) {
        const { data: existing } = await (admin.from("community_member_entity_links") as any)
          .select("community_member_id")
          .eq("entity_type", match.entityType)
          .eq("entity_id", match.entityId)
          .maybeSingle();
        if (!existing || existing.community_member_id === (member as any).id) {
          await (admin.from("community_member_entity_links") as any).upsert(
            { community_member_id: (member as any).id, entity_type: match.entityType, entity_id: match.entityId },
            { onConflict: "community_member_id" }
          );
          entityType = match.entityType;
          entityId = match.entityId;
          status = "linked";
        } else {
          status = "needs_review"; // owns the GBP location but the entity is claimed by another member
        }
      }
    }

    const { error: upErr } = await (admin.from("gbp_connections") as any).upsert(
      {
        community_member_id: (member as any).id,
        google_account_email: emailFromIdToken((tokens as any).id_token),
        access_token: accessToken,
        refresh_token: tokens.refresh_token || null,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        scope: tokens.scope || null,
        locations,
        selected_location: single?.name || null,
        place_id: single?.placeId || null,
        entity_type: entityType,
        entity_id: entityId,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "community_member_id" }
    );
    if (upErr) {
      console.error("[gbp callback] save failed:", upErr.message);
      return back("gbp=error");
    }

    const res = back(`gbp=connected&locations=${locations.length}`);
    res.cookies.set("gbp_oauth_state", "", { maxAge: 0, path: "/" });
    return res;
  } catch (e: any) {
    console.error("[gbp callback]", e?.message);
    return back("gbp=error");
  }
}
