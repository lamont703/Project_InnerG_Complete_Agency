import "server-only";
import { randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { createAdminClient } from "@/lib/supabase/admin";
import type { McpIdentity, McpScope } from "@/lib/mcp/connection";
import {
  OAUTH_SCOPES,
  checkClientIdUrl,
  checkClientMetadata,
  isPrivateAddress,
  pkceMatches,
  isValidVerifier,
  resourceMatches,
  hashSecret,
  type ClientMetadata,
} from "@/lib/mcp/oauth-rules";

/**
 * ShearQuery's OAuth 2.1 authorization server, for MCP clients such as Claude.
 *
 * An owner adds https://shearquery.com/mcp to Claude. The public tools work at
 * once; the first owner tool gets a 401, Claude shows a Connect card, the owner
 * signs in to ShearQuery and taps Allow, and Claude retries with a token. No
 * key is copied anywhere. See supabase/migrations/20260928120000_mcp_oauth.sql
 * for why this replaces the connection key, and lib/mcp/oauth-rules.ts for the
 * sources each rule comes from.
 *
 * LIFETIMES. Access tokens are short (an hour): the spec asks for short-lived
 * tokens, and Claude refreshes proactively before expiry. Refresh tokens last
 * 90 days from their last use and are ROTATED on every refresh, which the spec
 * requires for public clients — and Claude registers as a public client. A
 * rotated-out refresh token presented again can only mean it was copied, so the
 * whole grant is revoked.
 */

const ACCESS_TTL_SECONDS = 60 * 60;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 90;
const CODE_TTL_SECONDS = 5 * 60;

// ── client metadata documents ───────────────────────────────────────────────

const metaCache = new Map<string, { at: number; meta: ClientMetadata }>();
const META_TTL_MS = 10 * 60_000;

/**
 * Fetch and validate a Client ID Metadata Document.
 *
 * Cached for ten minutes per instance: the spec asks servers to cache, and the
 * authorize page and the decision POST both need it within seconds of each
 * other. SSRF guards: the URL rules in checkClientIdUrl, then the resolved
 * address must be public, redirects are refused (a redirect is how a public URL
 * points at a private one), and the body is capped.
 */
export async function fetchClientMetadata(clientId: string): Promise<{ ok: true; meta: ClientMetadata } | { ok: false; reason: string }> {
  const cached = metaCache.get(clientId);
  if (cached && Date.now() - cached.at < META_TTL_MS) return { ok: true, meta: cached.meta };

  const checked = checkClientIdUrl(clientId);
  if (!checked.ok) return checked;

  try {
    const addrs = await lookup(checked.url.hostname, { all: true });
    if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) {
      return { ok: false, reason: "client_id host does not resolve to a public address" };
    }
  } catch {
    return { ok: false, reason: "client_id host does not resolve" };
  }

  let res: Response;
  try {
    res = await fetch(checked.url, {
      headers: { Accept: "application/json" },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return { ok: false, reason: "could not fetch the client metadata document" };
  }
  if (!res.ok) return { ok: false, reason: `client metadata document returned ${res.status}` };

  const text = await res.text();
  if (text.length > 20_000) return { ok: false, reason: "client metadata document is too large" };

  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return { ok: false, reason: "client metadata document is not JSON" };
  }

  const valid = checkClientMetadata(doc, clientId);
  if (valid.ok) metaCache.set(clientId, { at: Date.now(), meta: valid.meta });
  return valid;
}

/**
 * Clients we recognise, named on the consent screen as themselves.
 *
 * Anything else still works — the spec is built for clients we have never
 * heard of — but the consent screen shows its bare host and a warning, since
 * the document's own client_name is self-asserted and anyone can call their
 * app "Claude".
 */
export function knownClientName(clientHost: string): string | null {
  const h = clientHost.toLowerCase();
  if (h === "claude.ai" || h.endsWith(".claude.ai") || h === "claude.com" || h.endsWith(".claude.com")) return "Claude";
  return null;
}

// ── codes and tokens ────────────────────────────────────────────────────────

const newSecret = (prefix: string) => `${prefix}${randomBytes(32).toString("base64url")}`;

/**
 * Record the owner's Allow and mint a single-use code.
 *
 * A fresh Allow for the same app replaces the previous grant rather than
 * stacking beside it: Claude re-runs sign-in on a step-up, and without this an
 * owner's connections page would fill with duplicates of one Claude.
 */
export async function createAuthorization(args: {
  memberId: string;
  clientId: string;
  clientHost: string;
  redirectUri: string;
  codeChallenge: string;
  resource: string;
  scopes: McpScope[];
}): Promise<string> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  await (admin.from("mcp_oauth_grants") as any)
    .update({ revoked_at: now })
    .eq("community_member_id", args.memberId)
    .eq("client_id", args.clientId)
    .is("revoked_at", null);

  const { data: grant, error } = await (admin.from("mcp_oauth_grants") as any)
    .insert({
      community_member_id: args.memberId,
      client_id: args.clientId,
      client_host: args.clientHost,
      scopes: args.scopes,
    })
    .select("id")
    .single();
  if (error || !grant) throw new Error(`could not record the grant: ${error?.message || "unknown"}`);

  const code = newSecret("sqc_");
  const { error: codeErr } = await (admin.from("mcp_oauth_codes") as any).insert({
    code_hash: hashSecret(code),
    grant_id: grant.id,
    client_id: args.clientId,
    redirect_uri: args.redirectUri,
    code_challenge: args.codeChallenge,
    resource: args.resource,
    scopes: args.scopes,
    expires_at: new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString(),
  });
  if (codeErr) throw new Error(`could not issue a code: ${codeErr.message}`);
  return code;
}

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export type TokenError = { error: "invalid_request" | "invalid_grant" | "invalid_client" | "invalid_target"; error_description: string };

async function issueTokens(grantId: string, resource: string, scopes: McpScope[]): Promise<TokenResponse> {
  const access = newSecret("sqa_");
  const refresh = newSecret("sqr_");
  const now = Date.now();
  const { error } = await (createAdminClient().from("mcp_oauth_tokens") as any).insert([
    { token_hash: hashSecret(access), grant_id: grantId, kind: "access", resource, scopes, expires_at: new Date(now + ACCESS_TTL_SECONDS * 1000).toISOString() },
    { token_hash: hashSecret(refresh), grant_id: grantId, kind: "refresh", resource, scopes, expires_at: new Date(now + REFRESH_TTL_SECONDS * 1000).toISOString() },
  ]);
  if (error) throw new Error(`could not issue tokens: ${error.message}`);
  return { access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL_SECONDS, refresh_token: refresh, scope: scopes.join(" ") };
}

async function grantIsLive(grantId: string): Promise<{ scopes: McpScope[]; memberId: string } | null> {
  const { data } = await (createAdminClient().from("mcp_oauth_grants") as any)
    .select("community_member_id, scopes, revoked_at")
    .eq("id", grantId)
    .maybeSingle();
  if (!data || data.revoked_at) return null;
  return { scopes: OAUTH_SCOPES.filter((s) => (data.scopes || []).includes(s)), memberId: data.community_member_id };
}

/** authorization_code grant. Every binding the code was issued with is checked again here. */
export async function exchangeCode(args: {
  code: string;
  codeVerifier: string;
  clientId: string;
  redirectUri: string;
  resource: string | null;
  canonicalResource: string;
}): Promise<TokenResponse | TokenError> {
  if (!args.code || !args.clientId || !args.redirectUri) {
    return { error: "invalid_request", error_description: "code, client_id and redirect_uri are required" };
  }
  if (!isValidVerifier(args.codeVerifier)) return { error: "invalid_grant", error_description: "code_verifier is missing or malformed" };

  const admin = createAdminClient();
  // Claimed atomically: a code can be exchanged once, even by two racing requests.
  const { data: rows } = await (admin.from("mcp_oauth_codes") as any)
    .update({ used_at: new Date().toISOString() })
    .eq("code_hash", hashSecret(args.code))
    .is("used_at", null)
    .select("grant_id, client_id, redirect_uri, code_challenge, resource, scopes, expires_at");
  const row = rows?.[0];

  if (!row) return { error: "invalid_grant", error_description: "code is invalid or already used" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { error: "invalid_grant", error_description: "code has expired" };
  if (row.client_id !== args.clientId) return { error: "invalid_grant", error_description: "code was issued to a different client" };
  if (row.redirect_uri !== args.redirectUri) return { error: "invalid_grant", error_description: "redirect_uri does not match the authorization request" };
  if (!pkceMatches(args.codeVerifier, row.code_challenge)) return { error: "invalid_grant", error_description: "code_verifier does not match" };
  if (args.resource != null && !resourceMatches(args.resource, row.resource)) {
    return { error: "invalid_target", error_description: "resource does not match the authorization request" };
  }
  if (!resourceMatches(row.resource, args.canonicalResource)) return { error: "invalid_target", error_description: "resource is not this server" };

  const live = await grantIsLive(row.grant_id);
  if (!live) return { error: "invalid_grant", error_description: "the owner has revoked this connection" };

  return issueTokens(row.grant_id, row.resource, live.scopes);
}

/** refresh_token grant, with rotation and reuse detection. */
export async function refreshTokens(args: { refreshToken: string; clientId: string; canonicalResource: string }): Promise<TokenResponse | TokenError> {
  if (!args.refreshToken) return { error: "invalid_request", error_description: "refresh_token is required" };
  const admin = createAdminClient();
  const hash = hashSecret(args.refreshToken);

  const { data: token } = await (admin.from("mcp_oauth_tokens") as any)
    .select("grant_id, kind, resource, expires_at, used_at")
    .eq("token_hash", hash)
    .maybeSingle();
  if (!token || token.kind !== "refresh") return { error: "invalid_grant", error_description: "refresh token is invalid" };

  if (token.used_at) {
    // A rotated-out refresh token came back. One of the two holders is not the
    // client it was issued to, and there is no telling which — so both lose it.
    await (admin.from("mcp_oauth_grants") as any).update({ revoked_at: new Date().toISOString() }).eq("id", token.grant_id).is("revoked_at", null);
    return { error: "invalid_grant", error_description: "refresh token was already used; the connection has been revoked for safety" };
  }
  if (new Date(token.expires_at).getTime() < Date.now()) return { error: "invalid_grant", error_description: "refresh token has expired" };
  if (!resourceMatches(token.resource, args.canonicalResource)) return { error: "invalid_grant", error_description: "refresh token is for a different server" };

  const { data: grant } = await (admin.from("mcp_oauth_grants") as any).select("client_id").eq("id", token.grant_id).maybeSingle();
  if (!grant || grant.client_id !== args.clientId) return { error: "invalid_grant", error_description: "refresh token was issued to a different client" };

  const live = await grantIsLive(token.grant_id);
  if (!live) return { error: "invalid_grant", error_description: "the owner has revoked this connection" };

  const { data: claimed } = await (admin.from("mcp_oauth_tokens") as any)
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", hash)
    .is("used_at", null)
    .select("token_hash");
  if (!claimed?.length) return { error: "invalid_grant", error_description: "refresh token was already used" };

  return issueTokens(token.grant_id, token.resource, live.scopes);
}

/**
 * Access token → the same identity a connection key resolves to, so every
 * downstream check (requiresIdentity, requiresScope, the change engine) treats
 * a signed-in Claude and a keyed one identically.
 *
 * keyPrefix is "oa_" plus the start of the grant id. It lands in change
 * records as claude:oa_…, which is how the change-history page finds the grant
 * to offer a revoke button against.
 */
export async function resolveAccessToken(
  token: string,
  canonicalResource: string
): Promise<{ ok: true; identity: McpIdentity } | { ok: false; reason: string }> {
  const admin = createAdminClient();
  const { data: row } = await (admin.from("mcp_oauth_tokens") as any)
    .select("grant_id, kind, resource, expires_at")
    .eq("token_hash", hashSecret(token))
    .maybeSingle();

  if (!row || row.kind !== "access") return { ok: false, reason: "The access token is not valid." };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: "The access token has expired." };
  // Audience binding: a token issued for another resource is refused, never passed through.
  if (!resourceMatches(row.resource, canonicalResource)) return { ok: false, reason: "The access token was issued for a different server." };

  const live = await grantIsLive(row.grant_id);
  if (!live) return { ok: false, reason: "The owner has revoked this connection." };

  void (admin.from("mcp_oauth_grants") as any)
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.grant_id)
    .then(undefined, (e: unknown) => console.error("[mcp-oauth] last_used_at not recorded:", e));

  return {
    ok: true,
    identity: { memberId: live.memberId, keyId: row.grant_id, scopes: live.scopes, keyPrefix: grantPrefix(row.grant_id), via: "oauth" },
  };
}

export const grantPrefix = (grantId: string) => `oa_${grantId.replace(/-/g, "").slice(0, 8)}`;

// ── the owner's view ────────────────────────────────────────────────────────

export interface GrantRow {
  id: string;
  prefix: string;
  clientHost: string;
  clientName: string | null;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export async function listGrants(memberId: string): Promise<GrantRow[]> {
  const { data } = await (createAdminClient().from("mcp_oauth_grants") as any)
    .select("id, client_host, scopes, created_at, last_used_at, revoked_at")
    .eq("community_member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data || []).map((g: any) => ({
    id: g.id,
    prefix: grantPrefix(g.id),
    clientHost: g.client_host,
    clientName: knownClientName(g.client_host),
    scopes: g.scopes || [],
    createdAt: g.created_at,
    lastUsedAt: g.last_used_at,
    revokedAt: g.revoked_at,
  }));
}

/** Revoking the grant kills every token under it: resolveAccessToken and refresh both check it. */
export async function revokeGrant(args: { id: string; memberId: string }): Promise<boolean> {
  const { data } = await (createAdminClient().from("mcp_oauth_grants") as any)
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", args.id)
    .eq("community_member_id", args.memberId)
    .is("revoked_at", null)
    .select("id");
  return Array.isArray(data) && data.length > 0;
}
