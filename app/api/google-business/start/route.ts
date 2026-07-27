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
