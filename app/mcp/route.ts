import { NextRequest, NextResponse } from "next/server";
import { TOOL_BY_NAME, toolDescriptors } from "@/lib/mcp/tools";

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
  "https://agency.innergcomplete.com",
  "https://shearquery.com",
  "https://www.shearquery.com",
];

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

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  const requested = request.headers.get("mcp-protocol-version");
  if (requested && !SUPPORTED_PROTOCOL_VERSIONS.includes(requested)) {
    return NextResponse.json(
      { error: `Unsupported MCP-Protocol-Version: ${requested}` },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await request.json();
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
    return new NextResponse(null, { status: 202 });
  }

  const { id, method, params } = body;

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
 */
export async function GET() {
  return new NextResponse("This MCP endpoint does not offer a server-initiated SSE stream.", {
    status: 405,
    headers: { Allow: "POST", "Content-Type": "text/plain; charset=utf-8" },
  });
}

/** No sessions to terminate, so there is nothing for DELETE to do. */
export async function DELETE() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
