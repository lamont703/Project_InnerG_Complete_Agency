import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MAX_ITEMS, newShareToken, type ShortlistItem } from "@/lib/shortlist";

/**
 * Save a shortlist and hand back a shareable link.
 *
 * THIS IS THE ONLY MOMENT THE SERVER HEARS ABOUT A SHORTLIST. Everything before
 * it lives in the visitor's browser. The email is asked for here because here is
 * where it buys them something — a link that survives closing the tab — rather
 * than at the door.
 *
 * EMAIL IS OPTIONAL. A list can be saved and shared without one; the address
 * only matters for the post-visit follow-up, which is itself opt-in. Refusing to
 * save without an address would turn the artifact into a paywall.
 */

const service = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/** Conservative shape check — this endpoint is unauthenticated. */
function cleanItems(raw: unknown): ShortlistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (i): i is ShortlistItem =>
        !!i &&
        typeof i === "object" &&
        (i.entityType === "shop" || i.entityType === "salon") &&
        typeof i.slug === "string" &&
        i.slug.length > 0 &&
        i.slug.length < 200,
    )
    .slice(0, MAX_ITEMS)
    .map((i) => ({
      entityType: i.entityType,
      slug: i.slug,
      name: typeof i.name === "string" ? i.name.slice(0, 200) : "",
      addedAt: typeof i.addedAt === "string" ? i.addedAt : new Date().toISOString(),
    }));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  const items = cleanItems(body.items);
  if (items.length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to save" }, { status: 400 });
  }

  const email = typeof body.email === "string" && EMAIL_RE.test(body.email.trim())
    ? body.email.trim().toLowerCase()
    : null;
  const wantsFollowUp = body.followUp === true && !!email;

  /*
   * The follow-up fires three days out.
   *
   * The whole point of this feature is asking for a review at the right moment.
   * Someone reading "<salon> reviews" has NOT been yet — asking them to review
   * today would be asking about a visit that has not happened. Three days is
   * long enough that a booking made off this research has plausibly happened,
   * and short enough that the visit is still recallable.
   */
  const followupAfter = wantsFollowUp
    ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const shareToken = newShareToken();
  const { error } = await service().from("shortlists").insert({
    share_token: shareToken,
    email,
    name: typeof body.name === "string" ? body.name.slice(0, 120) : null,
    items,
    service_intent: typeof body.serviceIntent === "string" ? body.serviceIntent.slice(0, 120) : null,
    followup_opt_in: wantsFollowUp,
    followup_after: followupAfter,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: "Could not save" }, { status: 500 });
  }

  // The token is the only thing returned. Never echo the email back — a
  // response body is the easiest place to leak one into a log or an analytics
  // payload, and the client already knows what it typed.
  return NextResponse.json({ ok: true, shareToken, url: `/shortlist/${shareToken}` });
}
