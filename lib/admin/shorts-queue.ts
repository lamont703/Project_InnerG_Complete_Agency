import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The YouTube Shorts publishing queue, for the internal queue page.
 *
 * READ-ONLY HERE. Queueing happens in scripts/shorts/queue_shorts.js and
 * publishing in publish_due.js — this file only shows what is scheduled, so a
 * page load can never change what goes out.
 */

export interface QueuedShort {
  id: string;
  cardKey: string;
  title: string;
  stat: string | null;
  label: string | null;
  question: string | null;
  videoUrl: string | null;
  scheduledFor: string;
  status: "queued" | "published" | "skipped" | "failed";
  youtubeId: string | null;
  publishedAt: string | null;
  error: string | null;
  /** True when the date has arrived and it still has not gone out. */
  overdue: boolean;
}

export interface ShortsQueue {
  due: QueuedShort[];
  upcoming: QueuedShort[];
  published: QueuedShort[];
  problems: QueuedShort[];
}

/** Today in Central, where the audience and the data are. */
function todayCentral(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function fetchShortsQueue(): Promise<ShortsQueue> {
  const db = createAdminClient();
  const today = todayCentral();

  const { data, error } = await db
    .from("shorts_queue")
    .select("id, card_key, title, stat, label, question, video_url, scheduled_for, status, youtube_id, published_at, error")
    .order("scheduled_for", { ascending: true })
    .limit(200);

  if (error || !data) return { due: [], upcoming: [], published: [], problems: [] };

  const rows: QueuedShort[] = data.map((r: any) => ({
    id: r.id,
    cardKey: r.card_key,
    title: r.title,
    stat: r.stat,
    label: r.label,
    question: r.question,
    videoUrl: r.video_url,
    scheduledFor: r.scheduled_for,
    status: r.status,
    youtubeId: r.youtube_id,
    publishedAt: r.published_at,
    error: r.error,
    overdue: r.status === "queued" && r.scheduled_for < today,
  }));

  return {
    /**
     * Due and overdue together, oldest first. An overdue Short is the thing
     * this page exists to surface — a queue that hides a missed day looks
     * healthier the worse it is doing.
     */
    due: rows.filter((r) => r.status === "queued" && r.scheduledFor <= today),
    upcoming: rows.filter((r) => r.status === "queued" && r.scheduledFor > today),
    published: rows.filter((r) => r.status === "published").reverse(),
    problems: rows.filter((r) => r.status === "failed" || r.status === "skipped"),
  };
}
