import type { McpTool } from "@/lib/mcp/tools";
import { SITE_URL } from "@/lib/site";

/**
 * Autopilot from Claude: what it's set to, what it did, and the switches.
 * The work itself runs hourly (app/api/cron/autopilot); these only read and
 * change the settings.
 */

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

async function planLine(memberId: string) {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { data } = await (createAdminClient().from("community_members") as any).select("plan").eq("id", memberId).maybeSingle();
  return data?.plan === "autopilot"
    ? "Autopilot is ON (Autopilot plan)."
    : `Autopilot is OFF: it runs on the Autopilot plan, and this account isn't on it. Settings can be made now and apply once it is (${SITE_URL}/account/plan).`;
}

export const myAutopilotTool: McpTool = {
  name: "my_autopilot",
  title: "My Autopilot: settings and what it did",
  provides: "what Autopilot is set to do and a log of what it did",
  description:
    "What Autopilot does for this owner and what it has done: replies to 4-5 star reviews (published on their own, in the owner's voice), one Google post a week (sent to the owner a day ahead so they can cancel), a Monday report and a daily digest. Reviews under 4 stars are never auto-replied. Anything Autopilot published can be undone with undo_change (see my_changes).",
  requiresIdentity: true,
  annotations: { readOnlyHint: true, openWorldHint: false },
  inputSchema: { type: "object", properties: {} },
  handler: async (_args, ctx) => {
    if (!ctx.identity) return "This needs the owner to be signed in.";
    const { getAutopilotSettings, recentAutopilotActions } = await import("@/lib/autopilot/run");
    const [s, actions, plan] = await Promise.all([getAutopilotSettings(ctx.identity.memberId), recentAutopilotActions(ctx.identity.memberId, 15), planLine(ctx.identity.memberId)]);
    const yn = (b: boolean) => (b ? "on" : "off");
    return [
      plan,
      "",
      "SETTINGS",
      `  Replies to 4-5 star reviews: ${yn(s.review_replies)}`,
      `  Weekly Google post: ${yn(s.weekly_posts)}${s.weekly_posts ? ` (${DAYS[s.post_weekday]}s, UTC)` : ""}`,
      `  Monday report: ${yn(s.weekly_report)}`,
      "",
      `RECENT (${actions.length})`,
      ...(actions.length
        ? actions.map((a) => `  - ${a.created_at.slice(0, 16).replace("T", " ")} · ${a.kind.replace("_", " ")} · ${a.status}${a.summary ? ` · ${a.summary}` : ""}${a.detail ? `\n      "${a.detail.slice(0, 240)}"` : ""}`)
        : ["  nothing yet"]),
      "",
      `Settings can also be changed at ${SITE_URL}/account/autopilot.`,
    ].join("\n");
  },
};

export const updateAutopilotSettingsTool: McpTool = {
  name: "update_autopilot_settings",
  title: "Change Autopilot settings",
  provides: "turning Autopilot's jobs on or off",
  description:
    "Turn Autopilot's jobs on or off: review_replies (auto-replies to 4-5 star reviews), weekly_posts (one Google post a week, with a day's notice), weekly_report (Monday email), and post_weekday (0 = Sunday … 6 = Saturday). Only the settings passed change. Confirm with the owner before turning a job on.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  inputSchema: {
    type: "object",
    properties: {
      review_replies: { type: "boolean" },
      weekly_posts: { type: "boolean" },
      weekly_report: { type: "boolean" },
      post_weekday: { type: "integer", minimum: 0, maximum: 6 },
    },
  },
  handler: async (args, ctx) => {
    if (!ctx.identity) return "This needs the owner to be signed in.";
    const { saveAutopilotSettings } = await import("@/lib/autopilot/run");
    const s = await saveAutopilotSettings(ctx.identity.memberId, args);
    return `Saved. Review replies ${s.review_replies ? "on" : "off"}, weekly post ${s.weekly_posts ? `on (${DAYS[s.post_weekday]}s)` : "off"}, Monday report ${s.weekly_report ? "on" : "off"}.\n${await planLine(ctx.identity.memberId)}`;
  },
};

export const AUTOPILOT_TOOLS: McpTool[] = [myAutopilotTool, updateAutopilotSettingsTool];
