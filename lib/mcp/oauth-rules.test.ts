import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  parseScopes,
  scopesForTool,
  checkClientIdUrl,
  isPrivateAddress,
  checkClientMetadata,
  redirectUriAllowed,
  isValidVerifier,
  pkceMatches,
  resourceMatches,
  resourceFor,
  wwwAuthenticate,
} from "./oauth-rules";

const CLAUDE_CODE = ["http://localhost/callback", "http://127.0.0.1/callback"];
const CLAUDE_WEB = ["https://claude.ai/api/mcp/auth_callback"];

describe("redirect URIs", () => {
  it("matches Claude's hosted callback exactly and nothing near it", () => {
    expect(redirectUriAllowed("https://claude.ai/api/mcp/auth_callback", CLAUDE_WEB)).toBe(true);
    expect(redirectUriAllowed("https://claude.ai/api/mcp/auth_callback/", CLAUDE_WEB)).toBe(false);
    expect(redirectUriAllowed("https://claude.ai/api/mcp/auth_callback?x=1", CLAUDE_WEB)).toBe(false);
    expect(redirectUriAllowed("https://evil.example/api/mcp/auth_callback", CLAUDE_WEB)).toBe(false);
  });

  /** Claude Code binds an ephemeral port each session; the docs require a port-agnostic loopback match. */
  it("matches Claude Code's loopback callback on any port, for localhost and 127.0.0.1", () => {
    expect(redirectUriAllowed("http://localhost:3118/callback", CLAUDE_CODE)).toBe(true);
    expect(redirectUriAllowed("http://127.0.0.1:50211/callback", CLAUDE_CODE)).toBe(true);
    expect(redirectUriAllowed("http://localhost:3118/other", CLAUDE_CODE)).toBe(false);
    expect(redirectUriAllowed("http://attacker.example:3118/callback", CLAUDE_CODE)).toBe(false);
  });

  it("never allows a plain-http redirect that is not loopback, even if registered", () => {
    expect(redirectUriAllowed("http://example.com/cb", ["http://example.com/cb"])).toBe(false);
  });
});

describe("client_id URLs (SSRF guard)", () => {
  it("accepts an https URL with a path on a public hostname", () => {
    expect(checkClientIdUrl("https://claude.ai/oauth/claude-code-client-metadata").ok).toBe(true);
  });

  it("refuses everything that could point our server at itself or a private network", () => {
    for (const bad of [
      "http://claude.ai/meta",
      "https://claude.ai/",
      "https://localhost/meta",
      "https://127.0.0.1/meta",
      "https://169.254.169.254/latest",
      "https://[::1]/meta",
      "https://user:pw@claude.ai/meta",
      "https://claude.ai:8443/meta",
      "https://metadata.internal/x",
      "not a url",
    ]) {
      expect(checkClientIdUrl(bad).ok, bad).toBe(false);
    }
  });

  it("classifies private addresses, including IPv4-mapped IPv6", () => {
    for (const ip of ["10.0.0.1", "172.16.5.4", "192.168.1.1", "127.0.0.1", "169.254.169.254", "::1", "fd00::1", "::ffff:10.0.0.1", "100.64.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    for (const ip of ["160.79.104.10", "8.8.8.8", "2606:4700::1111"]) expect(isPrivateAddress(ip), ip).toBe(false);
  });

  it("requires the metadata document to name itself by its own URL", () => {
    const id = "https://claude.ai/meta";
    expect(checkClientMetadata({ client_id: id, redirect_uris: CLAUDE_WEB }, id).ok).toBe(true);
    expect(checkClientMetadata({ client_id: "https://evil.example/meta", redirect_uris: CLAUDE_WEB }, id).ok).toBe(false);
    expect(checkClientMetadata({ client_id: id }, id).ok).toBe(false);
  });
});

describe("PKCE", () => {
  it("verifies S256 and rejects a wrong or malformed verifier", () => {
    const verifier = "a".repeat(43) + "Z_-.~9";
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    expect(isValidVerifier(verifier)).toBe(true);
    expect(pkceMatches(verifier, challenge)).toBe(true);
    expect(pkceMatches(verifier + "x", challenge)).toBe(false);
    expect(isValidVerifier("short")).toBe(false);
    expect(isValidVerifier("a".repeat(43) + " ")).toBe(false);
  });
});

describe("resource (audience binding)", () => {
  const canonical = resourceFor("https://shearquery.com");
  it("accepts this server's MCP URL, leniently on case and trailing slash only", () => {
    expect(canonical).toBe("https://shearquery.com/mcp");
    expect(resourceMatches("https://shearquery.com/mcp", canonical)).toBe(true);
    expect(resourceMatches("HTTPS://ShearQuery.com/mcp/", canonical)).toBe(true);
  });
  it("refuses any other server, path or shape", () => {
    for (const bad of ["https://evil.example/mcp", "https://shearquery.com/other", "https://shearquery.com/mcp#x", "https://shearquery.com/mcp?a=1", "", "shearquery.com/mcp"]) {
      expect(resourceMatches(bad, canonical), bad).toBe(false);
    }
  });
});

describe("scopes", () => {
  it("keeps only scopes this server knows", () => {
    expect(parseScopes("read publish offline_access admin")).toEqual(["read", "publish"]);
    expect(parseScopes("")).toEqual([]);
  });
  it("says what each kind of tool needs", () => {
    expect(scopesForTool({})).toEqual([]);
    expect(scopesForTool({ requiresIdentity: true })).toEqual(["read"]);
    expect(scopesForTool({ requiresIdentity: true, requiresScope: "publish" })).toEqual(["read", "publish"]);
  });
});

describe("WWW-Authenticate", () => {
  it("points at the resource metadata, which is what makes Claude start sign-in", () => {
    const h = wwwAuthenticate({ metadataUrl: "https://shearquery.com/.well-known/oauth-protected-resource/mcp", scopes: ["read", "propose"], error: "invalid_token" });
    expect(h.startsWith("Bearer ")).toBe(true);
    expect(h).toContain('resource_metadata="https://shearquery.com/.well-known/oauth-protected-resource/mcp"');
    expect(h).toContain('scope="read propose"');
    expect(h).toContain('error="invalid_token"');
  });
});

describe("hosted client documents (public/oauth/clients)", () => {
  // Meta AI's Muse asks for a client ID instead of bringing its own, so we host its
  // Client ID Metadata Document. It must pass the same checks any client's does.
  it("meta-muse.json is a valid client and allows Muse's callback", async () => {
    const { readFileSync } = await import("node:fs");
    const { checkClientIdUrl, checkClientMetadata, redirectUriAllowed } = await import("./oauth-rules");
    const id = "https://shearquery.com/oauth/clients/meta-muse.json";
    const doc = JSON.parse(readFileSync("public/oauth/clients/meta-muse.json", "utf8"));
    expect(checkClientIdUrl(id).ok).toBe(true);
    const meta = checkClientMetadata(doc, id);
    expect(meta.ok).toBe(true);
    expect(redirectUriAllowed("https://agent.meta.ai/api/hatch/oauth/callback", doc.redirect_uris)).toBe(true);
    expect(doc.token_endpoint_auth_method).toBe("none");
  });
});

describe("clientIdFromRequest (token endpoint)", () => {
  const id = "https://shearquery.com/oauth/clients/meta-muse.json";
  const basic = (user: string, pass = "") => "Basic " + Buffer.from(`${encodeURIComponent(user)}:${pass}`).toString("base64");
  it("takes the client_id from the body, as Claude sends it", async () => {
    const { clientIdFromRequest } = await import("./oauth-rules");
    expect(clientIdFromRequest(id, null)).toEqual({ ok: true, clientId: id });
  });
  it("takes it from a Basic header with an empty secret, as Muse sends it", async () => {
    const { clientIdFromRequest } = await import("./oauth-rules");
    expect(clientIdFromRequest(undefined, basic(id))).toEqual({ ok: true, clientId: id });
  });
  it("ignores a secret — none is ever issued", async () => {
    const { clientIdFromRequest } = await import("./oauth-rules");
    expect(clientIdFromRequest(undefined, basic(id, "anything"))).toEqual({ ok: true, clientId: id });
  });
  it("refuses a body and header that disagree, and no client_id at all", async () => {
    const { clientIdFromRequest } = await import("./oauth-rules");
    expect(clientIdFromRequest("https://other.example/c.json", basic(id)).ok).toBe(false);
    expect(clientIdFromRequest(undefined, null).ok).toBe(false);
  });
});
