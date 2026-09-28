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
    expect(c.text).toContain('"https://preview.example.com"');
    expect(readAppResource("ui://something-else", "https://shearquery.com")).toBeNull();
  });

  /**
   * The spec's default CSP allows inline script only. An external <script src>
   * would be blocked and the box would render dead, with no error the owner
   * can see.
   */
  it("is a self-contained page that connects through the vendored SDK", () => {
    const html = photoUploadHtml("https://shearquery.com");
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).not.toMatch(/<script[^>]+src=/i);
    expect(html).not.toMatch(/<link[^>]+href=/i);
    // The box's own script is the second one; the first is the SDK, which
    // contains the same words.
    const own = html.split("<script>")[2].split("</script>")[0];
    expect(own).toContain("window.McpExtApps");
    expect(own).toContain("app.connect()");
    // Handlers must be registered before connect, or the result can be missed.
    expect(own.indexOf("app.ontoolresult")).toBeLessThan(own.indexOf("app.connect()"));
  });

  /**
   * The inline scripts must parse and must not be cut short: a stray
   * "</script" inside the SDK would end the tag early and the box would render
   * dead, which is the invisible failure this rewrite exists to fix.
   */
  it("has inline scripts that parse, with no early </script>", () => {
    const html = photoUploadHtml("https://shearquery.com");
    const scripts = html.split("<script>").slice(1).map((s) => s.split("</script>")[0]);
    expect(scripts).toHaveLength(2);
    for (const js of scripts) expect(() => new Function(js)).not.toThrow();
    expect((html.match(/<\/script>/g) || []).length).toBe(2);
  });

  it("runs the SDK bundle into window.McpExtApps.App", () => {
    const html = photoUploadHtml("https://shearquery.com");
    const sdk = html.split("<script>")[1].split("</script>")[0];
    const win: any = {};
    new Function("window", "self", "globalThis", sdk)(win, win, win);
    expect(typeof win.McpExtApps?.App).toBe("function");
  });

  it("keeps the upload box behind identity and the propose scope", () => {
    const tool = MCP_TOOLS.find((t) => t.name === "upload_photo");
    expect(tool.requiresIdentity).toBe(true);
    expect(tool.requiresScope).toBe("propose");
    expect(tool.annotations.destructiveHint).toBe(false);
  });
});

describe("private pages stay out of the sitemap and the .md layer", () => {
  it("excludes the consent screen, the upload page and the appointment link", () => {
    for (const route of ["/oauth/authorize", "/upload/squp_abc", "/appointments/abc"]) {
      expect(isExcludedFromSitemap(route), route).toBe(true);
      expect(isMarkdownEligible(route), route).toBe(false);
    }
  });
});
