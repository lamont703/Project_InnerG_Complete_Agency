"use client";

import { useState } from "react";
import Image from "next/image";
import { Users, GraduationCap, Store } from "lucide-react";
import { ImageLightbox } from "./image-lightbox";

interface EntityPhotoGalleryProps {
  heroPhoto: string | null;
  thumbnails: string[];
  remainingCount?: number;
  name: string;
  gridCols?: 4 | 6;
  accentFrom?: string;
  fallbackIcon?: "school" | "store" | "users";
}

const ICON_MAP = {
  school: GraduationCap,
  store: Store,
  users: Users,
};

const GRID_COLS_CLASS: Record<4 | 6, string> = {
  4: "grid-cols-4",
  6: "grid-cols-6",
};

// Shared by every entity profile page with the hero-photo-plus-thumbnails
// layout (barbers, salons, cosmetologists, stores, schools) — replaces the
// old target="_blank" links to the raw photo-CDN URL, which forced a tab
// switch and fired a page_leave event just to browse photos, with an
// inline lightbox that keeps the visitor on the page.
export function EntityPhotoGallery({
  heroPhoto,
  thumbnails,
  remainingCount = 0,
  name,
  gridCols = 6,
  accentFrom = "from-indigo-600",
  fallbackIcon = "users",
}: EntityPhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const FallbackIcon = ICON_MAP[fallbackIcon];

  const allImages = heroPhoto ? [heroPhoto, ...thumbnails] : thumbnails;

  if (!heroPhoto) {
    return (
      <div
        className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${accentFrom} to-slate-800 aspect-[16/7] flex items-center justify-center`}
      >
        <FallbackIcon className="w-16 h-16 text-white/40" />
      </div>
    );
  }

  // unoptimized on every image here — Vercel's Image Optimization has a
  // monthly quota on distinct source images, and it's been exceeded
  // (confirmed live: production's /_next/image returns 402
  // OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED for these), which showed up
  // as blank thumbnails that only "fixed themselves" when clicked into
  // the lightbox — that path was already using a raw <img>, bypassing
  // Vercel's optimizer entirely. These are already served from real CDNs
  // (Supabase storage, Booksy's CloudFront, Google's photo CDN), so they
  // don't need Vercel re-optimizing them anyway.
  return (
    <>
      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          aria-label="View main photo in gallery"
          className="block w-full aspect-[16/10] bg-slate-100 relative"
        >
          <Image
            src={heroPhoto}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 66vw"
            unoptimized
          />
        </button>
        {thumbnails.length > 0 && (
          <div className={`grid ${GRID_COLS_CLASS[gridCols]} gap-0.5 p-0.5 bg-slate-100`}>
            {thumbnails.map((url, i) => {
              const isLast = i === thumbnails.length - 1 && remainingCount > 0;
              return (
                <button
                  type="button"
                  key={url}
                  onClick={() => setLightboxIndex(i + 1)}
                  aria-label={`View photo ${i + 2} in gallery`}
                  className="relative aspect-square overflow-hidden bg-slate-200 group"
                >
                  <Image
                    src={url}
                    alt={`${name} photo ${i + 2}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes={gridCols === 6 ? "16vw" : "25vw"}
                    unoptimized
                  />
                  {isLast && (
                    <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white font-bold text-sm">
                      +{remainingCount}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={allImages}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          alt={name}
        />
      )}
    </>
  );
}
