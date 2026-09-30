import { NextResponse } from "next/server";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { saveConfig, setSessionMeetUrl } from "@/lib/live-training/store";

/** Admin: the LIVE training's settings (Meet link, campaign start, mailing address) and a per-week link override. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "Admins only." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (b?.sessionDate) {
    try { await setSessionMeetUrl(String(b.sessionDate), b.meetUrl ? String(b.meetUrl) : null); } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 400 }); }
    return NextResponse.json({ ok: true });
  }
  const res = await saveConfig(b ?? {});
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}
