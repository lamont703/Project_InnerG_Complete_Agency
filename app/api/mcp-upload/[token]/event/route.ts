import { NextResponse } from "next/server";
import { recordAgentRequest, clientIpFrom } from "@/lib/agent-requests";

/**
 * What the upload box reports about itself: loaded, connected, result received,
 * upload started, or an error.
 *
 * WHY THIS EXISTS. The first version of the box never appeared in claude.ai,
 * and the only evidence was absence — Claude had fetched the view five times
 * and no upload ever arrived. Nothing said whether the page loaded, whether
 * the handshake finished, or whether the tool result reached it. These rows,
 * in agent_requests as mcp_method "app/<event>", say which step it reached.
 *
 * Best-effort from the box's side (a blocked request just goes unrecorded), so
 * a missing row is a clue, not proof. Writes nothing but a log row, and the
 * token is recorded only as its first characters.
 */

export const dynamic = "force-dynamic";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

const EVENTS = new Set(["loaded", "connected", "tool-result", "no-result", "upload-start", "upload-ok", "upload-failed", "network-blocked", "message-sent", "message-failed", "error"]);

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

/**
 * GET as well as POST: the box falls back to an image request when fetch is
 * refused, because a sandbox can allow img-src while blocking connect-src.
 * Before the tool result arrives the box has no token and reports under
 * "pending".
 */
export async function GET(request: Request, ctx: { params: Promise<{ token: string }> }) {
  const q = new URL(request.url).searchParams;
  return record(request, (await ctx.params).token, {
    event: q.get("e"), detail: q.get("d"), host: q.get("h"), platform: q.get("p"),
  });
}

export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  const raw = await request.text().catch(() => "");
  let body: any = {};
  try {
    body = JSON.parse(raw.slice(0, 2000));
  } catch {
    /* an unparseable body records nothing */
  }
  return record(request, (await ctx.params).token, body);
}

function record(request: Request, token: string, body: any) {
  const event = String(body?.event || "");
  if (!EVENTS.has(event)) return new NextResponse(null, { status: 204, headers: cors });

  recordAgentRequest({
    surface: "mcp",
    path: "/mcp-app/photo-upload",
    mcpMethod: `app/${event}`,
    toolName: "upload_photo",
    toolArguments: {
      session: /^squp_/.test(token) ? token.slice(0, 10) : "none",
      detail: String(body?.detail ?? "").slice(0, 300),
      host: String(body?.host ?? "").slice(0, 80),
      platform: String(body?.platform ?? "").slice(0, 20),
    },
    userAgent: request.headers.get("user-agent"),
    clientIp: clientIpFrom(request.headers),
    statusCode: 200,
    isError: /failed|blocked|error|no-result/.test(event),
  });
  return new NextResponse(null, { status: 204, headers: cors });
}
