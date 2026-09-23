import { NextRequest, NextResponse } from "next/server";
import { handleMcpPost } from "@/lib/mcp/handler";
import { keyFromRequest, resolveConnectionKey, redactConnectionPath } from "@/lib/mcp/connection";
import { recordAgentRequest, clientIpFrom } from "@/lib/agent-requests";
import { SITE_URL } from "@/lib/site";

/**
 * The per-owner MCP endpoint.
 *
 * Same protocol as /mcp, same handler, one addition: this request is acting for
 * a specific business owner, so the my_* and propose_* tools appear.
 *
 * WHY THE KEY IS IN THE PATH. Claude's custom connectors (claude.ai, Desktop,
 * mobile) take a URL and, optionally, OAuth client credentials — there is no
 * field for a custom header. The owner here is a barber, not a developer with a
 * terminal, so the only credential they can supply is part of the URL they
 * paste. Claude Code CAN send a header, and that is accepted too (see
 * keyFromRequest), so the better-behaved client is not forced into the
 * URL-borne credential.
 *
 * THREE CONSEQUENCES, ALL HANDLED HERE:
 *
 *  1. The path is a secret, so it must never be logged. Every row this route
 *     writes goes through redactConnectionPath first. Getting this wrong would
 *     put live credentials in agent_requests, which is read by an admin page.
 *  2. A bad key gets 401 with a WWW-Authenticate header, per the spec's error
 *     table, and the SAME 401 whether the key is malformed, unknown, revoked or
 *     belongs to a deleted member. Telling those apart helps only someone
 *     probing.
 *  3. The refusal is still recorded. A revoked key being hammered by a
 *     connector the owner forgot to remove is exactly the thing worth seeing,
 *     and it is invisible if refusals write nothing.
 *
 * The key authenticates; it does not authorise publishing. Its scopes are read
 * and propose, and a proposal is a pending row the owner approves on the site.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const logPath = redactConnectionPath(`/mcp/k/${key || ""}`);

  const presented = keyFromRequest({
    pathKey: key,
    authorization: request.headers.get("authorization"),
  });

  let identity = null;
  try {
    identity = presented ? await resolveConnectionKey(presented) : null;
  } catch (err) {
    /**
     * Resolution needs the service-role key. A missing or broken one is a
     * deployment fault, not a bad credential, and answering 401 would send the
     * owner off to regenerate a link that was never the problem. 503 says the
     * server cannot answer right now, which is the truth.
     */
    console.error("[mcp] key resolution failed:", err);
    return NextResponse.json(
      { error: "ShearQuery cannot check connections right now. Try again shortly." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!identity) {
    recordAgentRequest({
      surface: "mcp",
      path: logPath,
      userAgent: request.headers.get("user-agent"),
      clientIp: clientIpFrom(request.headers),
      statusCode: 401,
      isError: true,
    });
    return NextResponse.json(
      {
        error:
          "This ShearQuery connection link is not valid. It may have been revoked or replaced — " +
          `generate a new one at ${SITE_URL}/account/claude.`,
      },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": `Bearer realm="ShearQuery MCP", error="invalid_token"`,
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return handleMcpPost(request, { logPath, identity });
}

/**
 * No SSE stream here either. Unlike /mcp this body says almost nothing: the URL
 * it was reached through is a credential, and a helpful page is exactly what
 * gets pasted into a screenshot or a support chat.
 */
export async function GET() {
  return new NextResponse(
    "ShearQuery MCP server (private connection). POST JSON-RPC here; there is nothing to view.\n" +
      "Keep this URL private — it identifies your account.\n",
    {
      status: 405,
      headers: {
        Allow: "POST",
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        // A private URL has no business in a search index, and a client that
        // renders it should not follow anything from it either.
        "X-Robots-Tag": "noindex, nofollow",
      },
    }
  );
}

export async function DELETE() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
