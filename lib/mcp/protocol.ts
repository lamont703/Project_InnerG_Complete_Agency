/**
 * MCP protocol version negotiation.
 *
 * WHY THIS IS ITS OWN FILE. On 2026-09-22 a real Claude connector could not add
 * this server, and the only evidence was one row in agent_requests: HTTP 400,
 * no method, user agent python-httpx. The handler had rejected the request on
 * its version header before parsing the body. The logic that did that was four
 * lines buried in a route, untestable without a running server. It is here so
 * it can be asserted.
 *
 * TWO ERAS, AND THE DIFFERENCE IS NOT COSMETIC. Verified against the spec on
 * 2026-09-22:
 *
 *   LEGACY  (2025-11-25 and earlier) — a client opens with an `initialize`
 *           handshake and the server answers with the version it chose.
 *   MODERN  (2026-07-28, the CURRENT revision) — there is no handshake. Every
 *           request declares its own version, in `_meta` and in the
 *           MCP-Protocol-Version header, and the server accepts or rejects each
 *           request on its own. `server/discover` replaces `initialize`, and
 *           servers MUST implement it.
 *
 * WHAT WE SERVE. Both. The modern revision is what claude.ai speaks, and legacy
 * is what a lot of installed clients still speak, including anything pinned to
 * 2025-06-18. Our surface is tools-only with no sessions and no server-initiated
 * messages, so the same handlers satisfy both eras — the difference is the
 * envelope, not the work.
 *
 * THE RULE THAT WAS BROKEN, quoted from the Streamable HTTP binding:
 *
 *   "If the server does not implement the requested protocol version (whether
 *    the version is unknown to the server, or is a known version the server has
 *    chosen not to support), it MUST respond with 400 Bad Request and an
 *    UnsupportedProtocolVersionError listing its supported versions."
 *
 * The status was right and the body was wrong, and the body is the half that
 * matters: a dual-era client inspects it, and "if the body contains a recognized
 * modern JSON-RPC error… retry using the advertised `supported` versions —
 * rather than falling back." Ours was `{"error":"Unsupported …"}`, which is not
 * a JSON-RPC error, so the client had nothing to retry with and gave up.
 */

/** The current revision. Per-request metadata, `server/discover`, no sessions. */
export const MODERN_PROTOCOL_VERSIONS = ["2026-07-28"] as const;

/**
 * Handshake-based revisions we answer.
 *
 * 2025-11-25 is the last legacy revision and is listed because our wire shape
 * is identical across all three for a tools-only server — same `initialize`,
 * same `tools/list`, same `tools/call`. Nothing we emit changed between them.
 */
export const LEGACY_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"] as const;

/** What the `supported` list in an UnsupportedProtocolVersionError advertises. */
export const SUPPORTED_PROTOCOL_VERSIONS: string[] = [
  ...MODERN_PROTOCOL_VERSIONS,
  ...LEGACY_PROTOCOL_VERSIONS,
];

/**
 * What a legacy `initialize` gets when the client asked for something we do not
 * answer. Kept at 2025-06-18 rather than the newest legacy revision because it
 * is the version this server has been shipping and is the safest floor.
 */
export const DEFAULT_LEGACY_VERSION = "2025-06-18";

/** The `_meta` key that carries a modern request's version. */
export const META_VERSION_KEY = "io.modelcontextprotocol/protocolVersion";
export const META_SERVER_INFO_KEY = "io.modelcontextprotocol/serverInfo";

/**
 * Error codes from the range the MCP spec reserves for itself. These are not
 * JSON-RPC's own codes and must not be invented — they are what a client
 * pattern-matches on to tell a modern server from a legacy one.
 */
export const MCP_HEADER_MISMATCH = -32020;
export const MCP_UNSUPPORTED_PROTOCOL_VERSION = -32022;

export type ProtocolEra = "modern" | "legacy";

export type Negotiation =
  | { ok: true; era: ProtocolEra; version: string }
  | {
      ok: false;
      /** HTTP status to answer with — 400 for both failures here. */
      status: 400;
      code: typeof MCP_HEADER_MISMATCH | typeof MCP_UNSUPPORTED_PROTOCOL_VERSION;
      message: string;
      data?: Record<string, unknown>;
    };

/**
 * Decide which era and version a request is speaking, or why it cannot be
 * served.
 *
 * ABSENT VERSION IS LEGACY, NOT AN ERROR. The binding permits it: "A server
 * that supports clients implementing protocol versions earlier than 2025-06-18
 * (which did not define the MCP-Protocol-Version header) MAY treat a request
 * that omits the header as protocol version 2025-03-26." We do support those
 * clients, so we take the permission.
 *
 * MISMATCH IS STRICT, ABSENCE IS NOT — a deliberate narrowing of the spec's
 * header validation, and the reason is the reason the rule exists. Header
 * validation protects against an intermediary routing on the header while the
 * server executes the body; that only bites when both values exist and disagree.
 * Rejecting a request because a header is merely *missing* is how this server
 * refused a working client once already, so it does not do that again.
 */
export function negotiateProtocol(args: {
  headerVersion?: string | null;
  metaVersion?: unknown;
}): Negotiation {
  const header = typeof args.headerVersion === "string" ? args.headerVersion.trim() : "";
  const meta = typeof args.metaVersion === "string" ? args.metaVersion.trim() : "";

  if (header && meta && header !== meta) {
    return {
      ok: false,
      status: 400,
      code: MCP_HEADER_MISMATCH,
      message: `Header mismatch: MCP-Protocol-Version header value '${header}' does not match body value '${meta}'`,
    };
  }

  const declared = header || meta;
  if (!declared) return { ok: true, era: "legacy", version: DEFAULT_LEGACY_VERSION };

  if ((MODERN_PROTOCOL_VERSIONS as readonly string[]).includes(declared)) {
    return { ok: true, era: "modern", version: declared };
  }
  if ((LEGACY_PROTOCOL_VERSIONS as readonly string[]).includes(declared)) {
    return { ok: true, era: "legacy", version: declared };
  }

  return {
    ok: false,
    status: 400,
    code: MCP_UNSUPPORTED_PROTOCOL_VERSION,
    message: "Unsupported protocol version",
    // The client reads `supported` and retries with one of these. Dropping this
    // field is what turned a recoverable mismatch into a dead end.
    data: { supported: SUPPORTED_PROTOCOL_VERSIONS, requested: declared },
  };
}

/**
 * The version a legacy `initialize` answers with: the client's own if we speak
 * it, otherwise our floor. The client then sends that value on every later
 * request, which is why it must be one of ours.
 */
export function negotiatedInitializeVersion(clientVersion: unknown): string {
  return typeof clientVersion === "string" &&
    (LEGACY_PROTOCOL_VERSIONS as readonly string[]).includes(clientVersion)
    ? clientVersion
    : DEFAULT_LEGACY_VERSION;
}
