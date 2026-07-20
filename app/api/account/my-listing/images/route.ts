import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveOwnedEntity } from "@/lib/account/resolve-owned-entity";

const MAX_IMAGES = 5;

// Manages the google_images array (the same column the shop/salon
// profile page's photo gallery already reads from — see
// ShopPhotoGallery's `images` prop) for the authenticated member's own
// linked entity. Ownership is re-derived server-side on every request via
// resolveOwnedEntity(), same security model as the parent /my-listing
// route — a client can never name an entity id directly.
export async function POST(req: Request) {
  const resolved = await resolveOwnedEntity();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  if (!resolved.link) {
    return NextResponse.json({ success: false, error: "No linked business to update." }, { status: 404 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    // Optional: replace one specific existing slot instead of appending —
    // lets the UI support "swap this photo" without first deleting it.
    const slotIndexRaw = formData.get("slotIndex");
    const slotIndex = slotIndexRaw != null ? Number(slotIndexRaw) : null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided." }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "Only image files are allowed." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: entity, error: fetchError } = await (admin
      .from(resolved.table as any) as any)
      .select("google_images")
      .eq("id", resolved.link.entity_id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
    }

    const currentImages: string[] = Array.isArray(entity?.google_images) ? entity.google_images : [];
    const isReplacingSlot = slotIndex != null && slotIndex >= 0 && slotIndex < currentImages.length;

    if (!isReplacingSlot && currentImages.length >= MAX_IMAGES) {
      return NextResponse.json({ success: false, error: `Maximum of ${MAX_IMAGES} images reached — remove one first.` }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `shop-images/community-listing/${resolved.link.entity_type}-${resolved.link.entity_id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    const { error: uploadError } = await admin.storage
      .from("shop-images")
      .upload(fileName, buffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = admin.storage.from("shop-images").getPublicUrl(fileName);
    const newUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const updatedImages = isReplacingSlot
      ? currentImages.map((url, i) => (i === slotIndex ? newUrl : url))
      : [...currentImages, newUrl];

    const { error: updateError } = await (admin
      .from(resolved.table as any) as any)
      .update({ google_images: updatedImages })
      .eq("id", resolved.link.entity_id);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { images: updatedImages } });
  } catch (err: any) {
    console.error("[my-listing/images POST] Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Unexpected error." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const resolved = await resolveOwnedEntity();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  if (!resolved.link) {
    return NextResponse.json({ success: false, error: "No linked business to update." }, { status: 404 });
  }

  try {
    const { index } = await req.json();
    if (typeof index !== "number") {
      return NextResponse.json({ success: false, error: "index is required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: entity, error: fetchError } = await (admin
      .from(resolved.table as any) as any)
      .select("google_images")
      .eq("id", resolved.link.entity_id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
    }

    const currentImages: string[] = Array.isArray(entity?.google_images) ? entity.google_images : [];
    const updatedImages = currentImages.filter((_, i) => i !== index);

    const { error: updateError } = await (admin
      .from(resolved.table as any) as any)
      .update({ google_images: updatedImages })
      .eq("id", resolved.link.entity_id);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { images: updatedImages } });
  } catch (err: any) {
    console.error("[my-listing/images DELETE] Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Unexpected error." }, { status: 500 });
  }
}
