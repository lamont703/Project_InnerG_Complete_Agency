import type { McpTool } from "@/lib/mcp/tools";
import { typeGuide, STATUS_LABEL } from "@/lib/account-features";

/**
 * Demo mode, from Claude: an agency (or an admin) says "show me this as a
 * salon", and every business tool answers as a made-up salon until they say
 * stop. The switch itself happens in lib/mcp/handler.ts; see lib/demo/.
 *
 * These two tools always run as the REAL signed-in member (DEMO_EXEMPT in the
 * handler) — starting a demo from inside a demo must not act on the demo
 * business, and stopping must always reach the real session.
 */

const TYPES = ["barbershop", "salon", "barber", "cosmetologist", "school", "supply_store"] as const;

/** What to try, per type — the prompts that show each feature in one line. */
const TRY: Record<(typeof TYPES)[number], string[]> = {
  barbershop: ["Audit my Google profile", "Reply to my unanswered reviews", "What's on my schedule tomorrow?", "How did my Instagram do this month?"],
  salon: ["Audit my Google profile", "Which photo categories am I missing?", "Book Keisha for a silk press Friday", "How did my Instagram do this month?"],
  barber: ["Audit my Google profile", "Write me a description for Google", "What's on my schedule this week?", "Block off next Tuesday afternoon"],
  cosmetologist: ["Audit my Google profile", "Post my Friday openings to Google", "Move my 2pm to Thursday", "Which Instagram posts brought people to book?"],
  school: ["Audit my Google profile", "Reply to my unanswered reviews", "Add a Google post about our next enrollment date", "What do people search to find us?"],
  supply_store: ["Audit my Google profile", "Update my holiday hours", "Reply to the 2-star review", "Add photos to my profile"],
};

export const startDemoTool: McpTool = {
  name: "start_demo",
  title: "Show ShearQuery as a demo business",
  provides: "demo mode: every business tool answering as a made-up business of a chosen type",
  description:
    "For AGENCY accounts (and ShearQuery admins): switch this Claude into demo mode as a made-up barbershop, salon, barber, cosmetologist, school or supply store. Every business tool then answers as that business — its Google profile, reviews, photos, posts, appointment book and Instagram — and drafting, publishing and undoing all work, but NOTHING reaches Google, Instagram or any customer. Every result is labeled DEMO. Call it again with another type to switch; fresh: true resets that demo business to how it started. Call stop_demo to leave.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  inputSchema: {
    type: "object",
    properties: {
      account_type: { type: "string", enum: [...TYPES] },
      fresh: { type: "boolean", description: "Reset this demo business to how it started (profile, drafts, history, appointments)." },
    },
    required: ["account_type"],
  },
  handler: async (args, ctx) => {
    if (!ctx.identity) return "This needs the person to be signed in to ShearQuery in this connection.";
    const { canRunDemos, isDemoType, demoLabel, startDemoSession } = await import("@/lib/demo/session");
    if (!(await canRunDemos(ctx.identity.memberId))) {
      return "Demo mode is for agency accounts. my_shearquery_account shows this account's type.";
    }
    const type = String(args.account_type || "");
    if (!isDemoType(type)) {
      return type === "student" || type === "client"
        ? `There's no demo business for a ${type} account. A student uses ShearQuery's public data tools, which work in any chat as they are; a client books with a pro, which isn't in demo mode yet.`
        : `Pick one of: ${TYPES.join(", ")}.`;
    }
    const { ensureDemoBusiness, resetDemoBusiness } = await import("@/lib/demo/businesses");
    const { demoTitle } = await import("@/lib/demo/fixtures");
    const demoMemberId = await ensureDemoBusiness(ctx.identity.memberId, type);
    if (args.fresh === true) await resetDemoBusiness(demoMemberId, type);
    await startDemoSession(ctx.identity.memberId, type);

    const testing = typeGuide(type).claude.filter((c) => c.status === "testing");
    return [
      `DEMO ON — this Claude is now showing ShearQuery as ${demoTitle(type)}, a made-up ${demoLabel(type).toLowerCase()} account.${args.fresh === true ? " Reset to how it started." : ""}`,
      "",
      "Every business tool now answers as this business. Drafts, publishing and undo all work, but nothing reaches Google, Instagram or any customer, and nobody is texted or emailed. Every answer is labeled DEMO.",
      "",
      "Things to try:",
      ...TRY[type].map((t) => `  - "${t}"`),
      ...(testing.length
        ? ["", `Say so when you show these — they're ${STATUS_LABEL.testing.toLowerCase()}: ${testing.map((c) => c.title).join("; ")}.`]
        : []),
      "",
      "To switch, start_demo with another type. To leave, stop_demo.",
    ].join("\n");
  },
};

export const stopDemoTool: McpTool = {
  name: "stop_demo",
  title: "Leave demo mode",
  provides: "leaving demo mode",
  description: "Leave demo mode. Business tools go back to answering about this account's own business. The demo business is kept, with any changes made in it, for next time.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  inputSchema: { type: "object", properties: {} },
  handler: async (_args, ctx) => {
    if (!ctx.identity) return "This needs the person to be signed in to ShearQuery in this connection.";
    const { stopDemoSession } = await import("@/lib/demo/session");
    return (await stopDemoSession(ctx.identity.memberId))
      ? "Demo off. Business tools are answering about this account again."
      : "This account wasn't in a demo.";
  },
};

export const DEMO_TOOLS: McpTool[] = [startDemoTool, stopDemoTool];

/** Tools that always see the real signed-in member, even during a demo. */
export const DEMO_EXEMPT = new Set(["start_demo", "stop_demo", "my_agency", "update_my_agency_details", "invite_client_to_shearquery", "my_agency_payouts", "client_support_view", "request_client_access", "find_prospects", "prospect_details", "prospect_live_check", "save_prospect", "my_prospects", "share_audit_link"]);
