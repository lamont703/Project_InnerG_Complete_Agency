import { NextResponse } from "next/server";
import { assertNotImpersonating, resolveMemberContext } from "@/lib/account/view-as";
import { approvedAgency, addToLine, updateLineItem, saveAgencySettings } from "@/lib/agency-publisher";

/** The agency publisher's actions from /account/agency/publisher — the same ones Claude has. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status });
  const blocked = assertNotImpersonating(ctx);
  if (blocked) return NextResponse.json({ ok: false, error: blocked.error }, { status: blocked.status });
  const a = await approvedAgency(ctx.memberId);
  if (!a.ok) return NextResponse.json(a, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const res =
    b?.action === "add" ? await addToLine(ctx.memberId, { video: String(b.video || ""), caption: b.caption ?? null, position: b.position ?? null })
    : b?.action === "update" ? await updateLineItem(ctx.memberId, String(b.post || ""), { caption: b.caption ?? null, moveTo: b.moveTo ?? null, remove: b.remove === true })
    : b?.action === "schedule" ? await saveAgencySettings(ctx.memberId, { slots: b.slots, paused: b.paused })
    : { ok: false as const, error: "Unknown action." };
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}
