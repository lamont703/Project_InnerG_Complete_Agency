import { NextResponse } from "next/server";
import { originOf, authorizationServerMetadata, metadataHeaders } from "@/lib/mcp/oauth-metadata";

/** RFC 8414 authorization server metadata. The issuer is the site origin, so this is the no-path form. */
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return NextResponse.json(authorizationServerMetadata(originOf(request)), { headers: metadataHeaders });
}
