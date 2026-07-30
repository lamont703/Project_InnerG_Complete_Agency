import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewAsContext } from "@/lib/account/view-as";
import { CLAIM_ENTITY_TYPES } from "@/lib/entity-claim";

// Owner self-submission (Door 3): a member adds their own business. Rather than
// insert straight into a live table (which would be instantly public — the live
// tables have no hidden state), we STAGE it into agent_directives exactly like a
// discovery-agent find, tagged owner_source + owner_member_id, so it flows
// through the existing admin approve/publish pipeline. On approval the publish
// handler auto-links the member to the new entity (see update-status/route.ts).
const BUSINESS_DISCOVERY_AGENT = "Website Business Discovery Agent";

// Default Google-style category per type so the publish gate's required
// `category` field is always satisfied for owner submissions.
const CATEGORY_BY_TYPE: Record<string, string> = {
  shop: "barber_shop",
  salon: "beauty_salon",
  barber_school: "barber_school",
  cosmetology_school: "cosmetology_school",
  barber_supply_store: "barber_supply_store",
  beauty_supply_store: "beauty_supply_store",
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Please sign in first." }, { status: 401 });

  // These flows create a listing under the *real* signed-in account, deliberately
  // — nothing here resolves through View As. That makes them a trap while View As
  // is on: the admin believes they're the member and would file a listing on
  // their own account instead. Refuse rather than surprise them.
  const viewAs = await getViewAsContext();
  if (viewAs.viewingAs) {
    return NextResponse.json(
      {
        success: false,
        error: `View As is read-only. Exit View As (currently ${viewAs.viewingAs.name}) before creating a listing.`,
      },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("community_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ success: false, error: "No membership found for this account." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const entityType = String(body.entityType || "").trim();
  const name = String(body.name || "").trim();
  const street = String(body.street || "").trim();
  const city = String(body.city || "").trim();
  const state = String(body.state || "").trim().toUpperCase();
  const zip = String(body.zip || "").trim();
  const phone = String(body.phone || "").trim();
  const website = String(body.website || "").trim() || null;

  const cfg = CLAIM_ENTITY_TYPES.find((t) => t.key === entityType);
  if (!cfg || !CATEGORY_BY_TYPE[entityType]) {
    return NextResponse.json({ success: false, error: "Pick a valid business type." }, { status: 400 });
  }
  if (!name || !street || !city || !state || !phone) {
    return NextResponse.json({ success: false, error: "Business name, street, city, state, and phone are required." }, { status: 400 });
  }

  const formatted_address = [street, city, `${state}${zip ? ` ${zip}` : ""}`].filter(Boolean).join(", ");
  const subject_key = `new_business::${cfg.table}::${norm(name)}::${city.toLowerCase()}`;

  // Don't re-stage the same business (any status) — avoids a duplicate directive
  // and any subject_key collision.
  const { data: existing } = await (admin.from("agent_directives") as any)
    .select("id")
    .eq("subject_key", subject_key)
    .maybeSingle();
  if (existing) return NextResponse.json({ success: true, alreadySubmitted: true });

  const evidence = {
    type: "new_business_candidate",
    table: cfg.table,
    name,
    city,
    formatted_address,
    phone,
    website,
    category: CATEGORY_BY_TYPE[entityType],
    images: [],
    owner_source: true,
    owner_member_id: (member as any).id,
  };

  const { error } = await (admin.from("agent_directives") as any).insert({
    agent_name: BUSINESS_DISCOVERY_AGENT,
    mission: "Owner self-submitted business listing",
    directive_text: `Owner submission: ${name} (${city}) — ${cfg.noun}. Review and publish; the submitting member auto-links on approval.`,
    subject_key,
    evidence,
    status: "pending",
  });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
