import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishToInstagram } from "@/lib/instagram-publish";
import { isExpired } from "@/lib/instagram-token";
import { AGENCY_SLOT_HOURS, defaultAgencyCaption, upcomingSlots, CAPTION_MAX, parseSlotHours } from "@/lib/agency-publisher-rules";

/**
 * THE AGENCY PUBLISHER — approved agencies repost ShearQuery's videos to their
 * own Instagram as Reels, run from their Claude (lib/mcp/agency-publisher-tools.ts)
 * or /account/agency/publisher. Built to behave like /admin/content-publisher:
 * a line in order; at each of the agency's slots (9 AM / 2 PM / 7 PM ET) the
 * front of the line goes out.
 *
 * Decided with the product owner 2026-09-30:
 *  - Agencies only (approved partners).
 *  - The library is ONLY videos our content publisher has already published
 *    (publisher_queue, status published or partial, with a video file).
 *  - Instagram Reels only; auto-posting only. The agency connects its own
 *    Instagram with the publishing permission — until Meta's App Review, its
 *    account must be an Instagram Tester on our Meta app.
 *  - Nothing is copied: an agency post points at the video we already store,
 *    and Instagram fetches it from there.
 */

const db = () => createAdminClient() as any;
export const PUBLISH_SCOPE = "instagram_business_content_publish";

// ── who may use it ──────────────────────────────────────────────────────────

export async function approvedAgency(memberId: string): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const { data: m } = await db().from("community_members").select("audience").eq("id", memberId).maybeSingle();
  if (m?.audience !== "agency") return { ok: false, error: "The agency publisher is for ShearQuery agency partners." };
  const { data: p } = await db().from("agency_profiles").select("partner_status, referral_code").eq("community_member_id", memberId).maybeSingle();
  if (p?.partner_status !== "approved" || !p.referral_code) return { ok: false, error: "The agency needs to be an approved partner first — agencies are approved automatically once their details are saved." };
  return { ok: true, code: p.referral_code };
}

// ── the library: our published videos ───────────────────────────────────────

export interface LibraryVideo {
  id: string; ref: string; title: string; type: string | null; caption: string | null;
  videoUrl: string; thumbnailUrl: string | null; durationSecs: number | null;
  publishedAt: string | null; instagramPermalink: string | null; youtubeUrl: string | null;
}

const toVideo = (r: any): LibraryVideo => ({
  id: r.id, ref: String(r.id).slice(0, 8), title: r.title, type: r.video_type ?? null, caption: r.caption ?? null,
  videoUrl: r.video_url, thumbnailUrl: r.thumbnail_url ?? null, durationSecs: r.duration_secs ?? null,
  publishedAt: r.published_at ?? r.instagram_published_at ?? r.youtube_published_at ?? null,
  instagramPermalink: r.instagram_permalink ?? null, youtubeUrl: r.youtube_id ? `https://youtube.com/shorts/${r.youtube_id}` : null,
});

const LIBRARY_COLS = "id, title, video_type, caption, video_url, thumbnail_url, duration_secs, published_at, instagram_published_at, youtube_published_at, instagram_permalink, youtube_id, stat, label, question";

export async function videoLibrary(opts: { query?: string | null; limit?: number; offset?: number } = {}): Promise<{ total: number; videos: LibraryVideo[] }> {
  let q = db().from("publisher_queue").select(LIBRARY_COLS, { count: "exact" })
    .in("status", ["published", "partial"]).not("video_url", "is", null)
    .order("published_at", { ascending: false, nullsFirst: false });
  const term = String(opts.query ?? "").trim().replace(/[%_,()]/g, " ").slice(0, 60);
  if (term) q = q.or(`title.ilike.%${term}%,caption.ilike.%${term}%,video_type.ilike.%${term}%`);
  const limit = Math.min(Math.max(opts.limit ?? 12, 1), 30);
  const { data, count } = await q.range(opts.offset ?? 0, (opts.offset ?? 0) + limit - 1);
  return { total: count ?? 0, videos: (data || []).map(toVideo) };
}

/** A library video by its full id or the 8-character ref Claude is shown. Published ones only. */
async function libraryVideo(ref: string): Promise<any | null> {
  const r = String(ref || "").trim().toLowerCase();
  if (!/^[0-9a-f-]{8,36}$/.test(r)) return null;
  let q = db().from("publisher_queue").select(LIBRARY_COLS).in("status", ["published", "partial"]).not("video_url", "is", null);
  q = r.length === 36 ? q.eq("id", r) : q.gte("id", r).lt("id", r + "g").limit(2);
  const { data } = await q;
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return rows.length === 1 ? rows[0] : null;
}

// ── the agency's line ───────────────────────────────────────────────────────

export interface LineItem { id: string; ref: string; position: number; status: string; caption: string; video: LibraryVideo; instagramPermalink: string | null; error: string | null; publishedAt: string | null }

export async function agencyLine(agencyId: string) {
  const { data } = await db().from("agency_publisher_queue")
    .select(`id, position, status, caption, instagram_permalink, error, published_at, created_at, source:publisher_queue!agency_publisher_queue_source_id_fkey(${LIBRARY_COLS})`)
    .eq("agency_member_id", agencyId).order("position").order("created_at").limit(300);
  const items: LineItem[] = (data || []).map((r: any) => ({
    id: r.id, ref: String(r.id).slice(0, 8), position: r.position, status: r.status, caption: r.caption,
    video: toVideo(r.source), instagramPermalink: r.instagram_permalink, error: r.error, publishedAt: r.published_at,
  }));
  const queued = items.filter((i) => i.status === "queued");
  const done = items.filter((i) => i.status !== "queued").sort((a, b) => String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? ""))).slice(0, 30);
  return { queued, done };
}

async function renumber(agencyId: string, orderedIds: string[]) {
  for (let i = 0; i < orderedIds.length; i++) {
    await db().from("agency_publisher_queue").update({ position: i + 1, updated_at: new Date().toISOString() }).eq("id", orderedIds[i]).eq("agency_member_id", agencyId);
  }
}

export async function addToLine(agencyId: string, input: { video: string; caption?: string | null; position?: number | null }) {
  const src = await libraryVideo(input.video);
  if (!src) return { ok: false as const, error: "No published ShearQuery video matches that. Look it up in the library first." };
  const caption = (input.caption ?? "").trim() || defaultAgencyCaption(src);
  if (caption.length > CAPTION_MAX) return { ok: false as const, error: `Instagram captions are at most ${CAPTION_MAX} characters.` };
  const { queued } = await agencyLine(agencyId);
  const { data, error } = await db().from("agency_publisher_queue").insert({ agency_member_id: agencyId, source_id: src.id, caption, position: queued.length + 1 }).select("id").single();
  if (error) return { ok: false as const, error: error.message };
  const order = queued.map((q) => q.id);
  const at = input.position && input.position >= 1 ? Math.min(input.position, order.length + 1) - 1 : order.length;
  order.splice(at, 0, data.id);
  await renumber(agencyId, order);
  return { ok: true as const, id: data.id as string, position: at + 1, caption, title: src.title };
}

export async function updateLineItem(agencyId: string, itemRef: string, change: { caption?: string | null; moveTo?: number | null; remove?: boolean }) {
  const { queued } = await agencyLine(agencyId);
  const r = String(itemRef || "").trim().toLowerCase();
  const item = queued.find((q) => q.id === r || q.ref === r);
  if (!item) return { ok: false as const, error: "That isn't a post waiting in the agency's line." };
  if (change.remove) {
    await db().from("agency_publisher_queue").delete().eq("id", item.id).eq("agency_member_id", agencyId).eq("status", "queued");
    await renumber(agencyId, queued.filter((q) => q.id !== item.id).map((q) => q.id));
    return { ok: true as const, removed: true };
  }
  if (change.caption != null) {
    const c = String(change.caption).trim();
    if (!c || c.length > CAPTION_MAX) return { ok: false as const, error: `A caption needs 1 to ${CAPTION_MAX} characters.` };
    await db().from("agency_publisher_queue").update({ caption: c, updated_at: new Date().toISOString() }).eq("id", item.id).eq("agency_member_id", agencyId);
  }
  if (change.moveTo != null) {
    const order = queued.map((q) => q.id).filter((id) => id !== item.id);
    order.splice(Math.min(Math.max(Math.round(change.moveTo), 1), order.length + 1) - 1, 0, item.id);
    await renumber(agencyId, order);
  }
  return { ok: true as const, removed: false };
}

// ── schedule ────────────────────────────────────────────────────────────────

export async function agencySettings(agencyId: string): Promise<{ slotHours: number[]; paused: boolean }> {
  const { data } = await db().from("agency_publisher_settings").select("slot_hours, paused").eq("agency_member_id", agencyId).maybeSingle();
  return { slotHours: data?.slot_hours ?? [...AGENCY_SLOT_HOURS], paused: data?.paused ?? false };
}

export async function saveAgencySettings(agencyId: string, input: { slots?: unknown; paused?: unknown }) {
  const patch: Record<string, unknown> = { agency_member_id: agencyId, updated_at: new Date().toISOString() };
  if (input.slots !== undefined) {
    const hours = parseSlotHours(input.slots);
    if (!hours) return { ok: false as const, error: "Pick one or more of 9 AM, 2 PM and 7 PM Eastern." };
    patch.slot_hours = hours;
  }
  if (input.paused !== undefined) patch.paused = input.paused === true;
  const { error } = await db().from("agency_publisher_settings").upsert(patch, { onConflict: "agency_member_id" });
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

// ── their Instagram ─────────────────────────────────────────────────────────

export async function agencyInstagram(agencyId: string): Promise<{ connected: boolean; canPublish: boolean; username: string | null; problem: string | null }> {
  const { data } = await db().from("member_instagram_connections").select("username, scopes, status, expires_at, access_token, ig_user_id").eq("community_member_id", agencyId).maybeSingle();
  if (!data?.access_token || !data.ig_user_id) return { connected: false, canPublish: false, username: null, problem: "Instagram isn't connected." };
  if (data.status !== "connected" || isExpired(data.expires_at)) return { connected: true, canPublish: false, username: data.username, problem: "The Instagram connection has expired — reconnect it." };
  if (!(data.scopes || []).includes(PUBLISH_SCOPE)) return { connected: true, canPublish: false, username: data.username, problem: "Instagram is connected without posting permission — reconnect it from the agency publisher page." };
  return { connected: true, canPublish: true, username: data.username, problem: null };
}

export function easternHour(now = new Date()): { hour: number; date: string } {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(now).map((x) => [x.type, x.value]));
  return { hour: Number(p.hour) % 24, date: `${p.year}-${p.month}-${p.day}` };
}

/** Everything the page and Claude show: connection, schedule, the line with its slots, and what went out. */
export async function publisherOverview(agencyId: string) {
  const [line, settings, ig] = await Promise.all([agencyLine(agencyId), agencySettings(agencyId), agencyInstagram(agencyId)]);
  const slots = upcomingSlots({ easternHour: easternHour().hour, slotHours: settings.slotHours, paused: settings.paused, queueTitles: line.queued.map((q) => q.video.title), count: 6 });
  return { ...line, settings, instagram: ig, slots };
}

// ── posting (the cron) ──────────────────────────────────────────────────────

/** At each slot hour: for every agency using that slot, the front of its line goes to its Instagram. */
export async function runAgencySlots(now = new Date()) {
  const { hour, date } = easternHour(now);
  if (!(AGENCY_SLOT_HOURS as readonly number[]).includes(hour)) return { state: "not_a_slot", hour };
  const { data: waiting } = await db().from("agency_publisher_queue").select("agency_member_id").eq("status", "queued");
  const agencies: string[] = [...new Set<string>((waiting || []).map((r: any) => String(r.agency_member_id)))];
  const results: Record<string, string> = {};

  for (const agencyId of agencies) {
    const settings = await agencySettings(agencyId);
    if (settings.paused || !settings.slotHours.includes(hour)) continue;
    if (!(await approvedAgency(agencyId)).ok) { results[agencyId] = "not an approved agency"; continue; }
    const { data: conn } = await db().from("member_instagram_connections").select("access_token, ig_user_id, scopes, status, expires_at").eq("community_member_id", agencyId).maybeSingle();
    if (!conn?.access_token || !conn.ig_user_id || conn.status !== "connected" || isExpired(conn.expires_at) || !(conn.scopes || []).includes(PUBLISH_SCOPE)) {
      results[agencyId] = "instagram not ready"; continue; // the post waits; the page and Claude say why
    }
    // Claim the slot first, so a second cron run in the same hour can't post twice.
    const { error: claimErr } = await db().from("agency_publisher_slot_claims").insert({ agency_member_id: agencyId, slot_date: date, slot_hour: hour });
    if (claimErr) { results[agencyId] = "slot already taken"; continue; }

    const { queued } = await agencyLine(agencyId);
    const item = queued[0];
    if (!item) { results[agencyId] = "line empty"; continue; }
    await db().from("agency_publisher_slot_claims").update({ item_id: item.id }).eq("agency_member_id", agencyId).eq("slot_date", date).eq("slot_hour", hour);

    const r = await publishToInstagram({
      igUserId: conn.ig_user_id, accessToken: conn.access_token, imageUrls: [],
      videoUrl: item.video.videoUrl, coverUrl: item.video.thumbnailUrl ?? undefined, caption: item.caption,
    });
    const at = new Date().toISOString();
    await db().from("agency_publisher_queue").update(r.ok
      ? { status: "published", instagram_media_id: r.mediaId ?? null, instagram_permalink: r.permalink ?? null, published_at: at, error: null, updated_at: at }
      : { status: "failed", error: `${r.stage ?? "publish"}: ${r.error}`.slice(0, 500), published_at: at, updated_at: at }).eq("id", item.id);
    await renumber(agencyId, queued.slice(1).map((q) => q.id));
    results[agencyId] = r.ok ? "published" : `failed: ${r.error}`;
  }
  return { state: "ran", slot: `${date} ${hour}:00 ET`, results };
}
