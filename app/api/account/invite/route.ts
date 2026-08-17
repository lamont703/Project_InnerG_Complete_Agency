import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";
import { inviteConfig, landingPath, type InviteSource } from "@/lib/account-invite";

/**
 * "Create your account" — offered after a conversion, sent as a magic link.
 *
 * THE EMAIL IS NEVER TAKEN FROM THE REQUEST. This is the whole security design.
 * A route that accepts `{ email }` and sends a link to it is an open email
 * relay wearing a product's clothes: anyone could make us mail anyone, from our
 * domain, repeatedly. So the caller supplies only WHICH conversion it just
 * completed, and the address is read from that row server-side.
 *
 * The id is a UUID the caller legitimately holds — the booking API hands it
 * back in the response — and it is unguessable, which is what makes it usable
 * as the capability. It is still rate-limited, because "unguessable" and
 * "unshareable" are different properties.
 *
 * NOTHING IS JOINED HERE. This route sends a link and records that an offer was
 * made. The account is not created, no rows are linked, no audience is stamped.
 * All of that happens in the callback, AFTER the link is used, because clicking
 * it is the only thing that proves the person asking controls that mailbox.
 * Joining on a typed address would show someone else's booking — their name,
 * their phone, their appointment — to whoever mistyped it.
 */

export const dynamic = "force-dynamic";

/** Per-IP, per-minute. Modest: this sends real email from our domain. */
const RATE_LIMIT = 5;
const hits = new Map<string, { n: number; resetAt: number }>();

function rateLimited(req: NextRequest): boolean {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { n: 1, resetAt: now + 60_000 });
    return false;
  }
  rec.n += 1;
  return rec.n > RATE_LIMIT;
}

export async function POST(req: NextRequest) {
  if (rateLimited(req)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Try again in a minute." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const source = String(body?.source || "") as InviteSource;
  const id = String(body?.id || "").trim();
  const cfg = inviteConfig(source);

  if (!cfg) return NextResponse.json({ ok: false, error: "Unknown source." }, { status: 400 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ ok: false, error: "Invalid reference." }, { status: 400 });
  }

  const admin = createAdminClient();

  // THE address, from the conversion row. See the header.
  const { data: row } = await (admin.from(cfg.table) as any)
    .select(`${cfg.emailColumn}, entity_type, entity_id`)
    .eq("id", id)
    .maybeSingle();

  const email = row?.[cfg.emailColumn];
  if (!email) {
    // Same response whether the row is missing or simply has no email on it —
    // a distinct message would let someone probe which ids are real.
    return NextResponse.json({ ok: false, error: "Nothing to send." }, { status: 404 });
  }

  // Already a member? Then there is nothing to offer, and saying so is kinder
  // than sending a link to an account they already have.
  const { data: existing } = await (admin.from("community_members") as any)
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, alreadyMember: true });
  }

  await (admin.from("account_conversion_invites") as any).insert({
    email,
    source,
    audience: cfg.audience,
    entity_type: row?.entity_type ?? null,
    entity_id: row?.entity_id ?? null,
  });

  /*
   * shouldCreateUser: true is the point — these people have no password and
   * will never make one. The redirect carries the landing path so the account
   * opens on the thing they were promised rather than a blank page.
   */
  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      /*
       * THE ROLE HAS TO BE STATED HERE. handle_new_user() reads it from signup
       * metadata and falls back to the column default, which is
       * 'client_viewer' — a client-portal role that appears in the RLS
       * policies for clients and projects. Omitting it filed a real haircut
       * customer as a portal viewer; harmless today only because those
       * policies also require a project_user_access row she does not have.
       * /api/community/register has always passed this; this path did not.
       */
      data: { role: "community_member" },
      emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(landingPath(source))}`,
    },
  });

  if (error) {
    console.warn("[account/invite] otp send failed:", error.message);
    return NextResponse.json(
      { ok: false, error: "We couldn't send that link. Try again in a moment." },
      { status: 502 }
    );
  }

  // The address is never echoed back. The caller supplied an id, not an email,
  // and returning the address would turn this into a lookup oracle.
  return NextResponse.json({ ok: true, sent: true });
}
