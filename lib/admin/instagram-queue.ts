import { createAdminClient } from "@/lib/supabase/admin";

export interface QueuedPost {
  id: string;
  post_key: string;
  concept: string | null;
  title: string;
  caption: string;
  image_urls: string[];
  tag_handles: string[];
  scheduled_for: string;
  status: string;
  permalink: string | null;
  published_at: string | null;
  error: string | null;
  overdue?: boolean;
}

/**
 * The queue, split the way a person reads it: what is late, what is next, what
 * already went out. Sorting by date alone buries an overdue post among
 * upcoming ones and it is the overdue one that needs attention.
 */
export async function fetchInstagramQueue(): Promise<{
  due: QueuedPost[]; upcoming: QueuedPost[]; done: QueuedPost[];
}> {
  const admin = createAdminClient();
  const { data } = await (admin.from("instagram_queue") as any)
    .select("*").order("scheduled_for", { ascending: true }).limit(200);

  const rows: QueuedPost[] = data || [];
  const today = new Date().toISOString().slice(0, 10);

  return {
    due: rows.filter((r) => r.status === "queued" && r.scheduled_for <= today)
             .map((r) => ({ ...r, overdue: r.scheduled_for < today })),
    upcoming: rows.filter((r) => r.status === "queued" && r.scheduled_for > today),
    done: rows.filter((r) => r.status !== "queued")
              .sort((a, b) => (b.published_at || b.scheduled_for).localeCompare(a.published_at || a.scheduled_for)),
  };
}
