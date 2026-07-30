import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveOwnedProfessional } from "@/lib/account/resolve-owned-entity";
import { assertNotImpersonating } from "@/lib/account/view-as";

/**
 * Portfolio photo upload for a claimed barber or cosmetologist profile.
 *
 * Mirrors /api/account/my-listing/images, with two deliberate differences:
 *
 *   • It writes `portfolio_images`, not `booksy_gallery_urls`. A Booksy
 *     re-scrape overwrites that column wholesale, so anything a member uploaded
 *     into it would silently disappear the next time the scraper ran.
 *   • Ownership comes from resolveOwnedProfessional(), so a shop owner can't
 *     post photos onto a stylist's profile and vice versa.
 *
 * Ownership is re-derived from the session on every request — a client can never
 * name a profile id.
 */

const MAX_IMAGES = 6;
const BUCKET = "shop-images";

async function currentImages(admin: any, table: string, id: string) {
  const { data, error } = await admin.from(table).select("portfolio_images").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return Array.isArray(data?.portfolio_images) ? (data.portfolio_images as string[]) : [];
}

export async function POST(req: Request) {
  const resolved = await resolveOwnedProfessional();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  if (!resolved.link) {
    return NextResponse.json({ success: false, error: "No professional profile linked to this account." }, { status: 404 });
  }
  // View As is read-only — an admin looking at a member's account must not be
  // able to rewrite their record from it (lib/account/view-as.ts, property 2).
  const readOnly = assertNotImpersonating(resolved);
  if (readOnly) {
    return NextResponse.json({ success: false, error: readOnly.error }, { status: readOnly.status });
  }


  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    // Optional: overwrite one existing slot rather than appending, so the UI can
    // offer "swap this photo" without a delete-then-upload round trip.
    const slotRaw = formData.get("slotIndex");
    const slotIndex = slotRaw != null ? Number(slotRaw) : null;

    if (!file) return NextResponse.json({ success: false, error: "No file provided." }, { status: 400 });
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "Only image files are allowed." }, { status: 400 });
    }

    const admin = createAdminClient();
    const images = await currentImages(admin, resolved.table as string, resolved.link.entity_id);
    const replacing = slotIndex != null && slotIndex >= 0 && slotIndex < images.length;

    if (!replacing && images.length >= MAX_IMAGES) {
      return NextResponse.json(
        { success: false, error: `Maximum of ${MAX_IMAGES} photos — remove one first.` },
        { status: 400 }
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const path = `professional-portfolio/${resolved.link.entity_type}-${resolved.link.entity_id}-${Date.now()}-${safeName}`;

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: true });
    if (uploadError) {
      console.error("[my-professional-listing/images] upload failed:", uploadError.message);
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 });
    }

    const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    // Cache-buster so a replaced slot doesn't keep showing the old image.
    const newUrl = `${publicUrl}?t=${Date.now()}`;

    const updated = replacing ? images.map((u, i) => (i === slotIndex ? newUrl : u)) : [...images, newUrl];

    const { error: updateError } = await (admin.from(resolved.table as any) as any)
      .update({ portfolio_images: updated, updated_at: new Date().toISOString() })
      .eq("id", resolved.link.entity_id);
    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { images: updated } });
  } catch (err: any) {
    console.error("[my-professional-listing/images POST]", err?.message);
    return NextResponse.json({ success: false, error: err?.message || "Unexpected error." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const resolved = await resolveOwnedProfessional();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  if (!resolved.link) {
    return NextResponse.json({ success: false, error: "No professional profile linked to this account." }, { status: 404 });
  }
  // View As is read-only — an admin looking at a member's account must not be
  // able to rewrite their record from it (lib/account/view-as.ts, property 2).
  const readOnly = assertNotImpersonating(resolved);
  if (readOnly) {
    return NextResponse.json({ success: false, error: readOnly.error }, { status: readOnly.status });
  }


  try {
    const { index } = await req.json().catch(() => ({}));
    if (typeof index !== "number") {
      return NextResponse.json({ success: false, error: "index is required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const images = await currentImages(admin, resolved.table as string, resolved.link.entity_id);
    const updated = images.filter((_, i) => i !== index);

    const { error } = await (admin.from(resolved.table as any) as any)
      .update({ portfolio_images: updated, updated_at: new Date().toISOString() })
      .eq("id", resolved.link.entity_id);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data: { images: updated } });
  } catch (err: any) {
    console.error("[my-professional-listing/images DELETE]", err?.message);
    return NextResponse.json({ success: false, error: err?.message || "Unexpected error." }, { status: 500 });
  }
}
