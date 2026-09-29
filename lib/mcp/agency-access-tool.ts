import type { McpTool } from "@/lib/mcp/tools";
import { SITE_URL } from "@/lib/site";

/**
 * The OWNER's side of the agency support view: whether the agency that
 * brought them in can see their account health, and the switch.
 */
export const myAgencyAccessTool: McpTool = {
  name: "my_agency_access",
  title: "Whether my agency can see my account",
  provides: "whether their agency can see their account health, and switching it on or off",
  description:
    "For a business owner who was brought to ShearQuery by an agency: whether that agency can see their account health (read-only: connections, stuck drafts, failures, plan, audit score — never their customers' details), and switching it on or off with share: true/false. Only switch it on when the owner asks to.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  inputSchema: { type: "object", properties: { share: { type: "boolean", description: "true to let the agency see, false to stop. Leave out to just check." } } },
  handler: async (args, ctx) => {
    if (!ctx.identity) return "This needs the owner to be signed in.";
    const { agencyAccessState, setAgencyAccess } = await import("@/lib/agency-support");
    if (typeof args.share === "boolean") {
      const r = await setAgencyAccess(ctx.identity.memberId, args.share);
      if (!r.ok) return r.error;
      return r.on
        ? `${r.agency} can now see this account's health, read-only. They can't change anything or see customers' details. It can be switched off any time.`
        : `${r.agency} can no longer see this account.`;
    }
    const { agency, on } = await agencyAccessState(ctx.identity.memberId);
    if (!agency) return "No agency brought this account to ShearQuery, so there's nobody to share it with.";
    return `${agency.name} brought this account to ShearQuery. Sharing is ${on ? "ON: they can see the account's health, read-only" : "OFF: they can't see this account"}. The owner can change it here or at ${SITE_URL}/account/agency-access.`;
  },
};
