import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tagCommunityMember, TAG_GOOGLE_CONNECTED } from "@/lib/ghl-contacts";
import {
  gbpExchangeCode,
  gbpFetchLocations,
  identityFromIdToken,
  matchLocationToEntity,
  claimEntityForMember,
  stageGbpLocation,
  type GbpLocationOutcome,
} from "@/lib/google-business";
import { SITE_HOST } from "@/lib/site";

// OAuth callback: verifies the state nonce, exchanges the code for tokens,
// fetches the account's GBP locations, and stores the connection for the
// signed-in member. If exactly one location, it's auto-selected; multiple →
// status "needs_selection" for a follow-up pick step.
//
// Every location is then routed one of three ways:
//   • matches a directory entity by place_id → claim it (Door 1)
//   • matches nothing                        → stage it as a new business
//                                              candidate (Door 2)
//   • isn't a beauty business / has no storefront address → skipped, with the
//     reason recorded so the owner isn't left guessing
// Matching runs for EVERY location, not just the single-location case, because
// staging one that already exists in the directory would create a duplicate.
// Linking still only happens when there's exactly one location — a member can
// hold only one entity link (the table's unique constraint), so picking on
// their behalf out of several would be a guess.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const host = req.headers.get("host") || SITE_HOST;
  const origin = `${host.includes("localhost") ? "http" : "https"}://${host}`;
  const back = (q: string) => NextResponse.redirect(`${origin}/account/manage-listing?${q}`);

  if (url.searchParams.get("error")) return back("gbp=denied");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookies = req.headers.get("cookie") || "";
  const cookieState = cookies.match(/gbp_oauth_state=([a-f0-9]+)/)?.[1];
  // PKCE verifier from the same redirect that set the state cookie. Without it
  // Google rejects the exchange, which is the point: an intercepted code is
  // useless to anyone who doesn't hold this value.
  const codeVerifier = cookies.match(/gbp_oauth_verifier=([A-Za-z0-9_-]+)/)?.[1];
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
    const tokens = await gbpExchangeCode(origin, code, codeVerifier);
    const accessToken = tokens.access_token;
    // `sub` is what Cross-Account Protection events are keyed on — capture it
    // now or a later revocation has nothing to match against.
    const identity = identityFromIdToken((tokens as any).id_token);
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

    let entityType: string | null = null;
    let entityId: string | null = null;
    let status = locations.length > 1 ? "needs_selection" : "connected";
    const outcomes: GbpLocationOutcome[] = [];

    for (const loc of locations) {
      const match = loc.placeId ? await matchLocationToEntity(admin, loc.placeId) : null;

      // Door 2 — nothing in the directory for this location, so create it.
      if (!match) {
        outcomes.push(await stageGbpLocation(admin, (member as any).id, loc));
        continue;
      }

      // Already in the directory. "Connect = claim" applies only when this is
      // the owner's single location; otherwise we record the match and leave
      // the choice to the selection step.
      if (loc !== single) {
        outcomes.push({ location: loc.name, title: loc.title, outcome: "linked", detail: "already in the directory", entityType: match.entityType });
        continue;
      }

      const claim = await claimEntityForMember(admin, (member as any).id, match);
      if (claim === "linked") {
        entityType = match.entityType;
        entityId = match.entityId;
        status = "linked";
      } else {
        // Owns the GBP location but the entity is claimed by another member.
        status = "needs_review";
      }
      outcomes.push({ location: loc.name, title: loc.title, outcome: claim, entityType: match.entityType });
    }

    const staged = outcomes.filter((o) => o.outcome === "staged").length;
    // A member whose only locations were all newly staged has no claim yet, but
    // they're not stuck either — say so rather than leaving the generic
    // "connected", which reads as if nothing happened.
    if (status === "connected" && staged > 0) status = "pending_review";

    // Per-location outcome rides along inside the stored locations jsonb (no
    // schema change), so the connect card and the admin hub can both explain
    // what happened to each one.
    const locationsWithOutcome = locations.map((l) => ({
      ...l,
      outcome: outcomes.find((o) => o.location === l.name) || null,
    }));

    // NEVER write a null refresh token over a stored one.
    //
    // Google does not guarantee a refresh_token on re-consent. `prompt=consent`
    // makes it very likely, not certain — and this is an upsert keyed on
    // community_member_id, so `tokens.refresh_token || null` would replace a
    // working token with null the one time Google omits it. The row would still
    // read status "linked" while every downstream route, all of which check
    // `if (!conn?.refresh_token)`, reports "No Google Business Profile is
    // connected". A reconnect that silently destroys the connection is the
    // worst possible failure here because the obvious remedy — reconnect again
    // — is what caused it.
    //
    // Omitting the key entirely leaves the stored value untouched on update.
    const tokenFields: Record<string, unknown> = {};
    if (tokens.refresh_token) {
      tokenFields.refresh_token = tokens.refresh_token;
    } else {
      console.warn(
        "[gbp callback] Google returned no refresh_token; keeping the stored one for member",
        (member as any).id
      );
    }

    const { error: upErr } = await (admin.from("gbp_connections") as any).upsert(
      {
        community_member_id: (member as any).id,
        google_account_email: identity.email,
        google_user_id: identity.sub,
        access_token: accessToken,
        ...tokenFields,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        scope: tokens.scope || null,
        locations: locationsWithOutcome,
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

    // Record the connection in the CRM. This is the tag that takes a member
    // OUT of the onboarding sequence — they're now on the weekly monitoring
    // email, and being asked to connect Google after doing so reads as though
    // nobody was paying attention. Non-fatal.
    const tagged = await tagCommunityMember((member as any).id, [TAG_GOOGLE_CONNECTED]);
    if (!tagged.ok && !tagged.skipped) {
      console.warn("[gbp callback] tagging failed:", tagged.error);
    }

    // The payoff moment. A single-location owner connected in order to see their
    // audit, so send them to it rather than to a listing-management screen they
    // then have to navigate out of. More than one location still goes to
    // manage-listing, because the audit needs to know which one to run against.
    const res =
      locations.length === 1
        ? NextResponse.redirect(`${origin}/account/gbp-audit?gbp=connected`)
        : back(`gbp=connected&locations=${locations.length}&staged=${staged}`);
    res.cookies.set("gbp_oauth_state", "", { maxAge: 0, path: "/" });
    res.cookies.set("gbp_oauth_verifier", "", { maxAge: 0, path: "/" });
    return res;
  } catch (e: any) {
    console.error("[gbp callback]", e?.message);
    return back("gbp=error");
  }
}
