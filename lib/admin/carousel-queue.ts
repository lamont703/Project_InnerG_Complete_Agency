import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Reading the carousel line, for the review board.
 *
 * SEPARATE FROM lib/admin/publisher-queue.ts on purpose. That one reads a
 * video-shaped, dual-platform table; this reads an Instagram-only table of
 * image decks. Sharing a module would mean one set of types with half its
 * fields null in either direction.
 */

export interface CarouselRow {
  id: string;
  item_key: string;
  title: string;
  engine: string | null;
  image_urls: string[];
  card_count: number;
  caption: string;
  hashtags: string[];
  source_credit: string | null;
  status: "draft" | "approved" | "published" | "failed" | "skipped";
  approved_by: string | null;
  approved_at: string | null;
  instagram_media_id: string | null;
  instagram_permalink: string | null;
  instagram_error: string | null;
  published_at: string | null;
  created_at: string;
}

export interface ConnectionState {
  connected: boolean;
  username?: string;
  /** Set when the token exists but cannot be used — expired, revoked, wrong status. */
  problem?: string;
}

export async function fetchCarouselQueue(): Promise<CarouselRow[]> {
  const admin = createAdminClient();
  const { data } = await (admin.from("carousel_queue") as any)
    .select("*")
    // Drafts first: the board exists to get things reviewed, so the thing
    // needing a decision belongs at the top rather than in date order.
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(60);
  return (data ?? []) as CarouselRow[];
}

/**
 * Whether the account these would publish to is actually usable.
 *
 * Answered BEFORE anyone presses publish, because the alternative is finding
 * out after eleven image containers have been created on Instagram's side —
 * which leaves orphaned containers and a half-posted deck.
 */
export async function fetchInstagramConnection(): Promise<ConnectionState> {
  const admin = createAdminClient();
  const { data } = await (admin.from("instagram_connection") as any)
    .select("access_token, ig_user_id, username, expires_at, status")
    .eq("id", 1)
    .maybeSingle();

  if (!data?.access_token || !data?.ig_user_id) return { connected: false, problem: "not connected" };
  if (data.status !== "connected") return { connected: false, problem: `status is ${data.status}` };
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return { connected: false, problem: `token expired ${new Date(data.expires_at).toLocaleDateString()}` };
  }
  return { connected: true, username: data.username ?? undefined };
}
