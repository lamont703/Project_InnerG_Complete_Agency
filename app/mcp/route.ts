import { NextRequest, NextResponse } from "next/server";
import { MCP_TOOLS, TOOL_BY_NAME, toolDescriptors } from "@/lib/mcp/tools";
import { SITE_URL } from "@/lib/site";
import { recordAgentRequest, clientIpFrom } from "@/lib/agent-requests";

/**
 * MCP endpoint — Streamable HTTP transport, stateless.
 *
 * Implements the transport directly rather than pulling in the SDK: the SDK's
 * HTTP transport is built around Node's req/res, while App Router handlers get
 * a Web Request, and this server needs none of what that adapter buys —
 * no sessions, no server-initiated messages, no resumability. Three read-only
 * tools over request/response is the whole surface.
 *
 * Stateless is also what makes it correct on serverless: there is no instance
 * to pin a session to, so no Mcp-Session-Id is issued and every request stands
 * alone.
 *
 * Spec conformance (2025-06-18), each verified against the transport doc:
 *   - single path serving POST and GET
 *   - a JSON-RPC *request* may be answered with one application/json object
 *   - a *notification* or *response* MUST get 202 Accepted with no body
 *   - GET MUST return text/event-stream or 405; we offer no stream, so 405
 *   - Origin MUST be validated (DNS-rebinding defence)
 *   - an unsupported MCP-Protocol-Version MUST be 400
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SERVER_NAME = "com.innergcomplete/shearquery";
const SERVER_VERSION = "0.1.0";

/** Versions whose wire format this handler actually implements. */
const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26"];
const DEFAULT_PROTOCOL_VERSION = "2025-06-18";

/**
 * Browser origins allowed to reach this endpoint. The spec requires Origin
 * validation to stop a page the user is visiting from driving a local MCP
 * server. Non-browser clients (the ones that actually matter here) send no
 * Origin at all, which is permitted.
 */
const ALLOWED_ORIGINS = [
  SITE_URL,
  "https://shearquery.com",
  "https://www.shearquery.com",
];

/**
 * A JSON-RPC message for three read-only tools has no legitimate reason to be
 * large. Without a cap, a 200KB argument was accepted, processed, and echoed
 * back in full — an amplifier that costs us function time and bandwidth for
 * every byte an attacker sends.
 */
const MAX_BODY_BYTES = 32 * 1024;

/**
 * Best-effort throttle. Serverless makes this partial by nature: memory is
 * per-instance, so a distributed flood spreads across instances and slips
 * through. It is kept anyway because the realistic abuse here is one client
 * looping against one warm instance, which this does stop — and it is stated
 * plainly rather than mistaken for real protection. Durable limiting needs
 * Vercel WAF or a shared store.
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const hits = new Map<string, number[]>();

function rateLimited(request: NextRequest): boolean {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  // Unbounded growth would be its own denial of service; drop idle keys.
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < RATE_LIMIT_WINDOW_MS)) hits.delete(k);
  }
  return recent.length > RATE_LIMIT_MAX;
}

const JSONRPC_PARSE_ERROR = -32700;
const JSONRPC_INVALID_REQUEST = -32600;
const JSONRPC_METHOD_NOT_FOUND = -32601;
const JSONRPC_INVALID_PARAMS = -32602;
const JSONRPC_INTERNAL_ERROR = -32603;

function rpcError(id: unknown, code: number, message: string) {
  return NextResponse.json(
    { jsonrpc: "2.0", id: id ?? null, error: { code, message } },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

function rpcResult(id: unknown, result: unknown) {
  return NextResponse.json(
    { jsonrpc: "2.0", id, result },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

function originAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser client
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Every POST leaves a row, including the ones that are refused.
 *
 * A rejection is not noise here — it is the only way to see a client that
 * tried and could not get in. An MCP server that silently 403s a caller and
 * records nothing looks identical, from the dashboard, to one nobody has ever
 * called. Those are opposite facts and they demand opposite responses.
 *
 * Never awaited: see lib/agent-requests.ts on why the response is not held
 * open for the write.
 */
export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const userAgent = request.headers.get("user-agent");
  const clientIp = clientIpFrom(request.headers);
  const log = (fields: {
    mcpMethod?: string | null;
    toolName?: string | null;
    toolArguments?: unknown;
    statusCode: number;
    isError?: boolean;
  }) =>
    recordAgentRequest({
      surface: "mcp",
      path: "/mcp",
      userAgent,
      clientIp,
      durationMs: Date.now() - startedAt,
      ...fields,
    });

  if (!originAllowed(request)) {
    log({ statusCode: 403, isError: true });
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  if (rateLimited(request)) {
    log({ statusCode: 429, isError: true });
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // Checked before reading the body so an oversized payload is refused rather
  // than buffered.
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) {
    log({ statusCode: 413, isError: true });
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  const requested = request.headers.get("mcp-protocol-version");
  if (requested && !SUPPORTED_PROTOCOL_VERSIONS.includes(requested)) {
    log({ statusCode: 400, isError: true });
    return NextResponse.json(
      { error: `Unsupported MCP-Protocol-Version: ${requested}` },
      { status: 400 }
    );
  }

  let body: any;
  try {
    // Read as text first: Content-Length can be absent or lie under chunked
    // encoding, so the real length is only knowable after the fact.
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return rpcError(null, JSONRPC_PARSE_ERROR, "Parse error: body is not valid JSON");
  }

  // Batches were removed in 2025-06-18; one message per POST.
  if (Array.isArray(body)) {
    return rpcError(null, JSONRPC_INVALID_REQUEST, "Batched requests are not supported");
  }
  if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return rpcError(body?.id, JSONRPC_INVALID_REQUEST, "Invalid JSON-RPC 2.0 message");
  }

  // No `id` means a notification (or a response). Nothing to reply with, and
  // the spec is explicit that this is 202 with an empty body — returning a
  // JSON-RPC object here is a conformance failure, not a harmless extra.
  const isNotification = body.id === undefined || body.id === null;
  if (isNotification) {
    log({ mcpMethod: typeof body.method === "string" ? body.method : null, statusCode: 202 });
    return new NextResponse(null, { status: 202 });
  }

  const { id, method, params } = body;
  // Logged once here rather than at each return: every branch below answers
  // with HTTP 200 (JSON-RPC carries its own error channel in the body), so the
  // status code distinguishes nothing and the method is what we actually want
  // to count. tools/call adds the tool name and arguments at its own branch.
  if (method !== "tools/call") log({ mcpMethod: typeof method === "string" ? method : null, statusCode: 200 });

  try {
    switch (method) {
      case "initialize": {
        // Echo the client's version when we implement it, otherwise answer with
        // ours and let the client decide whether it can proceed.
        const clientVersion = params?.protocolVersion;
        const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(clientVersion)
          ? clientVersion
          : DEFAULT_PROTOCOL_VERSION;

        return rpcResult(id, {
          protocolVersion,
          // listChanged: false — the tool list is compiled in, so there is
          // nothing to notify about, and claiming otherwise would promise a
          // notification channel this stateless server cannot open.
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: SERVER_NAME, title: "ShearQuery", version: SERVER_VERSION },
          instructions:
            "Barber and beauty industry data for Texas and beyond: school licensing-exam pass rates, " +
            "barbershop and salon booth rent with chair availability, and Texas licensee counts. " +
            "Figures come from state licensing records and owner-reported listings, and each response " +
            "states its own coverage — quote those caveats when citing a number.",
        });
      }

      case "ping":
        return rpcResult(id, {});

      case "tools/list":
        return rpcResult(id, { tools: toolDescriptors() });

      case "tools/call": {
        const name = params?.name;
        const tool = typeof name === "string" ? TOOL_BY_NAME.get(name) : undefined;
        // Recorded before dispatch, so a call for a tool we do not have is
        // still counted. That is the highest-value row in the table: it names
        // a capability a real client came here expecting to find.
        log({
          mcpMethod: "tools/call",
          toolName: typeof name === "string" ? name : null,
          toolArguments: params?.arguments ?? null,
          statusCode: 200,
          isError: !tool,
        });
        if (!tool) {
          // Unknown tool is a PROTOCOL error, distinct from a tool that ran and
          // failed — that one comes back as isError below.
          return rpcError(id, JSONRPC_INVALID_PARAMS, `Unknown tool: ${String(name)}`);
        }

        try {
          const text = await tool.handler(params?.arguments ?? {});
          return rpcResult(id, { content: [{ type: "text", text }], isError: false });
        } catch (err) {
          // Execution failure is reported in the result so the model can see it
          // and adapt, rather than as a transport-level error it cannot read.
          console.error(`[mcp] tool ${tool.name} failed:`, err);
          return rpcResult(id, {
            content: [
              {
                type: "text",
                text: `The "${tool.name}" tool could not complete: ${
                  err instanceof Error ? err.message : "unknown error"
                }`,
              },
            ],
            isError: true,
          });
        }
      }

      default:
        return rpcError(id, JSONRPC_METHOD_NOT_FOUND, `Method not found: ${method}`);
    }
  } catch (err) {
    console.error("[mcp] handler error:", err);
    return rpcError(id, JSONRPC_INTERNAL_ERROR, "Internal server error");
  }
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
    ...MCP_TOOLS.map((t) => `  ${t.name}\n    ${t.title}`),
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
