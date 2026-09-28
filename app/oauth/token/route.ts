import { NextResponse } from "next/server";
import { exchangeCode, refreshTokens, type TokenError } from "@/lib/mcp/oauth";
import { resourceFor } from "@/lib/mcp/oauth-rules";
import { originOf } from "@/lib/mcp/oauth-metadata";

/**
 * OAuth token endpoint: authorization_code and refresh_token grants.
 *
 * FORM-ENCODED, per RFC 6749 §4.1.3. Claude sends both the code exchange and
 * every refresh as application/x-www-form-urlencoded; a JSON-only parser here
 * is the documented cause of a 415 and a connector that never finishes signing
 * in. JSON is accepted too, for clients that send it anyway.
 *
 * Public clients only: token_endpoint_auth_method is "none" and PKCE is the
 * proof, which is what Claude's CIMD client uses. Errors are RFC 6749 codes —
 * Claude treats invalid_grant on a refresh as "sign in again", and anything
 * else as a failure it cannot recover from.
 */

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store", Pragma: "no-cache" };

async function readBody(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get("content-type") || "";
  const raw = await request.text();
  if (raw.length > 8192) return {};
  if (type.includes("application/json")) {
    try {
      const j = JSON.parse(raw);
      return Object.fromEntries(Object.entries(j || {}).map(([k, v]) => [k, String(v)]));
    } catch {
      return {};
    }
  }
  return Object.fromEntries(new URLSearchParams(raw));
}

function fail(err: TokenError | { error: string; error_description: string }, status = 400) {
  return NextResponse.json(err, { status, headers });
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const canonicalResource = resourceFor(originOf(request));

  // A client secret means a confidential client, which this server does not
  // register. Refused rather than ignored, so a misconfigured client finds out.
  if (body.client_secret || request.headers.get("authorization")) {
    return fail({ error: "invalid_client", error_description: "This server accepts public clients only (PKCE, no client secret)." }, 401);
  }

  try {
    if (body.grant_type === "authorization_code") {
      const result = await exchangeCode({
        code: body.code || "",
        codeVerifier: body.code_verifier || "",
        clientId: body.client_id || "",
        redirectUri: body.redirect_uri || "",
        resource: body.resource ?? null,
        canonicalResource,
      });
      return "error" in result ? fail(result) : NextResponse.json(result, { headers });
    }

    if (body.grant_type === "refresh_token") {
      const result = await refreshTokens({
        refreshToken: body.refresh_token || "",
        clientId: body.client_id || "",
        canonicalResource,
      });
      return "error" in result ? fail(result) : NextResponse.json(result, { headers });
    }

    return fail({ error: "unsupported_grant_type", error_description: "Use authorization_code or refresh_token." });
  } catch (e: any) {
    console.error("[oauth/token] failed:", e);
    return fail({ error: "server_error", error_description: "Could not issue a token. Try again." }, 500);
  }
}
