import { describe, it, expect, beforeAll, vi } from "vitest";
import { APP_RESOURCES, readAppResource } from "./registry";
import { PHOTO_UPLOAD_URI, MCP_APP_MIME, photoUploadHtml } from "./photo-upload-view";
import { isExcludedFromSitemap, isMarkdownEligible } from "@/lib/public-routes";

let MCP_TOOLS: any[];
beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  MCP_TOOLS = (await import("../tools")).MCP_TOOLS as any[];
});

describe("MCP App views", () => {
  /** A tool pointing at a view the server cannot serve renders nothing, and nothing errors. */
  it("serves every view a tool points at", () => {
    const pointed = MCP_TOOLS.map((t) => t.meta?.ui?.resourceUri).filter(Boolean);
    expect(pointed).toContain(PHOTO_UPLOAD_URI);
    for (const uri of pointed) expect(readAppResource(uri, "https://shearquery.com"), uri).not.toBeNull();
    for (const r of APP_RESOURCES) expect(r.uri.startsWith("ui://")).toBe(true);
  });

  it("returns the view with the MCP App mime type and our origin as the only connect domain", () => {
    const read = readAppResource(PHOTO_UPLOAD_URI, "https://preview.example.com")!;
    const c = read.contents[0];
    expect(c.mimeType).toBe(MCP_APP_MIME);
    expect(c._meta.ui.csp.connectDomains).toEqual(["https://preview.example.com"]);
    expect(readAppResource("ui://something-else", "https://shearquery.com")).toBeNull();
  });

  /**
   * The spec's default CSP allows inline script only. An external <script src>
   * would be blocked and the box would render dead, with no error the owner
   * can see.
   */
  it("is a self-contained page that speaks the MCP Apps handshake", () => {
    const html = photoUploadHtml();
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).not.toMatch(/<script[^>]+src=/i);
    expect(html).not.toMatch(/<link[^>]+href=/i);
    expect(html).toContain('"ui/initialize"');
    expect(html).toContain('"ui/notifications/initialized"');
    expect(html).toContain("ui/notifications/tool-result");
    expect(html).not.toContain("innerHTML");
  });

  it("keeps the upload box behind identity and the propose scope", () => {
    const tool = MCP_TOOLS.find((t) => t.name === "upload_photo");
    expect(tool.requiresIdentity).toBe(true);
    expect(tool.requiresScope).toBe("propose");
    expect(tool.annotations.destructiveHint).toBe(false);
  });
});

describe("private pages stay out of the sitemap and the .md layer", () => {
  it("excludes the consent screen and the one-time upload page", () => {
    for (const route of ["/oauth/authorize", "/upload/squp_abc"]) {
      expect(isExcludedFromSitemap(route), route).toBe(true);
      expect(isMarkdownEligible(route), route).toBe(false);
    }
  });
});
