import { NextRequest, NextResponse } from "next/server";
import { MCP_TOOLS } from "@/lib/mcp/tools";
import { handleMcpPost } from "@/lib/mcp/handler";
import { SITE_URL } from "@/lib/site";

/**
 * MCP endpoint — Streamable HTTP transport, stateless, ANONYMOUS.
 *
 * The protocol work lives in lib/mcp/handler.ts, shared with the per-owner
 * endpoint at /mcp/k/<key>. This file is the public door: no identity, so the
 * handler exposes only the tools that answer industry questions. Owner-scoped
 * tools are absent from the list here and refused by name if asked for.
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

export async function POST(request: NextRequest) {
  return handleMcpPost(request, { logPath: "/mcp", identity: null });
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
    "  A connection URL of your own adds tools that answer about YOUR profile —",
    "  its audit score, its reviews, and drafts of changes to it. Nothing is",
    "  published without your approval on the site.",
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
