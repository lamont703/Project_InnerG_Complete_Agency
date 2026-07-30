import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewAsContext } from "@/lib/account/view-as";

/**
 * Self-submission for licensed professionals — a barber or cosmetologist
 * creating their own directory listing.
 *
 * This is the person-shaped sibling of /api/account/add-business (Door 3). The
 * business form couldn't be reused: these two tables are built around a person,
 * not a storefront — no city, no formatted_address, no place_id — and they key
 * location off `metro_area` with `address` optional, because plenty of barbers
 * work a chair inside someone else's shop.
 *
 * Same architecture as every other submission path: STAGE into agent_directives
 * and let the existing admin approve/publish pipeline create the row. Nothing
 * writes to a live table here.
 *
 * Both tables carry a UNIQUE constraint on phone (unique_phone /
 * unique_cosmetologist_phone). Rather than let that surface as a failed insert
 * at publish time — days later, to an admin, about a person who's already in the
 * directory — we look the phone up first and hand the caller a claim target
 * instead. Someone already listed should claim their profile, not create a
 * second one.
 */

const PROFESSIONAL_TYPES: Record<string, { table: string; label: string; route: string }> = {
  barber: { table: "agent_barber_leads", label: "Barber", route: "/barbers" },
  cosmetologist: { table: "agent_cosmetologist_leads", label: "Cosmetologist", route: "/cosmetologists" },
};

const BUSINESS_DISCOVERY_AGENT = "Website Business Discovery Agent";
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Matches the normalization the publish handler and the dedup agent use, so a
// number entered as "(713) 555-0100" collides with a stored "7135550100".
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.length === 10 ? digits : null;
}

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
  if (!member) {
    return NextResponse.json(
      { success: false, error: "Finish creating your free membership first, then add your listing." },
      { status: 404 }
    );
  }
  const memberId = (member as any).id;

  const body = await req.json().catch(() => ({}));
  const entityType = String(body.entityType || "").trim();
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const metroArea = String(body.metroArea || "").trim();
  const address = String(body.address || "").trim() || null;
  const email = String(body.email || "").trim() || null;
  const website = String(body.website || "").trim() || null;
  const specialty = String(body.specialty || "").trim() || null;
  const licensureStatus = String(body.licensureStatus || "").trim() || null;
  const schoolName = String(body.schoolName || "").trim() || null;
  const instagram = String(body.instagram || "").trim().replace(/^@/, "") || null;

  const cfg = PROFESSIONAL_TYPES[entityType];
  if (!cfg) return NextResponse.json({ success: false, error: "Choose barber or cosmetologist." }, { status: 400 });
  if (!name || !phone || !metroArea) {
    return NextResponse.json(
      { success: false, error: "Your name, phone number, and metro area are required." },
      { status: 400 }
    );
  }
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return NextResponse.json({ success: false, error: "Enter a 10-digit phone number." }, { status: 400 });
  }

  // Already in the directory? Send them to claim it. Checked across BOTH
  // professional tables, not just the selected one — a barber who's listed as a
  // cosmetologist (or vice versa) still shouldn't create a duplicate person.
  for (const [key, candidate] of Object.entries(PROFESSIONAL_TYPES)) {
    const { data: rows } = await (admin.from(candidate.table) as any)
      .select("id, name, slug, phone")
      .limit(2000);
    const hit = ((rows || []) as any[]).find((r) => normalizePhone(r.phone) === normalizedPhone);
    if (hit) {
      return NextResponse.json({
        success: true,
        alreadyListed: true,
        claim: {
          entityType: key,
          entityId: hit.id,
          name: hit.name,
          href: hit.slug ? `${candidate.route}/${hit.slug}` : null,
          // The membership form reads these query params to attach the claim.
          claimHref: `/membership?claim_type=${key}&claim_id=${hit.id}&claim_name=${encodeURIComponent(hit.name || "")}`,
        },
      });
    }
  }

  // Same subject_key convention as the other doors, so a professional can't be
  // staged twice and an admin sees one directive per person.
  const subject_key = `new_professional::${cfg.table}::${norm(name)}::${metroArea.toLowerCase()}`;
  const { data: existing } = await (admin.from("agent_directives") as any)
    .select("id")
    .eq("subject_key", subject_key)
    .maybeSingle();
  if (existing) return NextResponse.json({ success: true, alreadySubmitted: true });

  const evidence = {
    // Distinct from new_business_candidate so the publish handler routes it to
    // the person path instead of the storefront one.
    type: "new_professional_candidate",
    table: cfg.table,
    name,
    phone,
    metro_area: metroArea,
    address,
    email,
    website_url: website,
    specialty_type: specialty,
    licensure_status: licensureStatus,
    school_name: schoolName,
    instagram_handle: instagram,
    // Exempts the photo gate and drives the auto-link on approval, exactly as
    // it does for owner-submitted businesses.
    owner_source: true,
    owner_member_id: memberId,
    professional_source: true,
  };

  const { error } = await (admin.from("agent_directives") as any).insert({
    agent_name: BUSINESS_DISCOVERY_AGENT,
    mission: "Licensed professional submitted their own directory listing",
    directive_text:
      `Professional self-submission: ${name} — ${cfg.label} in ${metroArea}. ` +
      `${licensureStatus ? `License: ${licensureStatus}. ` : ""}${specialty ? `Specialties: ${specialty}. ` : ""}` +
      `Submitted by a community member; review and publish, and the member auto-links on approval.`,
    subject_key,
    evidence,
    status: "pending",
  });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
