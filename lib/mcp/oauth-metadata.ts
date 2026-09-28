import { OAUTH_SCOPES, resourceFor } from "@/lib/mcp/oauth-rules";

/**
 * The two discovery documents Claude reads before sign-in.
 *
 * Built from the REQUEST origin, not SITE_URL. RFC 8414 requires the issuer to
 * equal the origin the metadata was fetched from, and Claude requires
 * `resource` to equal the MCP URL exactly as the owner entered it. On
 * production that is https://shearquery.com either way; on a preview or a
 * local tunnel it is that host, which is what makes sign-in testable before it
 * ships.
 *
 * Two fields Claude checks before it will use a Client ID Metadata Document,
 * and silently falls back to Dynamic Client Registration without — which we do
 * not offer, so missing either one breaks sign-in:
 *   client_id_metadata_document_supported: true
 *   "none" in token_endpoint_auth_methods_supported
 * (https://claude.com/docs/connectors/building/authentication, 2026-09-28)
 */

export const originOf = (request: Request) =>
  request.headers.get("host") ? originFromHeaders(request.headers) : new URL(request.url).origin;

/**
 * The same origin, for a server component that has headers but no Request.
 * Must agree with originOf, because the consent page and the token endpoint
 * both bind a code to it — a mismatch fails every exchange with invalid_target.
 */
export function originFromHeaders(h: { get(name: string): string | null }): string {
  const host = (h.get("x-forwarded-host") || h.get("host") || "").split(",")[0].trim();
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const proto = (h.get("x-forwarded-proto") || (local ? "http" : "https")).split(",")[0].trim();
  return `${proto}://${host}`;
}

export const resourceMetadataUrl = (origin: string) => `${origin}/.well-known/oauth-protected-resource/mcp`;

export function protectedResourceMetadata(origin: string) {
  return {
    resource: resourceFor(origin),
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
    scopes_supported: OAUTH_SCOPES,
    resource_name: "ShearQuery",
    resource_documentation: `${origin}/account/claude`,
  };
}

export function authorizationServerMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    client_id_metadata_document_supported: true,
    // RFC 9207: we send iss on every authorization response, error or not.
    authorization_response_iss_parameter_supported: true,
    scopes_supported: OAUTH_SCOPES,
    service_documentation: `${origin}/account/claude`,
  };
}

/** Discovery documents are public and cacheable; clients cache them for minutes anyway. */
export const metadataHeaders = {
  "Cache-Control": "public, max-age=300",
  "Access-Control-Allow-Origin": "*",
};
