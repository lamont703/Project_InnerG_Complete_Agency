import "server-only";
import { SITE_URL } from "@/lib/site";
import type { McpTool, McpToolAnnotations } from "@/lib/mcp/tools";
import {
  approvedAgency, videoLibrary, publisherOverview, addToLine, updateLineItem, saveAgencySettings,
} from "@/lib/agency-publisher";
import { SLOT_LABEL } from "@/lib/agency-publisher-rules";

/**
 * The agency publisher in Claude (lib/agency-publisher.ts): approved agencies
 * browse ShearQuery's published videos and line them up to post to their own
 * Instagram as Reels, like /admin/content-publisher. Agencies only.
 */

const READS: McpToolAnnotations = { readOnlyHint: true, openWorldHint: false };
const WRITES: McpToolAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
const PAGE = `${SITE_URL}/account/agency/publisher`;
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");

async function gate(ctx: any): Promise<string | null> {
  if (!ctx.identity) return "This needs the agency to be signed in to ShearQuery in this connection.";
  const a = await approvedAgency(ctx.identity.memberId);
  return a.ok ? null : a.error;
}

const library: McpTool = {
  name: "agency_video_library",
  title: "ShearQuery videos an agency can repost",
  provides: "ShearQuery's published Shorts and Reels, for an agency to repost",
  description:
    "For an APPROVED AGENCY: the Shorts and Reels ShearQuery has already published, which the agency may repost to its own Instagram. Search by words in the title or caption (e.g. 'fade', 'exam', 'booth rent'). Returns each video's ref (use it with queue_agency_post), title, type, when we posted it, length, and our Instagram link to preview it.",
  requiresIdentity: true,
  annotations: READS,
  inputSchema: {
    type: "object",
    properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 30 }, offset: { type: "integer", minimum: 0 } },
  },
  handler: async (args, ctx) => {
    const no = await gate(ctx);
    if (no) return no;
    const { total, videos } = await videoLibrary({ query: args.query, limit: args.limit ?? 12, offset: args.offset ?? 0 });
    if (!videos.length) return args.query ? `No published videos match "${args.query}". Try another word, or leave the search empty.` : "No published videos yet.";
    return [
      `SHEARQUERY VIDEOS YOU CAN REPOST (${videos.length} of ${total}${args.query ? ` matching "${args.query}"` : ""})`,
      ...videos.map((v) => `  - ref ${v.ref} · ${v.title}${v.type ? ` [${v.type}]` : ""} · posted ${day(v.publishedAt)}${v.durationSecs ? ` · ${Math.round(v.durationSecs)}s` : ""}${v.instagramPermalink ? ` · preview ${v.instagramPermalink}` : v.youtubeUrl ? ` · preview ${v.youtubeUrl}` : ""}`),
      "",
      "Queue one with queue_agency_post (video = its ref). The caption starts as ours, credited to @shearquery, plus the Monday LIVE training — you can write your own.",
    ].join("\n");
  },
};

const overview: McpTool = {
  name: "my_agency_publisher",
  title: "The agency's Instagram publisher: line, schedule and results",
  provides: "the agency's publishing line, schedule, Instagram connection and recent posts",
  description:
    "For an APPROVED AGENCY: its Instagram connection, its posting schedule (9 AM / 2 PM / 7 PM ET slots), the line of posts in order with which slot each goes out in, and what has already posted or failed. Posts are Reels of ShearQuery's videos on the agency's own Instagram.",
  requiresIdentity: true,
  annotations: READS,
  inputSchema: { type: "object", properties: {} },
  handler: async (_a, ctx) => {
    const no = await gate(ctx);
    if (no) return no;
    const o = await publisherOverview(ctx.identity!.memberId);
    return [
      `INSTAGRAM: ${o.instagram.canPublish ? `connected as @${o.instagram.username} — posting on` : o.instagram.problem} ${o.instagram.canPublish ? "" : `Connect or reconnect at ${PAGE} (Instagram's own screen; until Meta's review, the account must be an Instagram Tester on ShearQuery's app).`}`.trim(),
      `SCHEDULE: ${o.settings.paused ? "PAUSED" : o.settings.slotHours.map((h) => SLOT_LABEL[h]).join(", ")} — one post per slot, front of the line first.`,
      "",
      `IN LINE (${o.queued.length})${o.queued.length ? "" : " — add videos with agency_video_library then queue_agency_post"}`,
      ...o.queued.slice(0, 20).map((q) => `  ${q.position}. [${q.ref}] ${q.video.title} — "${q.caption.split("\n")[0].slice(0, 90)}"`),
      ...(o.slots.length ? ["", "NEXT SLOTS", ...o.slots.map((s) => `  ${s.label} → ${s.title ?? "nothing in line"}`)] : []),
      ...(o.done.length ? ["", "POSTED", ...o.done.slice(0, 10).map((d) => `  - ${day(d.publishedAt)} · ${d.video.title} · ${d.status === "published" ? d.instagramPermalink ?? "published" : `FAILED: ${d.error}`}`)] : []),
      "",
      `The same publisher is on the web: ${PAGE}`,
    ].join("\n");
  },
};

const queuePost: McpTool = {
  name: "queue_agency_post",
  title: "Add a ShearQuery video to the agency's Instagram line",
  provides: "queueing a ShearQuery video to post on the agency's Instagram",
  description:
    "For an APPROVED AGENCY: add a published ShearQuery video (ref from agency_video_library) to the agency's line. It posts as a Reel on the agency's own Instagram at its turn. caption is optional — without one it starts from ours, credited to @shearquery, plus the Monday LIVE training (link in bio). position is optional (1 = next); default is the end. Confirm the video and caption with the agency first.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: WRITES,
  inputSchema: {
    type: "object",
    properties: {
      video: { type: "string", description: "The video's ref from agency_video_library." },
      caption: { type: "string", maxLength: 2200 },
      position: { type: "integer", minimum: 1 },
    },
    required: ["video"],
  },
  handler: async (args, ctx) => {
    const no = await gate(ctx);
    if (no) return no;
    const r = await addToLine(ctx.identity!.memberId, { video: String(args.video || ""), caption: args.caption ?? null, position: args.position ?? null });
    if (!r.ok) return r.error;
    const o = await publisherOverview(ctx.identity!.memberId);
    const slot = o.slots[r.position - 1];
    return [
      `Queued at position ${r.position}: ${r.title}${slot ? ` — goes out ${slot.label}` : ""}.`,
      `Caption:\n${r.caption}`,
      ...(o.instagram.canPublish ? [] : ["", `NOTE: ${o.instagram.problem} It will wait in line until Instagram is connected at ${PAGE}.`]),
    ].join("\n");
  },
};

const updatePost: McpTool = {
  name: "update_agency_post",
  title: "Edit, move or remove a post in the agency's line",
  provides: "editing the agency's queued Instagram posts",
  description:
    "For an APPROVED AGENCY: change a queued post (ref from my_agency_publisher) — a new caption, a new position (1 = next), or remove it from the line. Only posts that haven't gone out yet. Confirm with the agency first.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: WRITES,
  inputSchema: {
    type: "object",
    properties: { post: { type: "string" }, caption: { type: "string", maxLength: 2200 }, move_to: { type: "integer", minimum: 1 }, remove: { type: "boolean" } },
    required: ["post"],
  },
  handler: async (args, ctx) => {
    const no = await gate(ctx);
    if (no) return no;
    const r = await updateLineItem(ctx.identity!.memberId, String(args.post || ""), { caption: args.caption ?? null, moveTo: args.move_to ?? null, remove: args.remove === true });
    if (!r.ok) return r.error;
    return r.removed ? "Removed from the line." : "Updated. my_agency_publisher shows the line and slots.";
  },
};

const schedule: McpTool = {
  name: "set_agency_publishing_schedule",
  title: "Set when the agency's Instagram posts go out",
  provides: "setting the agency's posting slots or pausing it",
  description:
    "For an APPROVED AGENCY: which of the three daily slots it posts in — 9 AM, 2 PM, 7 PM Eastern (one post per slot) — and pause or resume posting.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: WRITES,
  inputSchema: {
    type: "object",
    properties: { slots: { type: "array", items: { type: "string", enum: ["9am", "2pm", "7pm"] } }, paused: { type: "boolean" } },
  },
  handler: async (args, ctx) => {
    const no = await gate(ctx);
    if (no) return no;
    const r = await saveAgencySettings(ctx.identity!.memberId, { slots: args.slots, paused: args.paused });
    if (!r.ok) return r.error;
    const o = await publisherOverview(ctx.identity!.memberId);
    return `Saved: ${o.settings.paused ? "posting is PAUSED" : `posting at ${o.settings.slotHours.map((h) => SLOT_LABEL[h]).join(", ")}`}.${o.slots.length ? ` Next: ${o.slots[0].label} → ${o.slots[0].title ?? "nothing in line"}.` : ""}`;
  },
};

export const AGENCY_PUBLISHER_TOOLS: McpTool[] = [library, overview, queuePost, updatePost, schedule];
