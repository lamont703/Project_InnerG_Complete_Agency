"use client";

import { useState } from "react";
import Image from "next/image";
import { Scissors } from "lucide-react";
import { ImageLightbox } from "./image-lightbox";

interface ShopPhotoGalleryProps {
  images: string[];
  shopName: string;
  badgeLabel: string;
  badgeVariant: "available" | "off-market";
}

// Preserves the shop page's distinct masonry/carousel layout (badge
// overlay on the primary photo) while swapping the old target="_blank"
// raw-CDN-URL links for an inline lightbox, same as EntityPhotoGallery
// does for the other 5 entity page types.
export function ShopPhotoGallery({ images, shopName, badgeLabel, badgeVariant }: ShopPhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // unoptimized on every image here — Vercel's Image Optimization has a
  // monthly quota on distinct source images, and it's been exceeded
  // (confirmed live: production's /_next/image returns 402
  // OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED for these), which showed up
  // as blank thumbnails that only "fixed themselves" when clicked into
  // the lightbox — that path was already using a raw <img>, bypassing
  // Vercel's optimizer entirely. These are already served from Booksy's
  // CloudFront CDN, so they don't need Vercel re-optimizing them anyway.
  return (
    <>
      <div className="flex md:grid overflow-x-auto md:overflow-hidden snap-x snap-mandatory md:snap-none md:grid-cols-4 md:grid-rows-2 gap-2 h-64 md:h-[60vh] rounded-none md:rounded-3xl mb-8 md:mb-12 scrollbar-hide -mx-4 md:mx-0 px-4 md:px-0">
        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          className="md:col-span-2 row-span-2 relative h-full shrink-0 aspect-square md:aspect-auto md:w-auto snap-center rounded-2xl md:rounded-none overflow-hidden border border-slate-200 md:border-none shadow-sm md:shadow-none text-left"
        >
          <Image
            src={images[0]}
            alt={`${shopName} primary photo`}
            fill
            className="object-cover hover:scale-105 transition-transform duration-700"
            sizes="(max-width: 768px) 100vw, 50vw"
            unoptimized
          />
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            {badgeVariant === "available" ? (
              <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                {badgeLabel}
              </span>
            ) : (
              <span className="px-3 py-1 bg-white text-slate-700 border border-slate-200 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                {badgeLabel}
              </span>
            )}
          </div>
        </button>
        {images.slice(1, 5).map((imgUrl, idx) => (
          <button
            type="button"
            key={idx}
            onClick={() => setLightboxIndex(idx + 1)}
            className="relative h-full overflow-hidden shrink-0 aspect-square md:aspect-auto md:w-auto snap-center rounded-2xl md:rounded-none border border-slate-200 md:border-none shadow-sm md:shadow-none"
          >
            <Image
              src={imgUrl}
              alt={`${shopName} view ${idx + 2}`}
              fill
              className="object-cover hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 768px) 50vw, 25vw"
              unoptimized
            />
          </button>
        ))}
        {images.length < 5 &&
          Array.from({ length: 5 - images.length }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="hidden md:flex relative h-full bg-slate-100 items-center justify-center border border-slate-200/50"
            >
              <Scissors className="w-8 h-8 text-slate-300 opacity-50" />
            </div>
          ))}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={images}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          alt={shopName}
        />
      )}
    </>
  );
}
