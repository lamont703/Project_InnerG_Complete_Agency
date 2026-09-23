import { NextRequest, NextResponse } from "next/server";
import { TOOL_BY_NAME, toolDescriptors, type McpToolContext } from "@/lib/mcp/tools";
import { SITE_URL } from "@/lib/site";
import { recordAgentRequest, clientIpFrom } from "@/lib/agent-requests";
import type { McpIdentity } from "@/lib/mcp/connection";

/**
 * The MCP request handler, shared by both endpoints.
 *
 * TWO ROUTES, ONE HANDLER, AND THAT IS THE POINT.
 *   /mcp             — anonymous. Industry data: pass rates, booth rent, counts.
 *   /mcp/k/<key>     — one owner. Everything above, plus their own listing.
 *
 * The protocol, the limits, the logging and the error shapes are identical, so
 * they live here once. The only difference the handler sees is whether `ctx`
 * carries an identity, and that single fact decides which tools exist for the
 * call. Keeping this in one place is what stops the anonymous endpoint quietly
 * drifting away from the keyed one — a divergence that would show up as an
 * owner-scoped tool reachable without a key.
 *
 * Spec conformance (2025-06-18), each verified against the transport doc:
 *   - single path serving POST and GET
 *   - a JSON-RPC *request* may be answered with one application/json object
 *   - a *notification* or *response* MUST get 202 Accepted with no body
 *   - GET MUST return text/event-stream or 405; we offer no stream, so 405
 *   - Origin MUST be validated (DNS-rebinding defence)
 *   - an unsupported MCP-Protocol-Version MUST be 400
 */

export const SERVER_NAME = "com.innergcomplete/shearquery";
export const SERVER_VERSION = "0.2.0";

/** Versions whose wire format this handler actually implements. */
const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26"];
const DEFAULT_PROTOCOL_VERSION = "2025-06-18";

/**
 * Browser origins allowed to reach this endpoint. The spec requires Origin
 * validation to stop a page the user is visiting from driving a local MCP
 * server. Non-browser clients (the ones that actually matter here) send no
 * Origin at all, which is permitted.
 */
const ALLOWED_ORIGINS = [SITE_URL, "https://shearquery.com", "https://www.shearquery.com"];

/**
 * A JSON-RPC message for these tools has no legitimate reason to be large.
 * Without a cap, a 200KB argument was accepted, processed, and echoed back in
 * full — an amplifier that costs us function time and bandwidth for every byte
 * an attacker sends.
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

/**
 * Keyed requests are counted against the KEY, not the IP.
 *
 * An owner's Claude session comes from Anthropic's infrastructure, so several
 * unrelated owners can share an egress IP — bucketing them together would let
 * one busy owner throttle strangers. The key is the account being served, which
 * is the thing worth limiting.
 */
function rateLimited(request: NextRequest, identity: McpIdentity | null): boolean {
  const bucket = identity
    ? `key:${identity.keyId}`
    : `ip:${
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown"
      }`;
  const now = Date.now();
  const recent = (hits.get(bucket) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  hits.set(bucket, recent);
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

export interface McpRequestContext {
  /**
   * What goes in the request log. For a keyed route this MUST already be
   * redacted — the handler does not know the key and cannot redact it here. See
   * redactConnectionPath in lib/mcp/connection.ts.
   */
  logPath: string;
  identity: McpIdentity | null;
}

const PUBLIC_INSTRUCTIONS =
  "Barber and beauty industry data for Texas and beyond: school licensing-exam pass rates, " +
  "barbershop and salon booth rent with chair availability, Texas licensee counts, and a " +
  "public Google Business Profile audit for any listed business. Figures come from state " +
  "licensing records and owner-reported listings, and each response states its own coverage — " +
  "quote those caveats when citing a number.";

/**
 * What the model is told when a key IS present.
 *
 * The last sentence is the important one and it is not decoration: the propose
 * tools do not publish. A model that believes it just changed someone's Google
 * profile will report that to the owner, who then stops looking for the
 * approval step and wonders why nothing happened on Google.
 */
const OWNER_INSTRUCTIONS =
  PUBLIC_INSTRUCTIONS +
  " This connection is authenticated as one business owner, so the my_* tools answer about " +
  "their own listing. Changes you draft are NOT published: every propose_* tool queues a " +
  "pending change that the owner must approve on shearquery.com before anything reaches " +
  "Google. Tell them that approval is still required, and never claim a change is live.";

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
export async function handleMcpPost(request: NextRequest, ctx: McpRequestContext): Promise<NextResponse> {
  const startedAt = Date.now();
  const userAgent = request.headers.get("user-agent");
  const clientIp = clientIpFrom(request.headers);
  const toolContext: McpToolContext = { identity: ctx.identity };

  const log = (fields: {
    mcpMethod?: string | null;
    toolName?: string | null;
    toolArguments?: unknown;
    statusCode: number;
    isError?: boolean;
  }) =>
    recordAgentRequest({
      surface: "mcp",
      path: ctx.logPath,
      userAgent,
      clientIp,
      durationMs: Date.now() - startedAt,
      ...fields,
    });

  if (!originAllowed(request)) {
    log({ statusCode: 403, isError: true });
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  if (rateLimited(request, ctx.identity)) {
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
    return NextResponse.json({ error: `Unsupported MCP-Protocol-Version: ${requested}` }, { status: 400 });
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
          instructions: ctx.identity ? OWNER_INSTRUCTIONS : PUBLIC_INSTRUCTIONS,
        });
      }

      case "ping":
        return rpcResult(id, {});

      case "tools/list":
        return rpcResult(id, { tools: toolDescriptors(toolContext) });

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

        /**
         * The gate. An owner-scoped tool is not in the anonymous tool list at
         * all, but a client can still name one directly — tool lists get cached,
         * and a model that saw the list on a keyed connection can carry the name
         * to an unkeyed one. Checked here rather than inside each handler,
         * because a handler that forgets is a data leak and this cannot be
         * forgotten in one place.
         */
        if (tool.requiresIdentity && !ctx.identity) {
          return rpcResult(id, {
            content: [
              {
                type: "text",
                text:
                  `"${tool.name}" answers about one specific business, so it needs that owner's own ` +
                  `connection. This connection is the public one. The owner can generate their ` +
                  `connection URL at ${SITE_URL}/account/claude and add that instead of ${SITE_URL}/mcp.`,
              },
            ],
            isError: true,
          });
        }

        try {
          const text = await tool.handler(params?.arguments ?? {}, toolContext);
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
