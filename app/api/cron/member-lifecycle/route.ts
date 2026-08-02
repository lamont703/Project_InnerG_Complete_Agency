import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGhlEmail } from "@/lib/ghl-email";
import { isTestContact } from "@/lib/ghl-contacts";
import { claimTypeConfig } from "@/lib/entity-claim";
import { auditPublicEntity } from "@/lib/gbp-audit-public-fetch";
import { PUBLIC_ENTITY_TYPES } from "@/lib/gbp-audit-public";
import { decide, type MemberFacts, type LifecycleStage } from "@/lib/member-lifecycle";
import { buildLifecycleEmail } from "@/lib/member-lifecycle-emails";

/**
 * Member lifecycle emails.
 *
 * The gap this closes: members signed up, claimed a listing, and never heard
 * from us again. Not because they went cold — because nothing ever reached
 * them. The first cohort of five received precisely nothing between signing up
 * and being contacted by hand.
 *
 * What makes this worth automating rather than leaving as a task list is the
 * claimed-but-not-connected email, which carries a real audit score. The public
 * audit needs no Google connection, so we can tell someone something true and
 * specific about their own listing before they have given us anything.
 *
 * Sending is deliberately conservative — see lib/member-lifecycle.ts for the
 * four rules. This job's own contribution is that it sends AT MOST ONE email
 * per member per run and records every attempt, including failures.
 *
 * DRY RUN by default when called with ?dry=1, so the first look at a real
 * cohort doesn't have to be a send.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when that var is set. */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Which public-audit type a claim maps to, where one exists. */
const AUDITABLE: Record<string, string> = {
  shop: "shop",
  salon: "salon",
  barber_school: "barber_school",
  cosmetology_school: "cosmetology_school",
  barber_supply_store: "barber_store",
  beauty_supply_store: "beauty_store",
};

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const dryRun = new URL(req.url).searchParams.get("dry") === "1";
  const admin = createAdminClient();
  const now = new Date();

  const [memberRes, linkRes, connRes, sentRes] = await Promise.all([
    (admin.from("community_members") as any).select("id, first_name, last_name, email, phone, created_at"),
    (admin.from("community_member_entity_links") as any).select("community_member_id, entity_type, entity_id, linked_at"),
    (admin.from("gbp_connections") as any).select("community_member_id, created_at, updated_at"),
    (admin.from("member_lifecycle_emails") as any).select("community_member_id, stage, sent_at"),
  ]);

  // Fail loudly rather than emailing on partial facts.
  //
  // This is not defensive padding. The first dry run selected a column that
  // doesn't exist on the links table, the query returned null instead of
  // throwing, and every member with a claim looked unclaimed — the job was one
  // step from telling four people who had already claimed a listing to go and
  // claim a listing. A missing row is a stage; a failed query is a lie.
  const failed = [
    ["community_members", memberRes.error],
    ["community_member_entity_links", linkRes.error],
    ["gbp_connections", connRes.error],
    ["member_lifecycle_emails", sentRes.error],
  ].filter(([, e]) => e);

  if (failed.length) {
    const detail = failed.map(([t, e]: any) => `${t}: ${e.message}`).join("; ");
    console.error("[member-lifecycle] aborted —", detail);
    return NextResponse.json({ success: false, error: `could not read state — ${detail}` }, { status: 500 });
  }

  const members = memberRes.data;
  const links = linkRes.data;
  const conns = connRes.data;
  const sent = sentRes.data;

  const claimBy = new Map<string, any>();
  for (const l of links || []) if (!claimBy.has(l.community_member_id)) claimBy.set(l.community_member_id, l);
  const connBy = new Map<string, any>();
  for (const c of conns || []) connBy.set(c.community_member_id, c);
  const sentBy = new Map<string, { stages: LifecycleStage[]; last: string | null }>();
  for (const s of sent || []) {
    const e = sentBy.get(s.community_member_id) || { stages: [], last: null };
    e.stages.push(s.stage);
    if (s.sent_at && (!e.last || s.sent_at > e.last)) e.last = s.sent_at;
    sentBy.set(s.community_member_id, e);
  }

  const summary = {
    dryRun,
    members: members?.length ?? 0,
    sent: 0,
    failed: 0,
    skipped: [] as string[],
    planned: [] as { name: string; email: string; stage: string; subject: string }[],
  };

  for (const m of members || []) {
    const who = `${m.first_name} ${m.last_name}`.trim() || m.email;

    if (!m.email) { summary.skipped.push(`${who}: no email`); continue; }
    if (isTestContact({ email: m.email, phone: m.phone })) {
      summary.skipped.push(`${who}: test account`);
      continue;
    }

    const claim = claimBy.get(m.id);
    const conn = connBy.get(m.id);
    const history = sentBy.get(m.id) || { stages: [], last: null };

    // An audit snapshot is the only evidence we have that someone looked at
    // their report, and an applied change request that they acted on it.
    const [{ data: snaps }, { data: changes }] = await Promise.all([
      (admin.from("gbp_audit_snapshots") as any)
        .select("created_at").eq("community_member_id", m.id).order("created_at", { ascending: true }).limit(1),
      (admin.from("gbp_change_requests") as any)
        .select("id").eq("community_member_id", m.id).eq("status", "applied").limit(1),
    ]);

    const facts: MemberFacts = {
      memberId: m.id,
      createdAt: m.created_at,
      hasClaim: !!claim,
      claimedAt: claim?.linked_at ?? null,
      hasConnection: !!conn,
      connectedAt: conn?.created_at ?? null,
      hasAudit: !!snaps?.length,
      firstAuditAt: snaps?.[0]?.created_at ?? null,
      hasChangeApplied: !!changes?.length,
      lastActivityAt: conn?.updated_at ?? claim?.linked_at ?? m.created_at,
      sentStages: history.stages,
      lastSentAt: history.last,
    };

    const decision = decide(facts, now);
    if (!decision.send || !decision.stage) {
      summary.skipped.push(`${who}: ${decision.reason}`);
      continue;
    }

    // Only the claimed-but-not-connected email carries a score, and only that
    // stage pays for the extra queries.
    let audit = null;
    let businessName: string | null = null;
    let city: string | null = null;
    if (decision.stage === "claimed_not_connected" && claim) {
      const publicType = AUDITABLE[claim.entity_type];
      const cfg = publicType ? (PUBLIC_ENTITY_TYPES as any)[publicType] : null;
      const claimCfg = claimTypeConfig(claim.entity_type);
      if (cfg && claimCfg) {
        const { data: entity } = await (admin as any)
          .from(claimCfg.table).select("slug").eq("id", claim.entity_id).maybeSingle();
        if (entity?.slug) {
          const scored = await auditPublicEntity(admin, publicType, cfg, entity.slug);
          if (scored) {
            audit = scored.audit;
            businessName = scored.business.name;
            city = scored.business.city;
          }
        }
      }
    }

    const email = buildLifecycleEmail(decision.stage, {
      firstName: m.first_name,
      businessName,
      city,
      audit,
    });
    if (!email) { summary.skipped.push(`${who}: no copy for ${decision.stage}`); continue; }

    if (dryRun) {
      summary.planned.push({ name: who, email: m.email, stage: decision.stage, subject: email.subject });
      continue;
    }

    const result = await sendGhlEmail({
      email: m.email,
      name: who,
      subject: email.subject,
      html: email.html,
    });

    // Recorded either way. The unique index means a failed attempt still
    // occupies the stage — deliberate: a member who errored twice should be
    // looked at by a person, not retried by a job.
    await (admin.from("member_lifecycle_emails") as any).insert({
      community_member_id: m.id,
      stage: decision.stage,
      subject: email.subject,
      sent_at: result.ok ? new Date().toISOString() : null,
      error: result.ok ? null : result.error,
    });

    if (result.ok) summary.sent++;
    else { summary.failed++; console.error(`[member-lifecycle] ${who}: ${result.error}`); }
  }

  return NextResponse.json({ success: true, ...summary });
}
