import { createHash } from "node:crypto";
import type { McpScope } from "@/lib/mcp/connection";

/**
 * The pure half of ShearQuery's OAuth server for MCP: every check that decides
 * whether a sign-in may proceed, with no network and no database, so each one
 * is tested on its own in oauth-rules.test.ts.
 *
 * Sources, fetched 2026-09-28 — read these, not memory, before changing a rule:
 *   MCP authorization (2026-07-28 revision):
 *     https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization
 *   Claude's client behaviour:
 *     https://claude.com/docs/connectors/building/authentication
 *     https://claude.com/docs/connectors/building/lazy-authentication
 */

/** OAuth scope strings are the same words as connection-key scopes. One vocabulary, not a mapping to drift. */
export const OAUTH_SCOPES: McpScope[] = ["read", "propose", "publish"];

/**
 * Scopes asked for on the first 401.
 *
 * The full set, deliberately, rather than the least the first tool needs. The
 * spec allows either; asking for "read" first would send an owner through a
 * second sign-in the moment Claude drafts anything, and a third to publish.
 * The consent screen is where least privilege happens instead: publishing is a
 * checkbox the owner can untick, and a later publish then steps up with a 403.
 */
export const CHALLENGE_SCOPES: McpScope[] = ["read", "propose", "publish"];

export function parseScopes(raw: unknown): McpScope[] {
  const words = String(raw ?? "").split(/\s+/).filter(Boolean);
  return OAUTH_SCOPES.filter((s) => words.includes(s));
}

/** What a tool call needs from a token. Every owner tool needs read; writers add their own. */
export function scopesForTool(tool: { requiresIdentity?: boolean; requiresScope?: McpScope }): McpScope[] {
  if (!tool.requiresIdentity) return [];
  return tool.requiresScope && tool.requiresScope !== "read" ? ["read", tool.requiresScope] : ["read"];
}

// ── client identity ─────────────────────────────────────────────────────────

/**
 * Is this client_id a URL we are willing to fetch?
 *
 * A Client ID Metadata Document client_id MUST be https with a path. The rest
 * is SSRF protection, because fetching a caller-chosen URL from our server is
 * the classic way to make a server read its own internal network: no IP
 * literals, no localhost, no ports other than 443, no credentials in the URL.
 * DNS rebinding to a private address is checked separately at fetch time,
 * where the resolved address is known.
 */
export function checkClientIdUrl(raw: unknown): { ok: true; url: URL } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(String(raw ?? ""));
  } catch {
    return { ok: false, reason: "client_id is not a URL" };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "client_id must use https" };
  if (url.username || url.password) return { ok: false, reason: "client_id must not carry credentials" };
  if (url.port && url.port !== "443") return { ok: false, reason: "client_id must be on the default https port" };
  if (!url.pathname || url.pathname === "/") return { ok: false, reason: "client_id must have a path" };
  if (url.hash) return { ok: false, reason: "client_id must not have a fragment" };
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return { ok: false, reason: "client_id must be on a public host" };
  }
  if (/^[\d.]+$/.test(host) || host.includes(":") || host.startsWith("[")) {
    return { ok: false, reason: "client_id must use a hostname, not an IP address" };
  }
  return { ok: true, url };
}

/** Private, loopback, link-local and similar ranges — never fetched. */
export function isPrivateAddress(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::" || v.startsWith("fe80:") || v.startsWith("fc") || v.startsWith("fd")) return true;
  const mapped = v.startsWith("::ffff:") ? v.slice(7) : v;
  const parts = mapped.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n))) return false;
  const [a, b] = parts;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

export interface ClientMetadata {
  client_id: string;
  client_name?: string;
  redirect_uris: string[];
}

/** The document must name itself by the exact URL it was fetched from, and list its redirect URIs. */
export function checkClientMetadata(doc: unknown, clientId: string): { ok: true; meta: ClientMetadata } | { ok: false; reason: string } {
  if (!doc || typeof doc !== "object") return { ok: false, reason: "client metadata is not a JSON object" };
  const d = doc as Record<string, unknown>;
  if (d.client_id !== clientId) return { ok: false, reason: "client metadata client_id does not match its URL" };
  if (!Array.isArray(d.redirect_uris) || !d.redirect_uris.length || !d.redirect_uris.every((u) => typeof u === "string")) {
    return { ok: false, reason: "client metadata has no redirect_uris" };
  }
  return {
    ok: true,
    meta: {
      client_id: clientId,
      client_name: typeof d.client_name === "string" ? d.client_name.slice(0, 80) : undefined,
      redirect_uris: d.redirect_uris as string[],
    },
  };
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isLoopback(uri: string): boolean {
  try {
    const u = new URL(uri);
    return u.protocol === "http:" && LOOPBACK_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Exact redirect URI match, with one exception the spec and Claude both need:
 * a loopback redirect matches whatever port the native client bound.
 *
 * Claude Code declares http://localhost/callback and http://127.0.0.1/callback
 * and connects on an ephemeral port, so both are matched with the port ignored
 * (RFC 8252 section 7.3, extended to localhost per Claude's docs). Everything
 * else must match character for character — a prefix or pattern match is how
 * an open redirect gets in.
 */
export function redirectUriAllowed(requested: string, registered: string[]): boolean {
  if (!requested) return false;
  if (registered.includes(requested)) {
    try {
      const u = new URL(requested);
      return u.protocol === "https:" || isLoopback(requested);
    } catch {
      return false;
    }
  }
  if (!isLoopback(requested)) return false;
  const req = new URL(requested);
  return registered.some((r) => {
    if (!isLoopback(r)) return false;
    const reg = new URL(r);
    return (
      reg.hostname.toLowerCase() === req.hostname.toLowerCase() &&
      reg.pathname === req.pathname &&
      reg.search === req.search
    );
  });
}

// ── PKCE, resource, tokens ──────────────────────────────────────────────────

/** RFC 7636: 43–128 characters from the unreserved set. */
export function isValidVerifier(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9\-._~]{43,128}$/.test(v);
}

export function isValidChallenge(c: unknown): c is string {
  return typeof c === "string" && /^[A-Za-z0-9_-]{43}$/.test(c);
}

export function pkceMatches(verifier: string, challenge: string): boolean {
  return createHash("sha256").update(verifier).digest("base64url") === challenge;
}

/**
 * The canonical MCP resource for an origin, and whether a presented resource
 * names it. Case-insensitive on scheme and host (the spec asks servers to be
 * lenient there), strict on path, and a trailing slash is tolerated.
 */
export function resourceFor(origin: string): string {
  return `${origin.replace(/\/+$/, "")}/mcp`;
}

export function resourceMatches(presented: unknown, canonical: string): boolean {
  try {
    const p = new URL(String(presented ?? ""));
    const c = new URL(canonical);
    if (p.hash || p.search) return false;
    return (
      p.protocol === c.protocol &&
      p.host.toLowerCase() === c.host.toLowerCase() &&
      p.pathname.replace(/\/+$/, "") === c.pathname.replace(/\/+$/, "")
    );
  } catch {
    return false;
  }
}

export const hashSecret = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

/** RFC 6750 challenge. Values are ours, but quoted defensively. */
export function wwwAuthenticate(args: {
  metadataUrl: string;
  scopes?: McpScope[];
  error?: "invalid_token" | "insufficient_scope";
  description?: string;
}): string {
  const q = (v: string) => `"${v.replace(/["\\]/g, "")}"`;
  return [
    "Bearer " + (args.error ? `error=${q(args.error)}` : `resource_metadata=${q(args.metadataUrl)}`),
    args.error ? `resource_metadata=${q(args.metadataUrl)}` : null,
    args.description ? `error_description=${q(args.description)}` : null,
    args.scopes?.length ? `scope=${q(args.scopes.join(" "))}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}
