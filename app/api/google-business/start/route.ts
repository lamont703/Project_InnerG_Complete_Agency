import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createServerClient } from "@/lib/supabase/server";
import { gbpAuthUrl } from "@/lib/google-business";

// Kicks off the Google Business Profile OAuth consent for the signed-in member.
// Sets a state nonce cookie (CSRF) and redirects to Google.
export async function GET(req: Request) {
  const host = req.headers.get("host") || "agency.innergcomplete.com";
  const origin = `${host.includes("localhost") ? "http" : "https"}://${host}`;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?redirect=/account/manage-listing`);
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
  const res = NextResponse.redirect(gbpAuthUrl(origin, state));
  res.cookies.set("gbp_oauth_state", state, {
    httpOnly: true,
    secure: !host.includes("localhost"),
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
