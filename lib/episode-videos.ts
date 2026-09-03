/**
 * Published episodes, and the one-line reason each is on a given page.
 *
 * ONE PLACE, because the alternative is the video id and its metadata copied
 * into every page that embeds it — and then a re-upload, a title change or a
 * second episode means editing five files and missing one. A page names the
 * episode; the facts live here.
 *
 * PLACEMENT IS DELIBERATELY NARROW. Google indexes the video on the embedding
 * page AND on the YouTube watch page, and both may surface — so the same video
 * on twenty pages does not multiply anything. It splits the signal across pages
 * that are mostly irrelevant, and irrelevance is the thing being optimised
 * against. The `context` line each page passes is the test: if you cannot write
 * a true sentence explaining why a reader of THAT page wants THIS video, the
 * video does not belong on it.
 */

export interface EpisodeVideo {
  videoId: string;
  title: string;
  description: string;
  /** ISO 8601 duration. */
  duration: string;
  /** ISO 8601 date. */
  uploadDate: string;
}

export const WRITTEN_EXAM_EPISODE: EpisodeVideo = {
  videoId: "jIbLNE7vJ8o",
  title: "How to Pass the Barber & Cosmetology Written Exam (What Schools Don't Teach You)",
  description:
    "Barbers and cosmetologists pass the hands-on practical exam at roughly 92%, but first-attempt written pass rates in Texas sit near 57%. This episode covers why that gap exists — the language gap between the Milady textbook and the PSI exam, why \"overall pass rate\" hides more than it shows, and the three questions to ask a school before you enroll.",
  duration: "PT23M30S",
  uploadDate: "2026-08-15",
};

/**
 * Why this episode belongs on each page it appears on.
 *
 * Written out rather than generated, because a generic line ("watch our
 * podcast") is the tell that a video was placed for SEO rather than for the
 * reader, and it reads that way to both.
 */
export const WRITTEN_EXAM_CONTEXT = {
  practicalKit:
    "You're here for the practical, and the practical is the one most people pass — around 92%. It's the written exam that fails people, at closer to 57% first time. This episode is about why that gap exists.",
  examPrep:
    "The written exam is the one that fails people. This episode covers why candidates who can clearly do the work still fail it, and what separates schools whose students pass first time.",
  leaderboard:
    "Before reading these numbers: this episode explains why a school's \"overall pass rate\" and its first-attempt rate are different figures, and why only one of them tells you anything.",
} as const;
