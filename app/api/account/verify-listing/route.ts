import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertNotImpersonating } from "@/lib/account/view-as";
import { resolveOwnedBookingContext } from "@/lib/account/booking-requests";
import { CLAIM_ENTITY_TYPES } from "@/lib/entity-claim";
import { sendGhlSms } from "@/lib/ghl-sms";
import {
  generateCode,
  hashCode,
  checkCode,
  canSend,
  expiryFrom,
  last4,
  verificationSms,
  MAX_ATTEMPTS,
} from "@/lib/account/claim-verification";

/**
 * Prove you own the listing you claimed.
 *
 * POST { action: "send" }            -> texts a code to the listing's own phone
 * POST { action: "confirm", code }   -> marks the link verified
 *
 * THE ONE THING THAT MAKES THIS WORTH ANYTHING. The destination number is read
 * from the entity row, server-side. It is never accepted from the request. A
 * code sent to a number the claimant supplied proves only that they can receive
 * their own texts — which is the flaw in app/api/send-otp/route.ts, where
 * `phone` comes off the body. Do not copy that route.
 *
 * The entity being verified is likewise never taken from the client: it comes
 * from the session's own link row, so a member can only ever verify the one
 * listing they already claimed.
 */

export const dynamic = "force-dynamic";

/** Every claimable table, so the phone can be read whatever type was claimed. */
function tableFor(entityType: string): string | null {
  return CLAIM_ENTITY_TYPES.find((t) => t.key === entityType)?.table ?? null;
}

export async function POST(req: NextRequest) {
  const ctx = await resolveOwnedBookingContext();
  if ("status" in ctx) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!("link" in ctx)) {
    return NextResponse.json({ error: "You haven't claimed a listing yet." }, { status: 403 });
  }
  const blocked = assertNotImpersonating(ctx);
  if (blocked) return NextResponse.json({ error: blocked.error }, { status: blocked.status });

  if (ctx.link.verified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const { entityType, entityId } = ctx.link;

  // ---------------------------------------------------------------- send ---
  if (body?.action === "send") {
    const table = tableFor(entityType);
    if (!table) return NextResponse.json({ error: "That listing type can't be verified yet." }, { status: 400 });

    // THE phone. From the listing row, never from the caller.
    const { data: entity } = await (admin.from(table) as any)
      .select("phone")
      .eq("id", entityId)
      .maybeSingle();

    const phone = entity?.phone || null;
    if (!phone) {
      // Nothing to text. Say so plainly rather than pretending a code went out.
      return NextResponse.json(
        {
          error:
            "We don't have a phone number on this listing, so we can't text a code. " +
            "Connect your Google Business Profile instead — that proves ownership too.",
          noPhone: true,
        },
        { status: 400 }
      );
    }

    const { data: recent } = await (admin.from("entity_claim_verifications") as any)
      .select("created_at")
      .eq("community_member_id", ctx.memberId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(20);

    const allowed = canSend(recent || [], now);
    if (!allowed.ok) {
      return NextResponse.json(
        {
          error:
            allowed.reason === "cooldown"
              ? `Hold on ${allowed.retryAfterSeconds}s before asking for another code.`
              : "Too many codes today. Try again tomorrow, or connect your Google Business Profile.",
        },
        { status: 429, headers: allowed.retryAfterSeconds ? { "Retry-After": String(allowed.retryAfterSeconds) } : undefined }
      );
    }

    const memberId = ctx.memberId;
    const code = generateCode();
    await (admin.from("entity_claim_verifications") as any).insert({
      community_member_id: memberId,
      entity_type: entityType,
      entity_id: entityId,
      code_hash: hashCode(code, memberId, entityId),
      phone_last4: last4(phone),
      expires_at: expiryFrom(now).toISOString(),
    });

    const res = await sendGhlSms({
      message: verificationSms(code, ctx.listing.name),
      phone,
      name: ctx.listing.name,
    });
    if (!res.ok) {
      console.warn("[verify-listing] send failed:", res.error);
      return NextResponse.json(
        { error: "We couldn't send the text. Try again in a minute." },
        { status: 502 }
      );
    }

    // The number is never echoed in full — only the last four, so the claimant
    // knows which phone to check without us disclosing it to them.
    return NextResponse.json({ ok: true, sentTo: last4(phone) });
  }

  // ------------------------------------------------------------- confirm ---
  if (body?.action === "confirm") {
    const memberId = ctx.memberId;

    const { data: rec } = await (admin.from("entity_claim_verifications") as any)
      .select("id, code_hash, expires_at, attempts, consumed_at")
      .eq("community_member_id", memberId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const outcome = checkCode(String(body?.code ?? ""), rec, memberId, entityId, now);

    if (!outcome.ok) {
      // Count the attempt BEFORE returning, so guessing is actually bounded.
      if (rec && outcome.reason === "wrong_code") {
        await (admin.from("entity_claim_verifications") as any)
          .update({ attempts: (rec.attempts ?? 0) + 1 })
          .eq("id", rec.id);
      }
      const message =
        outcome.reason === "expired"
          ? "That code has expired. Ask for a new one."
          : outcome.reason === "too_many_attempts"
            ? `Too many tries. Ask for a new code.`
            : outcome.reason === "no_code"
              ? "Ask for a code first."
              : `That code isn't right. ${Math.max(0, MAX_ATTEMPTS - ((rec?.attempts ?? 0) + 1))} tries left.`;
      return NextResponse.json({ error: message, reason: outcome.reason }, { status: 400 });
    }

    await (admin.from("entity_claim_verifications") as any)
      .update({ consumed_at: now.toISOString() })
      .eq("id", rec!.id);

    await (admin.from("community_member_entity_links") as any)
      .update({ verified_at: now.toISOString(), verification_method: "sms" })
      .eq("community_member_id", memberId)
      // Both, though the member id alone is unique — if the link ever moved
      // between this page loading and the code being confirmed, verifying the
      // wrong listing is the one outcome worth an extra predicate to prevent.
      .eq("entity_type", entityType)
      .eq("entity_id", entityId);

    return NextResponse.json({ ok: true, verified: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
