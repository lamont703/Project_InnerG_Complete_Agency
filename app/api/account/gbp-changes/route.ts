import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMemberContext, assertNotImpersonating } from "@/lib/account/view-as";
import { listConnectionKeys } from "@/lib/mcp/connection";
import { listGrants } from "@/lib/mcp/oauth";
import { publishChange, undoChange, discardChange, DRAFT_TTL_HOURS } from "@/lib/gbp-changes";
import { kindOf, isUndoable, describeChange, sourceOf, KIND_TITLE } from "@/lib/gbp-change-describe";

/**
 * The owner's change history for their Google profile.
 *
 *   GET  → every change, newest first: drafts, published, failed, undone —
 *          from Claude and from the website alike
 *   POST → { action: "publish" | "undo" | "discard", id }
 *
 * WHY THIS EXISTS. Every publish from Claude emails the owner, and the email
 * used to end "ask Claude to undo change <uuid>". That is no use to an owner
 * reading it on their phone, and worse than no use if the change came from a
 * connection they did not recognise — the one tool they had for undoing it was
 * the connection they no longer trust. This page is where the email now links.
 *
 * Publishing a draft from here is the owner clicking a button while signed in
 * to their own account, which is a stronger approval than a prompt inside
 * Claude — so it is also the way out for a draft made on a connection that was
 * created without publishing.
 *
 * The raw `proposed` column is not sent to the browser. It holds whatever the
 * write needed (whole service lists, full category objects); the page needs the
 * sentence, and describeChange builds it.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

  const admin = createAdminClient();
  const [{ data: rows }, keys, grants] = await Promise.all([
    (admin.from("gbp_change_requests") as any)
      .select("id, status, surface, proposed, origin, created_at, approved_at, applied_at, error, snapshot_id")
      .eq("community_member_id", ctx.memberId)
      .order("created_at", { ascending: false })
      .limit(100),
    listConnectionKeys(ctx.memberId),
    listGrants(ctx.memberId),
  ]);

  // A change records the connection that made it as claude:<prefix>. Keys and
  // signed-in apps share that namespace (oa_… is a grant), so one map finds
  // either, and the page's revoke button knows which endpoint to call.
  const byPrefix = new Map<string, { id: string; label: string | null; keyPrefix: string; revoked: boolean; kind: "key" | "grant" }>([
    ...keys.map((k) => [k.keyPrefix, { id: k.id, label: k.label, keyPrefix: k.keyPrefix, revoked: !!k.revokedAt, kind: "key" as const }] as const),
    ...grants.map((g) => [g.prefix, { id: g.id, label: `${g.clientName || g.clientHost} (signed in)`, keyPrefix: g.prefix, revoked: !!g.revokedAt, kind: "grant" as const }] as const),
  ]);
  const now = Date.now();

  const changes = (rows || []).map((r: any) => {
    const kind = kindOf(r);
    const source = sourceOf(r);
    const key = source.via === "claude" ? byPrefix.get(source.keyPrefix) : undefined;
    const expired = r.status === "pending" && now - new Date(r.created_at).getTime() > DRAFT_TTL_HOURS * 3_600_000;
    const scheduled = !!r.proposed?.publishAt;
    return {
      id: r.id,
      status: expired ? "expired" : r.status,
      title: kind ? KIND_TITLE[kind] : r.surface,
      lines: describeChange(r),
      via: source.via,
      connection: key
        ? key
        : source.via === "claude"
          ? { id: null, label: null, keyPrefix: source.keyPrefix, revoked: true, kind: "key" as const }
          : null,
      createdAt: r.created_at,
      appliedAt: r.applied_at,
      error: r.error,
      scheduled,
      // Drafts only exist from Claude — website saves are approved as they are made.
      canPublish: r.status === "pending" && !expired && !!r.proposed?.kind,
      canDiscard: r.status === "pending",
      canUndo: r.status === "applied" && isUndoable(kind) && (!!r.snapshot_id || scheduled),
      // Why there is no button, so a missing Undo does not read as a bug.
      undoNote:
        r.status === "applied" && !isUndoable(kind)
          ? kind === "photo_remove"
            ? "A deleted photo cannot be restored. It would have to be uploaded again."
            : "Booking-link changes cannot be undone here. Make the opposite change instead."
          : null,
    };
  });

  return NextResponse.json({ success: true, changes, draftTtlHours: DRAFT_TTL_HOURS });
}

export async function POST(req: Request) {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

  // Publishing or undoing on a member's live Google profile while viewing as
  // them would be a change they never made, under their name.
  const readOnly = assertNotImpersonating(ctx);
  if (readOnly) return NextResponse.json({ success: false, error: readOnly.error }, { status: readOnly.status });

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");
  const id = String(body?.id || "");
  if (!id) return NextResponse.json({ success: false, error: "Which change?" }, { status: 400 });

  // Each of these scopes its lookup to ctx.memberId, so an id belonging to
  // someone else simply matches nothing.
  const result =
    action === "publish"
      ? await publishChange({ memberId: ctx.memberId, changeId: id })
      : action === "undo"
        ? await undoChange({ memberId: ctx.memberId, changeId: id })
        : action === "discard"
          ? await discardChange({ memberId: ctx.memberId, changeId: id })
          : null;

  if (!result) return NextResponse.json({ success: false, error: "Unknown action." }, { status: 400 });
  return NextResponse.json({ success: result.ok, message: result.text }, { status: result.ok ? 200 : 409 });
}
