"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishToInstagram } from "@/lib/instagram-publish";

/**
 * Approving, rejecting and publishing a comic carousel.
 *
 * EVERY MUTATION RE-CHECKS isAdmin(). Middleware already gates this route, but
 * it fails OPEN on an auth exception and these actions hold the service-role
 * client and can post to the live account. The route being listed in
 * INTERNAL_TOOL_ROUTES is not, on its own, enough to let something post.
 */

const PATH = "/admin/instagram-carousels";

type Result = { ok: true; message: string } | { ok: false; error: string };

async function guard(): Promise<string | null> {
  return (await isAdmin()) ? null : "not authorised";
}

/**
 * Mark a deck reviewed.
 *
 * The reviewer's identity is recorded, not just the fact of approval. A publish
 * button anyone can press with no record is how an unread deck reaches the
 * account, and "who said yes" is the only question worth asking afterwards.
 */
export async function approveCarousel(id: string): Promise<Result> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  const admin = createAdminClient();
  const { error } = await (admin.from("carousel_queue") as any)
    .update({
      status: "approved",
      approved_by: "admin",
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "draft");

  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true, message: "Approved. It can be published now." };
}

/** Reject a deck. Kept rather than deleted — the unique item_key is what stops
 *  a rejected deck quietly reappearing on the next render run. */
export async function skipCarousel(id: string): Promise<Result> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  const admin = createAdminClient();
  const { error } = await (admin.from("carousel_queue") as any)
    .update({ status: "skipped", updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["draft", "approved"]);

  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true, message: "Skipped." };
}

/** Send an approved deck back to draft, so a re-render can be re-reviewed. */
export async function unapproveCarousel(id: string): Promise<Result> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  const admin = createAdminClient();
  const { error } = await (admin.from("carousel_queue") as any)
    .update({ status: "draft", approved_by: null, approved_at: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "approved");

  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true, message: "Back to draft." };
}

export async function publishCarousel(id: string): Promise<Result> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  const admin = createAdminClient();

  /*
   * PUBLISH ONLY FROM 'approved', and the filter is on the UPDATE, not just a
   * read-then-check. Two clicks on a slow button would otherwise both pass the
   * check and both post, and Instagram would happily accept the same deck
   * twice. Claiming the row first means the second click finds nothing to claim.
   */
  const { data: claimed, error: claimErr } = await (admin.from("carousel_queue") as any)
    .update({ status: "publishing", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "approved")
    .select("*")
    .maybeSingle();

  if (claimErr) return { ok: false, error: claimErr.message };
  if (!claimed) return { ok: false, error: "Not approved, or already going out." };

  const { data: conn } = await (admin.from("instagram_connection") as any)
    .select("access_token, ig_user_id, expires_at, status")
    .eq("id", 1)
    .maybeSingle();

  const unusable =
    !conn?.access_token || !conn?.ig_user_id
      ? "Instagram is not connected"
      : conn.status !== "connected"
        ? `Instagram connection status is ${conn.status}`
        : conn.expires_at && new Date(conn.expires_at).getTime() < Date.now()
          ? "Instagram token has expired"
          : null;

  if (unusable) {
    // Put it back where it was. A connection problem is not the deck's fault
    // and should not cost the review.
    await (admin.from("carousel_queue") as any)
      .update({ status: "approved", instagram_error: unusable })
      .eq("id", id);
    revalidatePath(PATH);
    return { ok: false, error: unusable };
  }

  // Hashtags live in their own column so they can be tuned without touching the
  // story copy, and are joined on only at the moment of posting.
  const tags = (claimed.hashtags ?? []).map((h: string) => `#${h.replace(/^#/, "")}`).join(" ");
  const caption = tags ? `${claimed.caption}\n\n${tags}` : claimed.caption;

  const result = await publishToInstagram({
    igUserId: conn.ig_user_id,
    accessToken: conn.access_token,
    imageUrls: claimed.image_urls,
    caption,
  });

  if (!result.ok) {
    await (admin.from("carousel_queue") as any)
      .update({
        // Back to approved, not 'failed': the review still stands and the usual
        // cause is transient. A terminal state here would mean re-reviewing a
        // deck because Instagram had a bad minute.
        status: "approved",
        // The stage matters. lib/instagram-publish.ts reports which of the four
        // calls failed precisely because "it didn't post" is not a diagnosis —
        // a child container refusing an image is a different problem from the
        // final publish call refusing the deck.
        instagram_error: [result.stage, result.error].filter(Boolean).join(": ") || "unknown error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    revalidatePath(PATH);
    return {
      ok: false,
      error: [result.stage, result.error].filter(Boolean).join(": ") || "Instagram refused the deck",
    };
  }

  await (admin.from("carousel_queue") as any)
    .update({
      status: "published",
      instagram_media_id: result.mediaId ?? null,
      instagram_permalink: result.permalink ?? null,
      instagram_error: null,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath(PATH);
  return { ok: true, message: "Published to Instagram." };
}
