import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The content publishing line, for the internal publisher page.
 *
 * READ-ONLY HERE, the same discipline lib/admin/shorts-queue.ts keeps: a page
 * load must never be able to change what goes out. Reordering is a server
 * action in app/admin/content-publisher/actions.ts, and publishing is the cron
 * route - both are explicit writes someone asked for.
 */

export type PublisherStatus = "queued" | "published" | "partial" | "failed" | "skipped";

/**
 * One platform's result, as the cron wrote it.
 *
 * Structurally the same union as Outcome in lib/admin/publisher-targets.ts and
 * deliberately redeclared rather than imported: that module pulls in every
 * publisher (and through them the Google and LinkedIn clients), and this file is
 * imported by a page. A type-only import would be erased, but the coupling
 * invites someone to reach for a value later and drag the whole chain into the
 * page bundle.
 */
export type PublisherOutcome =
  | { ok: true; id: string; url?: string; note?: string }
  | { ok: false; error: string }
  | { skipped: string };

export interface PublisherItem {
  id: string;
  itemKey: string;
  title: string;
  /**
   * The pipeline this card is for, as STATED by whoever queued it. Null means
   * derive it — lib/video-type.js falls back to `stat` then the title shape.
   * The Render button reads the same resolver, so its label and price cannot
   * disagree with what actually runs.
   */
  videoType: string | null;
  stat: string | null;
  label: string | null;
  question: string | null;
  videoUrl: string | null;
  /** Cover JPEG, used as the card's poster and as the Reel's cover_url. */
  thumbnailUrl: string | null;
  caption: string | null;
  position: number;
  status: PublisherStatus;
  youtubeId: string | null;
  youtubeError: string | null;
  instagramMediaId: string | null;
  instagramPermalink: string | null;
  instagramError: string | null;
  /**
   * Per-platform outcome, keyed by platform, for everything the fan-out
   * touched. Rows published before the fan-out have an empty object here and
   * carry their outcome only in the youtube and instagram fields above, which
   * is why the board falls back to those rather than trusting this to be
   * populated.
   */
  results: Record<string, PublisherOutcome>;
  publishedAt: string | null;
  /**
   * True when the row is queued but has no video. It can never publish, and it
   * will sit at the front of the line blocking everything behind it if it ever
   * reaches position 1 - so the page has to say so rather than showing it as
   * an ordinary card.
   */
  unpublishable: boolean;
}

export interface PublisherQueue {
  queued: PublisherItem[];
  done: PublisherItem[];
  /** Next three posting slots, already resolved to Eastern wall-clock. */
  upcomingSlots: { label: string; itemTitle: string | null }[];
}

/** The three daily slots, in Eastern. Kept here so the page and the cron agree. */
export const SLOT_HOURS_ET = [9, 14, 19] as const;

const SLOT_LABELS: Record<number, string> = { 9: "9:00 AM ET", 14: "2:00 PM ET", 19: "7:00 PM ET" };

function nowEasternParts(): { hour: number; date: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return {
    hour: Number(parts.hour),
    date: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

/**
 * Which slots are still ahead, and what would go out in each.
 *
 * Deliberately shows the MAPPING and not just the times. "Next post: 2pm" tells
 * you nothing you could act on; "2pm -> this specific video" is the thing worth
 * checking before it is too late to change it, and it is the reason the order
 * on this page is worth setting by hand at all.
 */
function resolveUpcomingSlots(queued: PublisherItem[]): { label: string; itemTitle: string | null }[] {
  const { hour } = nowEasternParts();
  const remainingToday = SLOT_HOURS_ET.filter((h) => h > hour);
  const sequence = [
    ...remainingToday.map((h) => ({ h, day: "Today" })),
    ...SLOT_HOURS_ET.map((h) => ({ h, day: "Tomorrow" })),
  ].slice(0, 3);

  /**
   * Only items that can actually publish. The cron skips rows with no video
   * rather than burning a slot on them, so counting them here would show a
   * video-less row as "next out" when the thing that will really go out is the
   * one behind it. The two must agree or this panel is a lie.
   */
  const publishable = queued.filter((i) => !i.unpublishable);

  return sequence.map((s, i) => ({
    label: `${s.day} ${SLOT_LABELS[s.h]}`,
    itemTitle: publishable[i]?.title ?? null,
  }));
}

export async function fetchPublisherQueue(): Promise<PublisherQueue> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("publisher_queue")
    .select(
      // thumbnail_url was mapped below but never selected, so every poster was
      // null and the board fell back to loading video metadata to show a first
      // frame. A field that is mapped but not selected fails silently — the
      // page renders, it is just quietly worse.
      "id, item_key, title, video_type, stat, label, question, video_url, thumbnail_url, caption, position, status, youtube_id, youtube_error, instagram_media_id, instagram_permalink, instagram_error, results, published_at"
    )
    .order("position", { ascending: true })
    .limit(300);

  if (error || !data) return { queued: [], done: [], upcomingSlots: [] };

  const rows: PublisherItem[] = data.map((r: any) => ({
    id: r.id,
    itemKey: r.item_key,
    title: r.title,
    videoType: r.video_type ?? null,
    stat: r.stat,
    label: r.label,
    question: r.question,
    videoUrl: r.video_url,
    thumbnailUrl: r.thumbnail_url ?? null,
    caption: r.caption,
    position: r.position,
    status: r.status,
    youtubeId: r.youtube_id,
    youtubeError: r.youtube_error,
    instagramMediaId: r.instagram_media_id,
    instagramPermalink: r.instagram_permalink,
    instagramError: r.instagram_error,
    results: (r.results ?? {}) as Record<string, PublisherOutcome>,
    publishedAt: r.published_at,
    unpublishable: r.status === "queued" && !r.video_url,
  }));

  const queued = rows.filter((r) => r.status === "queued");

  return {
    queued,
    /**
     * Everything that has left the line, newest first - including 'partial'.
     * A partial belongs with the finished work rather than in a problems bin:
     * it did publish, on one platform, and filing it as a failure would make
     * the queue look emptier than it is and invite a duplicate re-post.
     */
    done: rows
      .filter((r) => r.status !== "queued")
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")),
    upcomingSlots: resolveUpcomingSlots(queued),
  };
}

/**
 * The state of every destination the fan-out can reach.
 *
 * WHY THIS IS ON THE PAGE AT ALL. A platform that is not connected is skipped
 * silently and correctly — the post still goes out everywhere else, and the row
 * reads 'published'. That is the right behaviour and it is also how a
 * destination can quietly stop publishing for a month without anyone noticing.
 * Showing the connections beside the queue is what makes the silence visible.
 *
 * NO TOKENS ARE SELECTED. The columns are named explicitly rather than with *,
 * because this feeds a rendered page and access_token / refresh_token have no
 * business leaving the database.
 */
export interface PublisherConnectionView {
  platform: string;
  enabled: boolean;
  status: string;
  accountLabel: string | null;
  lastError: string | null;
  lastPublishedAt: string | null;
  expiresAt: string | null;
}

export async function fetchPublisherConnections(): Promise<PublisherConnectionView[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("publisher_connections")
    .select("platform, enabled, status, account_label, last_error, last_published_at, expires_at")
    .order("platform", { ascending: true });

  if (error || !data) return [];

  return (data as any[]).map((r) => ({
    platform: r.platform,
    enabled: r.enabled,
    status: r.status,
    accountLabel: r.account_label,
    lastError: r.last_error,
    lastPublishedAt: r.last_published_at,
    expiresAt: r.expires_at,
  }));
}
