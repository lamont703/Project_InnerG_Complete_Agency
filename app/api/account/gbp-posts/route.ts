import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gbpAccessToken } from "@/lib/google-business";
import { resolveMemberContext, assertNotImpersonating } from "@/lib/account/view-as";
import { readLocationFields, writeLocalPost } from "@/lib/gbp-write";
import { buildPostAngles, validatePost, type PostContext, type PostPhoto } from "@/lib/gbp-posts";
import { upcomingHolidays } from "@/lib/us-holidays";
import {
  eventsNear, toLocalPostEvent, buildAttendanceSummary, describeDates,
  type DirectoryEvent,
} from "@/lib/gbp-post-events";
import { formatTime } from "@/lib/gbp-special-hours";

/**
 * Google Posts.
 *
 *   GET  → candidate posts, each grounded in something already on the profile
 *   POST → publish the one the owner approved
 */

export const dynamic = "force-dynamic";

const V4 = "https://mybusiness.googleapis.com/v4";
const PLACE_ACTIONS = "https://mybusinessplaceactions.googleapis.com/v1";
const READ_MASK = "title,websiteUri,serviceItems,storefrontAddress,specialHours";

async function resolveConnection() {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return { error: ctx.error, status: ctx.status } as const;

  const admin = createAdminClient();
  const { data: conn } = await (admin.from("gbp_connections") as any)
    .select("refresh_token, selected_location, locations")
    .eq("community_member_id", ctx.memberId)
    .maybeSingle();

  if (!conn?.refresh_token) return { error: "No Google Business Profile is connected.", status: 404 } as const;
  const locationName: string | null =
    conn.selected_location ||
    (Array.isArray(conn.locations) && conn.locations.length === 1 ? conn.locations[0]?.name : null);
  if (!locationName) return { error: "No location selected.", status: 409 } as const;

  try {
    const token = await gbpAccessToken(conn.refresh_token);
    const res = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    });
    const accountName = res.ok ? (await res.json())?.accounts?.[0]?.name ?? null : null;
    return { ctx, token, locationName, accountName } as const;
  } catch (e: any) {
    return { error: `Could not reach Google: ${e?.message}`, status: 502 } as const;
  }
}

/** Everything a post is allowed to draw on. */
async function gatherContext(token: string, accountName: string, locationName: string): Promise<PostContext | null> {
  const headers = { Authorization: `Bearer ${token}` };
  const [loc, reviewsRes, linksRes, mediaRes] = await Promise.all([
    readLocationFields(token, locationName, READ_MASK).catch(() => null),
    fetch(`${V4}/${accountName}/${locationName}/reviews?pageSize=25`, { headers, cache: "no-store" }),
    fetch(`${PLACE_ACTIONS}/${locationName}/placeActionLinks`, { headers, cache: "no-store" }),
    // One page is enough: a post needs one good picture, not the whole library.
    fetch(`${V4}/${accountName}/${locationName}/media?pageSize=100`, { headers, cache: "no-store" }),
  ]);
  if (!loc) return null;

  const reviews = reviewsRes.ok ? (await reviewsRes.json())?.reviews || [] : [];
  const links = linksRes.ok ? (await linksRes.json())?.placeActionLinks || [] : [];
  const booking = links.find((l: any) => l.placeActionType === "APPOINTMENT")?.uri ?? null;

  const services: string[] = (loc.serviceItems || [])
    .map((i: any) => i.freeFormServiceItem?.label?.displayName || i.structuredServiceItem?.serviceTypeId)
    .filter(Boolean)
    .map((s: string) => s.replace(/^job_type_id:/, "").replace(/_/g, " "));

  // Only a holiday the owner has actually set hours for — a post about a date
  // they haven't decided on would be us inventing their schedule.
  const periods = loc.specialHours?.specialHourPeriods || [];
  const next = upcomingHolidays(new Date(), 4);
  let upcomingHoliday: PostContext["upcomingHoliday"] = null;
  for (const h of next) {
    const p = periods.find((x: any) => {
      const d = x.startDate;
      return d && `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}` === h.date;
    });
    if (p) {
      upcomingHoliday = {
        name: h.name, date: h.date, closed: !!p.closed,
        openTime: formatTime(p.openTime), closeTime: formatTime(p.closeTime),
      };
      break;
    }
  }

  // googleUrl is the hosted copy of a photo the owner has already published, so
  // it is public and Google can fetch it when it renders the post. Anything
  // without one is skipped rather than guessed at.
  const photos: PostPhoto[] = ((mediaRes.ok ? (await mediaRes.json())?.mediaItems : []) || [])
    .filter((m: any) => m.mediaFormat === "PHOTO" && m.googleUrl)
    .map((m: any) => ({
      url: m.googleUrl,
      category: m.locationAssociation?.category ?? null,
      createTime: m.createTime ?? null,
    }));

  return {
    businessName: loc.title || "our shop",
    city: loc.storefrontAddress?.locality ?? null,
    services,
    reviews,
    bookingUrl: booking,
    websiteUrl: loc.websiteUri ?? null,
    upcomingHoliday,
    photos,
  };
}

export async function GET() {
  const resolved = await resolveConnection();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  const { token, locationName, accountName } = resolved;
  if (!accountName) return NextResponse.json({ success: false, error: "Could not resolve your Google account." }, { status: 502 });

  const context = await gatherContext(token, accountName, locationName);
  if (!context) return NextResponse.json({ success: false, error: "Could not read this location." }, { status: 502 });

  const recent = await fetch(`${V4}/${accountName}/${locationName}/localPosts?pageSize=5`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  const lastPost = recent.ok ? (await recent.json())?.localPosts?.[0]?.createTime ?? null : null;

  // Industry events near the shop, offered as candidates rather than built into
  // an angle: only the owner knows whether they're actually going, and we're
  // not going to assert attendance on someone's public listing.
  const admin = createAdminClient();
  const { data: eventRows } = await (admin.from("events") as any)
    .select("id, title, description, event_date, end_date, start_time, end_time, venue_name, city, ticket_url")
    .gte("event_date", new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10))
    .order("event_date", { ascending: true })
    .limit(200);

  const nearby = eventsNear((eventRows || []) as DirectoryEvent[], context.city).slice(0, 8).map((e) => ({
    id: e.id,
    title: e.title,
    when: describeDates(e),
    venue: e.venue_name ?? null,
    city: e.city ?? null,
    summary: buildAttendanceSummary(e, context.businessName),
  }));

  return NextResponse.json({
    success: true,
    angles: buildPostAngles(context),
    events: nearby,
    hasBookingLink: !!context.bookingUrl,
    lastPostAt: lastPost,
    // The full library, so the owner can swap the suggested photo for another
    // of their own rather than being stuck with our pick.
    photos: (context.photos ?? []).slice(0, 24),
  });
}

export async function POST(req: Request) {
  const resolved = await resolveConnection();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  const { ctx, token, locationName, accountName } = resolved;
  if (!accountName) return NextResponse.json({ success: false, error: "Could not resolve your Google account." }, { status: 502 });

  const readOnly = assertNotImpersonating(ctx);
  if (readOnly) return NextResponse.json({ success: false, error: readOnly.error }, { status: readOnly.status });

  const body = await req.json().catch(() => ({}));
  const summary = String(body?.summary || "");
  const actionType = String(body?.actionType || "LEARN_MORE");
  const url = body?.url ? String(body.url) : undefined;
  const angleId = body?.angleId ? String(body.angleId) : null;
  const photoUrl = body?.photoUrl ? String(body.photoUrl) : null;
  const eventId = body?.eventId ? String(body.eventId) : null;

  const check = validatePost(summary, { actionType: actionType as any, url });
  if (!check.ok) {
    return NextResponse.json({ success: false, error: check.issues[0]?.message, issues: check.issues }, { status: 400 });
  }

  const admin = createAdminClient();

  // The event is read from our table rather than taken from the request. The
  // client could send any title and date, and this publishes to a public
  // listing — the dates have to be the ones we hold.
  let localPostEvent = null;
  if (eventId) {
    const { data: row } = await (admin.from("events") as any)
      .select("id, title, event_date, end_date, start_time, end_time")
      .eq("id", eventId)
      .maybeSingle();
    if (!row) {
      return NextResponse.json({ success: false, error: "That event is no longer listed." }, { status: 404 });
    }
    const built = toLocalPostEvent(row);
    if (!built.event) {
      return NextResponse.json(
        { success: false, error: built.issues[0]?.message || "That event can't be posted." },
        { status: 400 }
      );
    }
    localPostEvent = built.event;
  }

  const { data: request } = await (admin.from("gbp_change_requests") as any)
    .insert({
      community_member_id: ctx.memberId,
      location_name: locationName,
      surface: "localPosts",
      proposed: { summary, actionType, url, angleId, photoUrl, eventId },
      origin: "owner-approved post",
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  const write = await writeLocalPost({
    token, accountName, locationName, summary, photoUrl,
    event: localPostEvent,
    callToAction: { actionType, url },
    memberId: ctx.memberId, note: `owner-approved post${angleId ? ` — ${angleId}` : ""}`,
  });

  if (request?.id) {
    await (admin.from("gbp_change_requests") as any)
      .update(
        write.ok
          ? { status: "applied", applied_at: new Date().toISOString(), snapshot_id: write.snapshotId }
          : { status: "failed", error: write.error, snapshot_id: write.snapshotId ?? null }
      )
      .eq("id", request.id);
  }

  if (!write.ok) return NextResponse.json({ success: false, error: write.error }, { status: 502 });
  return NextResponse.json({ success: true, postName: write.postName });
}
