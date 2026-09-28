import "server-only";
import type { McpScope } from "@/lib/mcp/connection";
import { fetchClientMetadata, knownClientName } from "@/lib/mcp/oauth";
import {
  parseScopes,
  redirectUriAllowed,
  isValidChallenge,
  resourceMatches,
  resourceFor,
  isLoopback,
  CHALLENGE_SCOPES,
} from "@/lib/mcp/oauth-rules";

/**
 * Validating an authorization request — shared by the consent page (GET) and
 * the Allow/Deny handler (POST), because the second must not trust anything
 * the first checked. The form can be replayed or hand-built.
 *
 * TWO KINDS OF FAILURE, AND THE DIFFERENCE IS SECURITY. Until client_id and
 * redirect_uri are proven to belong together, we must NOT redirect anywhere:
 * sending an error to an unverified redirect_uri is the open-redirect the spec
 * warns about. So those failures are shown on our own page ("fatal"). Once the
 * redirect is verified, every other problem goes back to the client as an
 * OAuth error on that redirect, with state and iss, the way the client expects.
 */

export interface AuthorizeRequest {
  clientId: string;
  clientHost: string;
  clientName: string | null;
  /** Self-asserted by the client's document. Shown only as secondary text. */
  claimedName: string | null;
  redirectUri: string;
  redirectHost: string;
  loopbackOnly: boolean;
  state: string | null;
  codeChallenge: string;
  resource: string;
  scopes: McpScope[];
}

export type AuthorizeCheck =
  | { kind: "ok"; req: AuthorizeRequest }
  | { kind: "fatal"; message: string }
  | { kind: "redirect"; url: string };

export function errorRedirect(args: {
  redirectUri: string;
  error: string;
  description: string;
  state: string | null;
  issuer: string;
}): string {
  const u = new URL(args.redirectUri);
  u.searchParams.set("error", args.error);
  u.searchParams.set("error_description", args.description);
  if (args.state) u.searchParams.set("state", args.state);
  u.searchParams.set("iss", args.issuer);
  return u.toString();
}

export async function checkAuthorizeRequest(p: Record<string, string | undefined>, origin: string): Promise<AuthorizeCheck> {
  const clientId = p.client_id || "";
  const redirectUri = p.redirect_uri || "";
  if (!clientId) return { kind: "fatal", message: "The app did not say who it is (no client_id)." };
  if (!redirectUri) return { kind: "fatal", message: "The app did not say where to send you back (no redirect_uri)." };

  const meta = await fetchClientMetadata(clientId);
  if (!meta.ok) return { kind: "fatal", message: `We could not verify the app asking to connect: ${meta.reason}.` };
  if (!redirectUriAllowed(redirectUri, meta.meta.redirect_uris)) {
    return { kind: "fatal", message: "The app asked to send you back to an address it has not registered, so we stopped here." };
  }

  const state = p.state ?? null;
  const back = (error: string, description: string): AuthorizeCheck => ({
    kind: "redirect",
    url: errorRedirect({ redirectUri, error, description, state, issuer: origin }),
  });

  if (p.response_type !== "code") return back("unsupported_response_type", "Only response_type=code is supported.");
  if (p.code_challenge_method !== "S256" || !isValidChallenge(p.code_challenge)) {
    return back("invalid_request", "PKCE with code_challenge_method=S256 is required.");
  }
  const canonical = resourceFor(origin);
  // The spec says clients MUST send resource; tolerate its absence by binding
  // to this server, but refuse one that names somewhere else.
  if (p.resource && !resourceMatches(p.resource, canonical)) {
    return back("invalid_target", "This server only issues tokens for its own MCP endpoint.");
  }

  const requested = p.scope ? parseScopes(p.scope) : CHALLENGE_SCOPES;
  if (p.scope && !requested.length) return back("invalid_scope", "None of the requested scopes exist here.");

  const clientHost = new URL(clientId).hostname.toLowerCase();
  return {
    kind: "ok",
    req: {
      clientId,
      clientHost,
      clientName: knownClientName(clientHost),
      claimedName: meta.meta.client_name ?? null,
      redirectUri,
      redirectHost: new URL(redirectUri).host,
      loopbackOnly: meta.meta.redirect_uris.every(isLoopback),
      state,
      codeChallenge: p.code_challenge!,
      resource: canonical,
      scopes: requested.includes("read") ? requested : (["read", ...requested] as McpScope[]),
    },
  };
}
