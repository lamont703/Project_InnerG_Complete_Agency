import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";

/**
 * Connection keys — how the MCP server at /mcp learns WHOSE data it is being
 * asked about.
 *
 * The unauthenticated endpoint answers industry questions: school pass rates,
 * booth rent in a city, licensee counts. Nothing there is anybody's private
 * business. A key changes that: with one, the same endpoint can answer "how is
 * MY profile scoring" and draft changes to MY listing. So the key is the seam
 * between public data and one owner's account, and it is the only thing
 * standing there.
 *
 * WHY IT LIVES IN THE URL. See the migration for the full reasoning; the short
 * version is that claude.ai custom connectors accept a URL and optionally an
 * OAuth client id/secret, and no custom headers. A barber can paste a URL. So
 * the owner copies one line from their account page:
 *
 *     https://shearquery.com/mcp/k/sq_…
 *
 * The Authorization header is ALSO accepted by the keyed route, because Claude
 * Code can send one and a header is the better place for a credential. Same key,
 * two ways in, so the developer path does not need a second concept.
 *
 * THREE RULES THIS MODULE ENFORCES, each because the alternative failed silently
 * somewhere else in this codebase:
 *
 *  1. The plaintext key exists in exactly one place in its life: the response
 *     to the mint call. It is hashed on the way into the database and never
 *     stored, logged or emailed. There is no code path that can return it again.
 *  2. A key in a URL path reaches the request log by default, and this project
 *     logs every MCP request (lib/agent-requests.ts). redactConnectionPath()
 *     exists so the logger records /mcp/k/sq_abcd1234… and not a live
 *     credential sitting in a table we read from an admin page.
 *  3. Resolution is by hash lookup, never by comparing secrets in application
 *     code, and a revoked key cannot resolve — the index that serves the lookup
 *     is partial on revoked_at is null.
 */

/**
 * `sq_` then 32 random bytes as base64url: 43 characters from a 64-symbol
 * alphabet, so 256 bits of entropy. base64url rather than hex because every
 * character it uses is legal in a URL path segment unescaped, and hex would
 * need 64 characters for the same strength.
 */
const KEY_PREFIX = "sq_";
const KEY_BODY_LENGTH = 43;
const KEY_PATTERN = new RegExp(`^${KEY_PREFIX}[A-Za-z0-9_-]{${KEY_BODY_LENGTH}}$`);

/** How much of the key is shown back to its owner so they can tell two apart. */
const DISPLAY_PREFIX_LENGTH = 10;

export type McpScope = "read" | "propose";

/** Who a request is acting for. Absent on the public endpoint. */
export interface McpIdentity {
  memberId: string;
  keyId: string;
  scopes: McpScope[];
  /** For messages back to the model/owner — never the whole key. */
  keyPrefix: string;
}

export interface ConnectionKeyRow {
  id: string;
  keyPrefix: string;
  label: string | null;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

/** A fresh key. Returned to the owner once and never recoverable after that. */
export function newConnectionKey(): string {
  return `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashConnectionKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

export function looksLikeConnectionKey(value: unknown): boolean {
  return typeof value === "string" && KEY_PATTERN.test(value);
}

export function displayPrefix(key: string): string {
  return key.slice(0, DISPLAY_PREFIX_LENGTH);
}

/** The line the owner pastes into Claude. */
export function connectionUrlFor(key: string): string {
  return `${SITE_URL}/mcp/k/${key}`;
}

/**
 * What the request logger is allowed to keep.
 *
 * Anything that looks like a key becomes its display prefix plus an ellipsis,
 * so the row still distinguishes two owners' traffic without holding either
 * one's credential. Applied to the path string rather than to the key, because
 * the logger is handed a path and must not have to know how to find the key
 * inside it.
 */
export function redactConnectionPath(path: string): string {
  return path.replace(
    new RegExp(`${KEY_PREFIX}[A-Za-z0-9_-]{4,}`, "g"),
    (match) => `${match.slice(0, DISPLAY_PREFIX_LENGTH)}…`
  );
}

/**
 * Pull a key out of a keyed request: the path segment, or an Authorization
 * header for clients that can send one. The path wins when both are present,
 * since that is the URL the owner actually installed.
 */
export function keyFromRequest(args: { pathKey?: string | null; authorization?: string | null }): string | null {
  const fromPath = (args.pathKey || "").trim();
  if (looksLikeConnectionKey(fromPath)) return fromPath;

  const header = (args.authorization || "").trim();
  const bearer = /^Bearer\s+(\S+)$/i.exec(header)?.[1];
  if (bearer && looksLikeConnectionKey(bearer)) return bearer;

  return null;
}

function toScopes(raw: unknown): McpScope[] {
  const allowed: McpScope[] = ["read", "propose"];
  const list = Array.isArray(raw) ? raw.map(String) : [];
  // Filtered rather than trusted: a scope string that arrived in the row by any
  // route other than this module's own writes has no meaning here, and silently
  // honouring an unknown one is how a scope system stops being a limit.
  return allowed.filter((s) => list.includes(s));
}

/**
 * Mint a key for a member. Returns the plaintext EXACTLY once.
 *
 * The caller is responsible for having established that the session really is
 * this member — this function does no authentication of its own, and a bug at
 * the call site is indistinguishable from a legitimate mint.
 */
export async function mintConnectionKey(args: {
  memberId: string;
  label?: string | null;
}): Promise<{ key: string; url: string; row: ConnectionKeyRow }> {
  const key = newConnectionKey();
  const admin = createAdminClient();

  const { data, error } = await (admin.from("mcp_connection_keys") as any)
    .insert({
      community_member_id: args.memberId,
      key_hash: hashConnectionKey(key),
      key_prefix: displayPrefix(key),
      label: (args.label || "").trim() || null,
      scopes: ["read", "propose"],
    })
    .select("id, key_prefix, label, scopes, created_at, last_used_at, revoked_at")
    .single();

  if (error || !data) throw new Error(`Could not create a connection key: ${error?.message || "unknown"}`);

  return { key, url: connectionUrlFor(key), row: rowOf(data) };
}

function rowOf(data: any): ConnectionKeyRow {
  return {
    id: data.id,
    keyPrefix: data.key_prefix,
    label: data.label ?? null,
    scopes: Array.isArray(data.scopes) ? data.scopes.map(String) : [],
    createdAt: data.created_at,
    lastUsedAt: data.last_used_at ?? null,
    revokedAt: data.revoked_at ?? null,
  };
}

/**
 * Key → identity, or null for anything that is not a live key.
 *
 * Null covers every failure the same way on purpose: malformed, unknown,
 * revoked, member deleted. Distinguishing them in the response would tell a
 * caller probing for valid keys which guesses were closer.
 */
export async function resolveConnectionKey(key: string): Promise<McpIdentity | null> {
  if (!looksLikeConnectionKey(key)) return null;

  const admin = createAdminClient();
  const { data } = await (admin.from("mcp_connection_keys") as any)
    .select("id, community_member_id, key_prefix, scopes, revoked_at")
    .eq("key_hash", hashConnectionKey(key))
    .is("revoked_at", null)
    .maybeSingle();

  if (!data?.community_member_id) return null;

  const scopes = toScopes(data.scopes);
  if (!scopes.length) return null;

  // Not awaited: the owner's view of "last used" is worth a second of lag, and
  // holding the MCP response open for a bookkeeping write is not. Same reasoning
  // as lib/agent-requests.ts.
  void (admin.from("mcp_connection_keys") as any)
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(undefined, (e: unknown) => console.error("[mcp] last_used_at not recorded:", e));

  return {
    memberId: data.community_member_id,
    keyId: data.id,
    scopes,
    keyPrefix: data.key_prefix,
  };
}

export async function listConnectionKeys(memberId: string): Promise<ConnectionKeyRow[]> {
  const admin = createAdminClient();
  const { data } = await (admin.from("mcp_connection_keys") as any)
    .select("id, key_prefix, label, scopes, created_at, last_used_at, revoked_at")
    .eq("community_member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data || []).map(rowOf);
}

/**
 * Revoke by id, scoped to the owner.
 *
 * The member id in the WHERE clause is not belt-and-braces — without it, an id
 * from anywhere would revoke anyone's key, and ids travel through URLs.
 * Already-revoked keys are left alone so the original revocation time survives.
 */
export async function revokeConnectionKey(args: { id: string; memberId: string }): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await (admin.from("mcp_connection_keys") as any)
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", args.id)
    .eq("community_member_id", args.memberId)
    .is("revoked_at", null)
    .select("id");

  return Array.isArray(data) && data.length > 0;
}
