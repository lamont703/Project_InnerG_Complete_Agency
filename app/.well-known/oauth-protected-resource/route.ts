import { NextResponse } from "next/server";
import { originOf, protectedResourceMetadata, metadataHeaders } from "@/lib/mcp/oauth-metadata";

/** RFC 9728 protected resource metadata, root form. The /mcp-suffixed form is what clients try first. */
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return NextResponse.json(protectedResourceMetadata(originOf(request)), { headers: metadataHeaders });
}
