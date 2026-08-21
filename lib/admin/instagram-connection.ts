import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Who is connected, and does the connection still work?
 *
 * TWO SOURCES, DELIBERATELY. The stored row says what we believe; a live call
 * to /me says what is actually true right now. Showing only the stored row is
 * how a token dies quietly — the previous one lapsed and went unnoticed for
 * three months, because nothing ever asked Instagram whether it still worked.
 * The live call is the whole point of this panel: if it fails, the connection
 * is broken NOW, whatever the database says.
 *
 * The profile is fetched rather than stored. It is display-only, it changes
 * when the account changes, and storing it would add a migration plus a
 * staleness problem to save one API call on an admin page nobody loads often.
 */

export interface InstagramProfile {
  id: string;
  userId: string | null;
  username: string | null;
  name: string | null;
  accountType: string | null;
  profilePictureUrl: string | null;
}

export interface InstagramConnectionView {
  connected: boolean;
  /** What the database believes. Present even when the live check fails. */
  storedUsername: string | null;
  storedAccountType: string | null;
  igUserId: string | null;
  status: string | null;
  scopes: string[] | null;
  expiresAt: string | null;
  /** Negative once it has lapsed. Null when there is no expiry recorded. */
  daysUntilExpiry: number | null;
  lastRefreshedAt: string | null;
  lastRefreshError: string | null;
  /** Null when the live call failed — `liveError` then says why. */
  profile: InstagramProfile | null;
  liveError: string | null;
}

const GRAPH = "https://graph.instagram.com/v25.0";

export async function fetchInstagramConnection(): Promise<InstagramConnectionView> {
  const db = createAdminClient() as any;

  const { data } = await db
    .from("instagram_connection")
    .select("access_token, ig_user_id, username, account_type, scopes, expires_at, status, last_refreshed_at, last_refresh_error")
    .eq("id", 1)
    .maybeSingle();

  const empty: InstagramConnectionView = {
    connected: false, storedUsername: null, storedAccountType: null, igUserId: null,
    status: null, scopes: null, expiresAt: null, daysUntilExpiry: null,
    lastRefreshedAt: null, lastRefreshError: null, profile: null, liveError: null,
  };

  if (!data?.access_token) return empty;

  const daysUntilExpiry = data.expires_at
    ? Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 86_400_000)
    : null;

  const base: InstagramConnectionView = {
    connected: true,
    storedUsername: data.username ?? null,
    storedAccountType: data.account_type ?? null,
    igUserId: data.ig_user_id ?? null,
    status: data.status ?? null,
    scopes: Array.isArray(data.scopes) ? data.scopes : data.scopes ? String(data.scopes).split(",") : null,
    expiresAt: data.expires_at ?? null,
    daysUntilExpiry,
    lastRefreshedAt: data.last_refreshed_at ?? null,
    lastRefreshError: data.last_refresh_error ?? null,
    profile: null,
    liveError: null,
  };

  /*
   * The live check. A failure here is information, not an exception — it is
   * precisely the state this panel exists to make visible, so it is returned
   * as `liveError` rather than thrown.
   */
  try {
    const res = await fetch(
      `${GRAPH}/me?fields=id,user_id,username,name,account_type,profile_picture_url&access_token=${encodeURIComponent(data.access_token)}`,
      { signal: AbortSignal.timeout(10_000), cache: "no-store" }
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.error) {
      return { ...base, liveError: body?.error?.message || `Instagram returned ${res.status}` };
    }
    return {
      ...base,
      profile: {
        id: body.id,
        userId: body.user_id ?? null,
        username: body.username ?? null,
        name: body.name ?? null,
        accountType: body.account_type ?? null,
        profilePictureUrl: body.profile_picture_url ?? null,
      },
    };
  } catch (err: any) {
    return { ...base, liveError: err?.message || "could not reach Instagram" };
  }
}
