import { NextResponse } from "next/server";
import { assertNotImpersonating, resolveMemberContext } from "@/lib/account/view-as";
import { saveAutopilotSettings } from "@/lib/autopilot/run";

/** Save the signed-in owner's Autopilot settings. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status });
  const blocked = assertNotImpersonating(ctx);
  if (blocked) return NextResponse.json({ ok: false, error: blocked.error }, { status: blocked.status });
  const settings = await saveAutopilotSettings(ctx.memberId, await req.json().catch(() => ({})));
  return NextResponse.json({ ok: true, settings });
}
