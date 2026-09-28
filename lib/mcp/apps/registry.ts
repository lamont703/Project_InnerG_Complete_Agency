import { PHOTO_UPLOAD_URI, MCP_APP_MIME, photoUploadHtml } from "@/lib/mcp/apps/photo-upload-view";

/**
 * The MCP App views this server serves, as ui:// resources.
 *
 * Static HTML, readable without identity: a view holds no owner data until a
 * tool result is pushed into it, and hosts prefetch views before any tool runs.
 */

export const APP_RESOURCES = [
  {
    uri: PHOTO_UPLOAD_URI,
    name: "photo_upload",
    title: "Add a photo",
    description: "Upload box for adding a photo to the owner's Google Business Profile as a draft.",
    mimeType: MCP_APP_MIME,
  },
];

/**
 * resources/read for a view.
 *
 * csp.connectDomains names our own origin: the box POSTs the photo straight to
 * /api/mcp-upload on it, and the spec's default CSP is connect-src 'none'.
 * Built per request so a preview deployment's box talks to that preview.
 */
export function readAppResource(uri: unknown, origin: string) {
  if (uri !== PHOTO_UPLOAD_URI) return null;
  return {
    contents: [
      {
        uri: PHOTO_UPLOAD_URI,
        mimeType: MCP_APP_MIME,
        text: photoUploadHtml(),
        _meta: { ui: { csp: { connectDomains: [origin] }, prefersBorder: true } },
      },
    ],
  };
}
