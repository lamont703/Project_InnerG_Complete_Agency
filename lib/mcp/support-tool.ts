import "server-only";
import type { McpTool } from "@/lib/mcp/tools";
import { submitSupportMessage } from "@/lib/support";
import { SUPPORT_TOPICS, MESSAGE_MAX } from "@/lib/support-rules";

/**
 * contact_shearquery_support: any signed-in member, of any account type,
 * messages ShearQuery from Claude or the /search chat. The message is saved
 * and the owner is emailed and texted (lib/support.ts).
 */
export const supportTool: McpTool = {
  name: "contact_shearquery_support",
  title: "Message ShearQuery support",
  provides: "sending a message to ShearQuery's support team",
  description:
    "LAST RESORT, after trying to help: send a message to ShearQuery's team when the tools and your own answer can't solve it — a bug, an account or billing problem, a booking issue, or a question the tools can't answer. Any signed-in member can use it, of any account type. Write the message in the member's own words, with the details someone fixing it would need (what they tried, what happened, which page or tool). Show them the message and get their OK before sending. A person at ShearQuery reads it and replies by email.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  inputSchema: {
    type: "object",
    properties: {
      message: { type: "string", maxLength: MESSAGE_MAX, description: "What the member needs, in their words, with the details." },
      topic: { type: "string", enum: [...SUPPORT_TOPICS] },
    },
    required: ["message"],
  },
  handler: async (args, ctx) => {
    if (!ctx.identity) return "Sign in to ShearQuery first so the team knows who to reply to.";
    const door = ctx.identity.keyId === "site-chat" ? "site" : "claude";
    const r = await submitSupportMessage(ctx.identity.memberId, { message: args.message, topic: args.topic, door });
    if (!r.ok) return r.error;
    return `Sent to ShearQuery support (reference ${r.id.slice(0, 8)}). A person reads every message and replies by email, to the address on the member's account.`;
  },
};
