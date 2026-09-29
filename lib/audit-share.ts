import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGhlEmail } from "@/lib/ghl-email";
import { SITE_URL } from "@/lib/site";
import { approvedAgencyByCode } from "@/lib/agency-partners";
import { resolveProspect, saveProspect } from "@/lib/prospecting";
import { PUBLIC_ENTITY_TYPES } from "@/lib/gbp-audit-public";
import { isEmail } from "@/lib/agency-referral-rules";

/**
 * Shareable audit pages: an agency sends a prospect a link to that business's
 * free Google audit (/audit/<type>/<slug>?via=<CODE>) from ITS OWN email, DMs
 * or in person — ShearQuery sends nothing. Joining from the page goes through
 * the agency's referral link, so the business is credited to the agency.
 *
 * Why this instead of ShearQuery-hosted outreach (decided 2026-09-29): cold
 * texts and email to people who haven't opted in are what carriers and email
 * providers suspend senders for. Here the agency sends from its own channels,
 * and a business that wants help says so on the page — recorded consent.
 */

const db = () => createAdminClient() as any;

export const CONSENT_TEXT = (agency: string) =>
  `I'd like a free review of my Google profile. ${agency} and ShearQuery may contact me about it by phone, text or email. I can ask them to stop at any time.`;

export async function shareAuditLink(agencyMemberId: string, query: string) {
  const { data: agency } = await db().from("agency_profiles").select("referral_code, partner_status").eq("community_member_id", agencyMemberId).maybeSingle();
  if (agency?.partner_status !== "approved" || !agency.referral_code) return { error: "Audit links open once ShearQuery approves the agency." };
  const found = await resolveProspect(query);
  if ("error" in found) return found;
  const { key, cfg, row } = found;
  const url = `${SITE_URL}/audit/${key}/${row.slug}?via=${agency.referral_code}`;
  // Sharing it means they're being pitched: make sure it's in the pipeline.
  const { data: existing } = await db().from("agency_prospects").select("id").eq("agency_member_id", agencyMemberId).eq("entity_type", key).eq("entity_id", row.id).maybeSingle();
  if (!existing) await saveProspect(agencyMemberId, `${key}:${row.slug}`);
  return { url, name: row[cfg.nameField] as string, city: row.city as string | null };
}

/** Link-preview fetchers open every pasted link; they aren't the business reading it. */
const PREVIEW_BOTS = /bot|crawl|spider|preview|facebookexternalhit|slack|whatsapp|discord|telegram|linkedin|twitter|skype|embedly|vercel|headless/i;

export async function recordAuditView(agencyMemberId: string, entityType: string, entityId: string, userAgent: string | null) {
  if (!userAgent || PREVIEW_BOTS.test(userAgent)) return;
  const key = { agency_member_id: agencyMemberId, entity_type: entityType, entity_id: entityId };
  const { data } = await db().from("agency_audit_views").select("views").match(key).maybeSingle();
  if (data) await db().from("agency_audit_views").update({ views: data.views + 1, last_viewed_at: new Date().toISOString() }).match(key);
  else await db().from("agency_audit_views").insert(key);
}

export async function submitReviewRequest(input: {
  via: unknown; entityType: unknown; slug: unknown; name: unknown; phone: unknown; email: unknown; message: unknown; consent: unknown; ip: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const agency = await approvedAgencyByCode(String(input.via ?? ""));
  if (!agency) return { ok: false, error: "This link isn't active." };
  const cfg = PUBLIC_ENTITY_TYPES[String(input.entityType)];
  if (!cfg) return { ok: false, error: "Unknown business." };
  const { data: row } = await db().from(cfg.table).select(`id, slug, ${cfg.nameField}`).eq("slug", String(input.slug ?? "")).maybeSingle();
  if (!row) return { ok: false, error: "Unknown business." };
  if (input.consent !== true) return { ok: false, error: "Tick the box so they're allowed to contact you." };
  const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max) || null;
  const name = clean(input.name, 80);
  const phone = clean(input.phone, 30);
  const email = clean(input.email, 254);
  if (!name) return { ok: false, error: "Add your name." };
  if (!phone && !email) return { ok: false, error: "Add a phone number or an email so they can reach you." };
  if (email && !isEmail(email)) return { ok: false, error: "That email doesn't look right." };

  const businessName = row[cfg.nameField] || "Your business";
  // Once per business per agency per day is plenty.
  const { count } = await db().from("agency_audit_requests").select("id", { count: "exact", head: true })
    .eq("agency_member_id", agency.memberId).eq("entity_id", row.id).gte("created_at", new Date(Date.now() - 86400_000).toISOString());
  if ((count ?? 0) > 0) return { ok: true };

  await db().from("agency_audit_requests").insert({
    agency_member_id: agency.memberId, entity_type: String(input.entityType), entity_id: row.id, business_name: businessName,
    contact_name: name, phone, email, message: clean(input.message, 1000), consent_text: CONSENT_TEXT(agency.name), ip: input.ip,
  });
  await saveProspect(agency.memberId, `${input.entityType}:${row.slug}`, "interested", `Asked for a profile review on their audit page${phone ? ` · ${phone}` : ""}${email ? ` · ${email}` : ""}`).catch(() => {});

  const { data: owner } = await db().from("community_members").select("email, first_name").eq("id", agency.memberId).maybeSingle();
  if (owner?.email) {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    await sendGhlEmail({
      email: owner.email,
      subject: `${businessName} asked for a profile review`,
      html: `<p>${esc(name)} at <strong>${esc(businessName)}</strong> opened the audit you shared and asked for a free profile review.</p>
<p>${phone ? `Phone: ${esc(phone)}<br/>` : ""}${email ? `Email: ${esc(email)}<br/>` : ""}${input.message ? `Message: ${esc(String(input.message).slice(0, 1000))}` : ""}</p>
<p>They agreed to be contacted by you about it. They're marked Interested in your pipeline — <a href="${SITE_URL}/account/agency">your agency page</a>.</p>`,
    }).catch(() => {});
  }
  return { ok: true };
}

/** For the pipeline: opens and review requests per business. */
export async function shareActivity(agencyMemberId: string) {
  const [{ data: views }, { data: reqs }] = await Promise.all([
    db().from("agency_audit_views").select("entity_type, entity_id, views, last_viewed_at").eq("agency_member_id", agencyMemberId),
    db().from("agency_audit_requests").select("entity_type, entity_id, created_at").eq("agency_member_id", agencyMemberId),
  ]);
  const v = new Map<string, { views: number; last: string }>((views || []).map((x: any) => [`${x.entity_type}:${x.entity_id}`, { views: x.views, last: x.last_viewed_at }]));
  const r = new Set<string>((reqs || []).map((x: any) => `${x.entity_type}:${x.entity_id}`));
  return { views: v, requested: r };
}
