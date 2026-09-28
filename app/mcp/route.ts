import { NextRequest, NextResponse } from "next/server";
import { MCP_TOOLS } from "@/lib/mcp/tools";
import { handleMcpPost } from "@/lib/mcp/handler";
import { keyFromRequest, resolveConnectionKey } from "@/lib/mcp/connection";
import { recordAgentRequest, clientIpFrom } from "@/lib/agent-requests";
import { SITE_URL } from "@/lib/site";
import { resolveAccessToken } from "@/lib/mcp/oauth";
import { resourceFor, wwwAuthenticate } from "@/lib/mcp/oauth-rules";
import { originOf, resourceMetadataUrl } from "@/lib/mcp/oauth-metadata";

/**
 * MCP endpoint — Streamable HTTP transport, stateless.
 *
 * The protocol work lives in lib/mcp/handler.ts, shared with the per-owner
 * endpoint at /mcp/k/<key>. This is the one URL owners add: anonymous callers
 * get the industry tools, and the owner tools answer 401 until the owner signs
 * in to ShearQuery through Claude (OAuth, lib/mcp/oauth.ts). A connection key
 * in the Authorization header still works, for Claude Code setups made before
 * sign-in existed.
 *
 * Implements the transport directly rather than pulling in the SDK: the SDK's
 * HTTP transport is built around Node's req/res, while App Router handlers get
 * a Web Request, and this server needs none of what that adapter buys —
 * no sessions, no server-initiated messages, no resumability.
 *
 * Stateless is also what makes it correct on serverless: there is no instance
 * to pin a session to, so no Mcp-Session-Id is issued and every request stands
 * alone.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Anonymous by default, and owner-scoped when an `Authorization: Bearer sq_…`
 * header is presented.
 *
 * WHY THIS ENDPOINT ACCEPTS A KEY AT ALL, when /mcp/k/<key> exists. Claude's
 * connector setup offers a "Request headers" box whose values are "stored
 * securely and never shown again". That is a strictly better home for a
 * credential than a URL: a URL gets pasted into screenshots, support chats and
 * bug reports — which happened three times while this feature was being built —
 * while a stored header does not. So the recommended install is this plain URL
 * plus a header, and the keyed URL stays for clients with no header field.
 *
 * A BAD KEY IS 401, NOT A QUIET FALLBACK TO PUBLIC. Serving anonymous results
 * to someone who presented a credential would look like success: the tools work,
 * the owner's own tools are missing, and nothing says why. That is a worse
 * failure than being refused.
 *
 * A BEARER TOKEN THAT IS NOT OURS IS IGNORED. Only `sq_`-shaped values are
 * treated as an attempt to authenticate here; anything else is some other
 * system's token that we have no business inspecting, and the caller gets the
 * public tools.
 */
export async function POST(request: NextRequest) {
  const origin = originOf(request);
  const oauth = { metadataUrl: resourceMetadataUrl(origin) };
  const authorization = request.headers.get("authorization");
  const presented = keyFromRequest({ authorization });

  /**
   * OAUTH, THE WAY OWNERS CONNECT NOW. Any bearer value that is not a
   * connection key is treated as one of our access tokens and validated —
   * the spec requires an invalid or expired token to get a 401, which is what
   * tells Claude to refresh or sign in again. (This used to ignore non-sq_
   * tokens and serve the public tools, which was right before this server
   * issued tokens of its own.)
   */
  const bearer = /^Bearer\s+(\S+)$/i.exec((authorization || "").trim())?.[1];
  if (!presented && bearer) {
    let resolved;
    try {
      resolved = await resolveAccessToken(bearer, resourceFor(origin));
    } catch (err) {
      console.error("[mcp] token resolution failed:", err);
      return NextResponse.json(
        { error: "ShearQuery cannot check sign-ins right now. Try again shortly." },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (!resolved.ok) {
      recordAgentRequest({
        surface: "mcp", path: "/mcp", userAgent: request.headers.get("user-agent"),
        clientIp: clientIpFrom(request.headers), statusCode: 401, isError: true,
      });
      return NextResponse.json(
        { error: "invalid_token", error_description: resolved.reason },
        {
          status: 401,
          headers: {
            "WWW-Authenticate": wwwAuthenticate({ metadataUrl: oauth.metadataUrl, error: "invalid_token", description: resolved.reason }),
            "Cache-Control": "no-store",
          },
        }
      );
    }
    return handleMcpPost(request, { logPath: "/mcp", identity: resolved.identity, oauth });
  }

  // Anonymous: public tools answer, and an owner tool answers 401 so Claude
  // shows its Connect card — lazy authentication.
  if (!presented) return handleMcpPost(request, { logPath: "/mcp", identity: null, oauth });

  let identity = null;
  try {
    identity = await resolveConnectionKey(presented);
  } catch (err) {
    // Service-role key missing or Supabase unreachable: a deployment fault, not
    // a bad credential. 503 rather than 401, so nobody regenerates a working
    // connection chasing this.
    console.error("[mcp] key resolution failed:", err);
    return NextResponse.json(
      { error: "ShearQuery cannot check connections right now. Try again shortly." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!identity) {
    recordAgentRequest({
      surface: "mcp",
      path: "/mcp",
      userAgent: request.headers.get("user-agent"),
      clientIp: clientIpFrom(request.headers),
      statusCode: 401,
      isError: true,
    });
    return NextResponse.json(
      {
        error:
          "That ShearQuery connection key is not valid. It may have been revoked or replaced — " +
          `generate a new one at ${SITE_URL}/account/claude. To use ShearQuery without an account, ` +
          "send no Authorization header.",
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

  // Logged as /mcp, which is the real path. There is no key in it to redact —
  // that is the advantage of the header.
  return handleMcpPost(request, { logPath: "/mcp", identity });
}

/**
 * The spec allows a server with no server-initiated messages to refuse the SSE
 * stream outright, and 405 is the documented way to say so.
 *
 * The STATUS is non-negotiable; the body is ours. People do land here — the URL
 * is published in the MCP registry, and a listing invites a click. A bare
 * "no SSE stream" tells a human nothing about what they found, so the body
 * explains it while the status keeps protocol clients correct. Both audiences
 * are served by the same response, which is why this isn't a redirect.
 */
export async function GET() {
  const body = [
    "ShearQuery MCP server",
    "=====================",
    "",
    "You've reached a Model Context Protocol endpoint. It speaks JSON-RPC over",
    "HTTP POST, so there is nothing here for a browser to render — this 405 is",
    "the endpoint working correctly, not an error.",
    "",
    "WHAT IT DOES",
    "",
    ...MCP_TOOLS.filter((t) => !t.requiresIdentity).map((t) => `  ${t.name}\n    ${t.title}`),
    "",
    "USE IT",
    "",
    "  Add this URL to any MCP client:",
    `    ${SITE_URL}/mcp`,
    "",
    "  Or from a terminal:",
    `    curl -X POST ${SITE_URL}/mcp \\`,
    "      -H 'Content-Type: application/json' \\",
    `      -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
    "",
    "  Registry: https://registry.modelcontextprotocol.io  (com.innergcomplete/shearquery)",
    "",
    "IF YOU OWN A LISTED BUSINESS",
    "",
    "  The same URL manages YOUR Google profile — its audit, reviews, hours,",
    "  posts and photos. The first time Claude reaches one of those tools it",
    "  asks you to sign in to ShearQuery. Nothing is published without your OK.",
    `    ${SITE_URL}/account/claude`,
    "",
    "THE DATA BEHIND IT",
    "",
    `  Barber & cosmetology school exam outcomes  ${SITE_URL}/compare-schools`,
    `  Booth rent and chairs available            ${SITE_URL}/compare-shops`,
    `  Texas licence renewal guidance             ${SITE_URL}/texas-barber-license-renewal`,
    "",
  ].join("\n");

  return new NextResponse(body, {
    status: 405,
    headers: {
      Allow: "POST",
      "Content-Type": "text/plain; charset=utf-8",
      // Nothing here is per-request, and a human refreshing shouldn't cost a
      // function invocation.
      "Cache-Control": "public, max-age=3600",
    },
  });
}

/** No sessions to terminate, so there is nothing for DELETE to do. */
export async function DELETE() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
