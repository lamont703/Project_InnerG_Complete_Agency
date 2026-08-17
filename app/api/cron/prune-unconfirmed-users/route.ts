import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Deletes auth users who asked for a magic link and never opened it.
 *
 * WHY THEY EXIST. signInWithOtp({ shouldCreateUser: true }) provisions the auth
 * user when the link is REQUESTED, not when it is clicked — and a trigger
 * mirrors that straight into public.users. So every person who taps "email me a
 * link" and then forgets leaves a permanent, unconfirmed account behind. Left
 * alone, the user count drifts upward with people who never joined, and every
 * number derived from it is quietly wrong.
 *
 * THIS DELETES REAL ACCOUNTS AND IS NOT REVERSIBLE, so the guards matter more
 * than the sweeping. ALL of these must hold, and each removes a distinct way
 * this could destroy something:
 *
 *   never confirmed        — a confirmed address is a real person's account
 *   never signed in        — belt and braces; confirmation should imply it
 *   older than 7 days      — a link is valid for far less; anything inside the
 *                            window may still be sitting unopened in an inbox
 *   no community_members   — the member row is the product. If one exists, the
 *                            account is real whatever auth thinks
 *   no entity link         — a claimed listing outranks every other signal
 *   role is community_member or client_viewer
 *                          — an admin or developer account is never touched by
 *                            an automated job, whatever its confirmation state
 *
 * DELETING THE AUTH USER IS ENOUGH. public.users is
 * `REFERENCES auth.users(id) ON DELETE CASCADE`, so the mirror row goes with
 * it. Deleting from public.users instead would leave the auth user orphaned and
 * still able to sign in.
 *
 * Run ?dry=1 to see what it WOULD delete. Do that first after any change here.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** A link is valid for minutes. Seven days is not a grace period, it is proof. */
const UNCONFIRMED_MAX_AGE_DAYS = 7;

/** Deliberately small. A sweep that removes dozens per run is a bug report. */
const MAX_DELETIONS = 25;

const DELETABLE_ROLES = new Set(["community_member", "client_viewer"]);

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const admin = createAdminClient();
  const cutoff = Date.now() - UNCONFIRMED_MAX_AGE_DAYS * 24 * 3600_000;

  const { data: page, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const stale = (page?.users || []).filter(
    (u: any) =>
      !u.email_confirmed_at &&
      !u.last_sign_in_at &&
      u.created_at &&
      new Date(u.created_at).getTime() < cutoff
  );

  if (!stale.length) {
    return NextResponse.json({ dryRun: dry, considered: page?.users?.length ?? 0, stale: 0, deleted: 0 });
  }

  const ids = stale.map((u: any) => u.id);

  // Anything with a member row, a claimed listing or a privileged role is
  // excluded — each check independently disqualifies a deletion.
  const [{ data: members }, { data: links }, { data: rows }] = await Promise.all([
    (admin.from("community_members") as any).select("user_id").in("user_id", ids),
    (admin.from("community_members") as any)
      .select("id, user_id, community_member_entity_links(id)")
      .in("user_id", ids),
    (admin.from("users") as any).select("id, role").in("id", ids),
  ]);

  const hasMember = new Set((members || []).map((m: any) => m.user_id));
  const hasLink = new Set(
    (links || []).filter((m: any) => (m.community_member_entity_links || []).length > 0).map((m: any) => m.user_id)
  );
  const roleById = new Map<string, string>((rows || []).map((r: any) => [r.id as string, r.role as string]));

  const deletable = stale.filter((u: any) => {
    if (hasMember.has(u.id)) return false;
    if (hasLink.has(u.id)) return false;
    const role = roleById.get(u.id);
    // An id with no users row is a mirror that never landed — still safe, but
    // an UNKNOWN role is not, so absence is allowed and a strange value is not.
    if (role !== undefined && !DELETABLE_ROLES.has(role)) return false;
    return true;
  });

  const batch = deletable.slice(0, MAX_DELETIONS);

  if (dry) {
    return NextResponse.json({
      dryRun: true,
      considered: page?.users?.length ?? 0,
      stale: stale.length,
      deletable: deletable.length,
      wouldDelete: batch.map((u: any) => ({
        // Addresses are the point of the report here — this endpoint is
        // CRON_SECRET-gated and the operator needs to recognise a mistake
        // before it is made permanent.
        email: u.email,
        createdAt: u.created_at,
        ageDays: Math.floor((Date.now() - new Date(u.created_at).getTime()) / 86400000),
        role: roleById.get(u.id) ?? "(no users row)",
      })),
      skippedBecauseRealAccount: stale.length - deletable.length,
    });
  }

  let deleted = 0;
  const failures: string[] = [];
  for (const u of batch) {
    try {
      const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
      if (delErr) failures.push(delErr.message);
      else deleted++;
    } catch (err: any) {
      failures.push(err?.message || "unknown");
    }
  }

  if (failures.length) console.warn(`[prune-unconfirmed] ${failures.join("; ")}`);

  return NextResponse.json({
    considered: page?.users?.length ?? 0,
    stale: stale.length,
    deletable: deletable.length,
    deleted,
    failed: failures.length,
  });
}
