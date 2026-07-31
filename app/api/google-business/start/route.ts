import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createServerClient } from "@/lib/supabase/server";
import { gbpAuthUrl, gbpPkcePair } from "@/lib/google-business";

// Kicks off the Google Business Profile OAuth consent for the signed-in member.
// Sets a state nonce cookie (CSRF) and redirects to Google.
export async function GET(req: Request) {
  const host = req.headers.get("host") || "agency.innergcomplete.com";
  const origin = `${host.includes("localhost") ? "http" : "https"}://${host}`;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Send them back here after login, not to manage-listing — they clicked
    // "connect Google" and should land in the OAuth flow, not a dashboard.
    return NextResponse.redirect(
      `${origin}/login?redirect=${encodeURIComponent("/api/google-business/start")}`
    );
  }

  // Without the OAuth credentials, generateAuthUrl still happily builds a URL —
  // just one with no client_id — and Google answers the owner with a raw
  // "Access blocked: Authorization Error / Missing required parameter:
  // client_id" screen. That happened in production, where GOOGLE_CLIENT_ID was
  // never set. Fail here instead, so the owner gets a sentence they can act on
  // and the cause shows up in our logs rather than Google's.
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error("[gbp start] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set in this environment.");
    return NextResponse.redirect(`${origin}/account/manage-listing?gbp=notconfigured`);
  }

  const state = randomBytes(16).toString("hex");
  const { verifier, challenge } = gbpPkcePair();

  const res = NextResponse.redirect(gbpAuthUrl(origin, state, challenge));
  // `state` proves the callback belongs to a flow we started (CSRF); the PKCE
  // verifier proves the code is being redeemed by whoever started it. Both stay
  // httpOnly so page scripts can't read them, and both expire with the flow.
  const cookieOpts = {
    httpOnly: true,
    secure: !host.includes("localhost"),
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };
  res.cookies.set("gbp_oauth_state", state, cookieOpts);
  res.cookies.set("gbp_oauth_verifier", verifier, cookieOpts);
  return res;
}
