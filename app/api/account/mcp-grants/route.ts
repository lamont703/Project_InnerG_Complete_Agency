import { NextResponse } from "next/server";
import { resolveMemberContext, assertNotImpersonating } from "@/lib/account/view-as";
import { listGrants, revokeGrant } from "@/lib/mcp/oauth";

/**
 * Apps the owner has signed in to ShearQuery from — the OAuth counterpart of
 * /api/account/mcp-keys.
 *
 *   GET    → each app, when it was allowed, what it may do, when last used
 *   DELETE → revoke one; every token under it stops working on its next call
 *
 * Revoking is a write and View As cannot do it, same rule as the keys: an
 * admin cutting off a member's Claude is not "viewing".
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  return NextResponse.json({ grants: await listGrants(ctx.memberId) });
}

export async function DELETE(request: Request) {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const blocked = assertNotImpersonating(ctx);
  if (blocked) return NextResponse.json({ error: blocked.error }, { status: blocked.status });

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "Which app?" }, { status: 400 });
  const revoked = await revokeGrant({ id, memberId: ctx.memberId });
  if (!revoked) return NextResponse.json({ error: "That app was not found, or is already disconnected." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
