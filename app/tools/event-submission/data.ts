import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface RecentEventRow {
  id: string;
  title: string;
  eventDate: string;
  city: string | null;
  category: string | null;
  sourceUrl: string;
  createdAt: string;
}

export async function getRecentEvents(): Promise<RecentEventRow[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, event_date, city, category, source_url, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    title: r.title,
    eventDate: r.event_date,
    city: r.city,
    category: r.category,
    sourceUrl: r.source_url,
    createdAt: r.created_at,
  }));
}
