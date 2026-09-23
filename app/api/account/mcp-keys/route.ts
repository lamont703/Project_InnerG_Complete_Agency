import { NextResponse } from "next/server";
import { resolveMemberContext, assertNotImpersonating } from "@/lib/account/view-as";
import {
  listConnectionKeys,
  mintConnectionKey,
  revokeConnectionKey,
} from "@/lib/mcp/connection";

/**
 * The owner's connection keys for /mcp.
 *
 *   GET    → their keys, by prefix. Never the keys themselves.
 *   POST   → mint one, returning the full URL ONCE
 *   DELETE → revoke one
 *
 * WHY MINTING IS A WRITE THAT VIEW AS CANNOT DO. A connection key is a standing
 * credential to one member's account data. An admin looking at what a member
 * sees has no business creating one — that is not "viewing", it is issuing
 * themselves ongoing access under someone else's name, and it would be
 * indistinguishable afterwards from the member having done it. So every
 * mutating branch here goes through assertNotImpersonating, same rule as the
 * listing-edit surfaces.
 *
 * GET is allowed under View As, because seeing that a member has two keys and
 * when they were last used is exactly the support question the feature exists
 * to answer, and the prefixes are not secrets.
 */

export const dynamic = "force-dynamic";

/** Long enough to name a device, short enough not to be a notes field. */
const LABEL_MAX = 60;

export async function GET() {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const keys = await listConnectionKeys(ctx.memberId);
  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const blocked = assertNotImpersonating(ctx);
  if (blocked) return NextResponse.json({ error: blocked.error }, { status: blocked.status });

  const body = await request.json().catch(() => ({}));
  const label = String(body?.label ?? "").slice(0, LABEL_MAX);

  /**
   * A cap, because each key is a live credential and a page with an "add"
   * button invites clicking it. Five is more than anyone needs — one per device
   * — and revoking is one click, so the limit pushes toward replacing a key
   * rather than accumulating keys nobody can account for.
   */
  const existing = await listConnectionKeys(ctx.memberId);
  const live = existing.filter((k) => !k.revokedAt);
  if (live.length >= 5) {
    return NextResponse.json(
      {
        error:
          "You already have five active connections. Revoke one you no longer use before creating another.",
      },
      { status: 409 }
    );
  }

  try {
    const { key, url, row } = await mintConnectionKey({ memberId: ctx.memberId, label });
    // `key` and `url` appear in this response and nowhere else, ever. There is
    // no endpoint that can return them again — see lib/mcp/connection.ts.
    return NextResponse.json({ key, url, row }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not create a connection." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const blocked = assertNotImpersonating(ctx);
  if (blocked) return NextResponse.json({ error: blocked.error }, { status: blocked.status });

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "Which connection?" }, { status: 400 });

  const revoked = await revokeConnectionKey({ id, memberId: ctx.memberId });
  // Not-found and belongs-to-someone-else answer the same way. The id came off
  // a URL, and confirming that an id exists but is not yours is a fact worth
  // withholding.
  if (!revoked) {
    return NextResponse.json({ error: "That connection was not found, or is already revoked." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
