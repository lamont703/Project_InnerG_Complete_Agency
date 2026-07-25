"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { entityTypeConfig } from "@/lib/ad-campaigns";
import { isAdmin } from "./auth";

export interface EntitySuggestion {
  slug: string;
  name: string;
  city: string | null;
}

/**
 * Type-ahead search for the ad-campaign form: find entities of a given type
 * whose name matches the query, returning slug + name + city so the admin can
 * pick one and auto-fill the campaign's creative (slug). Admin-only — this
 * file's only caller is the gated /admin/ad-campaigns page.
 */
export async function searchAdEntities(entityType: string, query: string): Promise<EntitySuggestion[]> {
  if (!(await isAdmin())) return [];
  const q = query.trim();
  if (q.length < 2) return [];
  const cfg = entityTypeConfig(entityType);
  if (!cfg) return [];

  const admin = createAdminClient();
  const { data, error } = await (admin as any)
    .from(cfg.table)
    .select(`slug, ${cfg.nameCol}, ${cfg.cityCol}`)
    .not("slug", "is", null)
    .ilike(cfg.nameCol, `%${q}%`)
    .limit(8);
  if (error || !data) return [];

  return (data as any[]).map((r) => ({
    slug: r.slug,
    name: r[cfg.nameCol] || "Unnamed",
    city: r[cfg.cityCol] || null,
  }));
}
