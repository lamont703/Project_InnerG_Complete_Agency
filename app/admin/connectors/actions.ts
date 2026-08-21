"use server";

import { fetchInstagramConnection, type InstagramConnectionView } from "@/lib/admin/instagram-connection";
import { createServerClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-allowlist";

/**
 * The connected Instagram account, for the panel on /admin/connectors.
 *
 * RE-CHECKS THE CALLER. The page it renders on is a client component, so this
 * action is reachable by anyone who can find it — a client-side gate decides
 * what to SHOW and never what to allow. This reads the access token's account
 * and the connection's health, so it verifies a real server-side session email
 * against the allowlist, the same standard /api/instagram/connect holds.
 *
 * Returns null rather than throwing on refusal: the panel simply does not
 * render, which is the correct outcome for someone who should not see it.
 */
export async function getInstagramConnection(): Promise<InstagramConnectionView | null> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdminEmail(user?.email)) return null;
  } catch {
    return null;
  }
  return fetchInstagramConnection();
}
