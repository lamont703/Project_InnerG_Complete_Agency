import { NextResponse } from "next/server";
import { resolveMemberContext } from "@/lib/account/view-as";
import { checkAuthorizeRequest, errorRedirect } from "@/lib/mcp/oauth-authorize";
import { createAuthorization } from "@/lib/mcp/oauth";
import { originOf } from "@/lib/mcp/oauth-metadata";
import type { McpScope } from "@/lib/mcp/connection";

/**
 * The owner's Allow or Cancel from the consent screen.
 *
 * EVERYTHING IS CHECKED AGAIN. The form's hidden fields are just the original
 * request carried forward, and a form can be replayed or built by hand, so
 * the client, its redirect URI, PKCE and the resource are re-validated exactly
 * as the page did — only the owner's two choices (allow, publish) are new.
 *
 * SAME-ORIGIN ONLY. A cross-site page auto-submitting this form would be the
 * owner "allowing" an app they never saw. Supabase's cookies are SameSite=Lax,
 * which already withholds the session from a cross-site POST, and the Origin
 * check makes that explicit instead of relying on a cookie default.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const origin = originOf(request);
  const sentFrom = request.headers.get("origin");
  if (sentFrom && sentFrom !== origin) {
    return NextResponse.json({ error: "This form must be submitted from ShearQuery." }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Missing form." }, { status: 400 });
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") params[k] = v;

  const check = await checkAuthorizeRequest(params, origin);
  if (check.kind === "fatal") return NextResponse.json({ error: check.message }, { status: 400 });
  if (check.kind === "redirect") return NextResponse.redirect(check.url, 303);
  const req = check.req;

  const ctx = await resolveMemberContext();
  if ("error" in ctx) {
    const here = `/oauth/authorize?${new URLSearchParams(params).toString()}`;
    return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(here)}`, origin), 303);
  }
  if (ctx.impersonating) {
    return NextResponse.json({ error: "Exit View As before connecting an app." }, { status: 403 });
  }

  if (params.decision !== "allow") {
    return NextResponse.redirect(
      errorRedirect({ redirectUri: req.redirectUri, error: "access_denied", description: "The owner cancelled.", state: req.state, issuer: origin }),
      303
    );
  }

  // Publishing only if it was both requested and left ticked.
  const scopes: McpScope[] = req.scopes.filter((s) => s !== "publish" || params.publish === "yes");

  let code: string;
  try {
    code = await createAuthorization({
      memberId: ctx.memberId,
      clientId: req.clientId,
      clientHost: req.clientHost,
      redirectUri: req.redirectUri,
      codeChallenge: req.codeChallenge,
      resource: req.resource,
      scopes,
    });
  } catch (e: any) {
    console.error("[oauth/authorize] could not issue a code:", e);
    return NextResponse.redirect(
      errorRedirect({ redirectUri: req.redirectUri, error: "server_error", description: "Could not complete sign-in.", state: req.state, issuer: origin }),
      303
    );
  }

  const back = new URL(req.redirectUri);
  back.searchParams.set("code", code);
  if (req.state) back.searchParams.set("state", req.state);
  // RFC 9207: lets the client confirm the code came from the server it meant to use.
  back.searchParams.set("iss", origin);
  return NextResponse.redirect(back.toString(), 303);
}
