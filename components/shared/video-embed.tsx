"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/**
 * A YouTube embed that does not cost the page its Core Web Vitals.
 *
 * A raw <iframe src="youtube.com/embed/..."> loads roughly a megabyte of
 * JavaScript, several third-party connections and a set of cookies, on every
 * page view, whether or not anyone presses play. On the pages this is going on
 * — the kit lists are the best-performing content on the site — that is a real
 * cost paid by every visitor to serve the few who watch.
 *
 * So this is a FACADE: a poster image and a play button, which is all anyone
 * sees until they click. The iframe is created on click, with autoplay, so the
 * click that loads it is also the click that starts it. One interaction, and
 * the page stays cheap for everyone who never makes it.
 *
 * THE SCHEMA IS THE SEO PART, NOT THE EMBED. Embedding a video does not by
 * itself make a page eligible for anything; VideoObject structured data is what
 * Google reads. Google's own requirement is that the video be embedded and "not
 * hidden behind other elements" — a facade satisfies that, since the player is
 * present and visible, not display:none.
 *
 * ONE MORE THING WORTH KNOWING: Google says it "may index the video both on
 * your web page and on the third-party platform's equivalent page", and both
 * may appear. So this competes with the YouTube watch page rather than
 * replacing it, which is fine — but it is a reason to put this on a handful of
 * genuinely relevant pages rather than every page that mentions an exam.
 */

export interface VideoEmbedProps {
  videoId: string;
  /** Used as the accessible label, the schema name, and the visible caption. */
  title: string;
  description: string;
  /** ISO 8601, e.g. "PT23M30S". */
  duration: string;
  /** ISO 8601 date. */
  uploadDate: string;
  /** Why this video is on THIS page. Rendered above the player. */
  context?: string;
}

export function VideoEmbed({ videoId, title, description, duration, uploadDate, context }: VideoEmbedProps) {
  const [playing, setPlaying] = useState(false);

  // maxresdefault is the 1280x720 still. Stable URL, which is one of Google's
  // stated requirements for a video thumbnail.
  const poster = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: title,
    description,
    thumbnailUrl: [poster],
    uploadDate,
    duration,
    contentUrl: watchUrl,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
  };

  return (
    <section className="my-8 no-print">
      {context && (
        <p className="text-sm text-slate-600 leading-relaxed mb-3">{context}</p>
      )}

      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 aspect-video">
        {playing ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            // autoplay=1 because the click that mounts this IS the play click;
            // requiring a second one would read as the button not working.
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setPlaying(true);
              (window as any).innerG?.track?.("video_play", { videoId, page: typeof window !== "undefined" ? window.location.pathname : null });
            }}
            className="group absolute inset-0 h-full w-full cursor-pointer"
            aria-label={`Play: ${title}`}
          >
            <img
              src={poster}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-xl transition-transform group-hover:scale-110">
                <Play className="ml-1 h-7 w-7 fill-slate-900 text-slate-900" />
              </span>
            </span>
            <span className="absolute bottom-0 left-0 right-0 p-4 text-left">
              <span className="block text-sm font-black text-white leading-snug">{title}</span>
            </span>
          </button>
        )}
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </section>
  );
}
