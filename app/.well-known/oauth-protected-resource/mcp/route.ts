import { NextResponse } from "next/server";
import { originOf, protectedResourceMetadata, metadataHeaders } from "@/lib/mcp/oauth-metadata";

/**
 * RFC 9728 protected resource metadata for /mcp — the URL our 401 points at,
 * and the path-suffixed form clients probe first when the resource has a path.
 */
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return NextResponse.json(protectedResourceMetadata(originOf(request)), { headers: metadataHeaders });
}
