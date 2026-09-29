import { NextResponse } from "next/server";
import { submitReviewRequest } from "@/lib/audit-share";

/** A business asks for a free profile review from its shared audit page. Public; records consent. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const res = await submitReviewRequest({
    via: b?.via, entityType: b?.entityType, slug: b?.slug, name: b?.name, phone: b?.phone, email: b?.email, message: b?.message, consent: b?.consent, ip,
  });
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}
