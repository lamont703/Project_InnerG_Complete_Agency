import { NextResponse } from "next/server";
import { acceptUpload } from "@/lib/mcp/photo-upload";
import { KIND_LABEL } from "@/lib/gbp-changes";

/**
 * Where an owner's photo lands, from the upload box inside Claude or from the
 * fallback page at /upload/<token>.
 *
 * CORS IS OPEN, ON PURPOSE. The upload box runs in Claude's sandbox, on an
 * origin under claudemcpcontent.com that we do not choose and cannot list in
 * advance. Nothing here reads a cookie or a session — the one-time token in
 * the path is the whole credential — so allowing any origin gives a page
 * nothing it did not already have if it holds the token.
 *
 * Bodies are capped by Vercel at about 4.5MB, which is why both the box and
 * the fallback page shrink the photo in the browser before sending it.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "600",
  "Cache-Control": "no-store",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const category = String(form?.get("category") || "");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "No photo was sent." }, { status: 400, headers: cors });
  }

  try {
    const result = await acceptUpload({ token, file, category });
    if (!result.ok) return NextResponse.json({ ok: false, message: result.message }, { status: result.status, headers: cors });
    return NextResponse.json(
      {
        ok: true,
        changeId: result.changeId,
        category: result.category,
        canPublish: result.canPublish,
        summary: `Photo uploaded and saved as a draft (${KIND_LABEL.photo_add}). Nothing is on Google yet.`,
      },
      { headers: cors }
    );
  } catch (e: any) {
    console.error("[mcp-upload] failed:", e);
    return NextResponse.json({ ok: false, message: "The upload failed. Try again." }, { status: 500, headers: cors });
  }
}
