import { SITE_URL } from "@/lib/site";
import type { McpTool } from "@/lib/mcp/tools";
import { AUDIENCES, membershipPath, storedAudience, type AudienceId } from "@/lib/audiences";

/**
 * Which ShearQuery account someone needs — for Claude to work out by asking.
 *
 * Built from lib/audiences.ts, never restated, so an account type added or
 * changed there reaches Claude on the next request. A planned type is
 * described honestly as not open yet, with no signup link:
 * a link to a page with no benefits is a promise nobody made.
 *
 * Public: choosing an account is what someone does BEFORE they have one.
 */

const ORDER: AudienceId[] = ["client", "student", "barber", "cosmetologist", "barbershop", "salon", "supply_store", "school", "agency"];

/** The questions that separate the types. The rules settle the edge cases the product owner decided. */
const QUESTIONS = [
  "1. Are you booking a service for yourself, or do you work in the industry? Someone only booking needs no signup — a CLIENT account is made when they book.",
  "2. Do you own or manage a business? If so, which: a barbershop, a salon (hair, nails, suites or spa), a supply store, a school, or an agency that builds AI or marketing for the trade?",
  "3. If not, are you licensed? A licensed barber is BARBER; a licensed cosmetologist, stylist, colorist, nail tech or esthetician is COSMETOLOGIST.",
  "4. Still in (or about to start) barber or cosmetology school? That is STUDENT, even if they already cut hair somewhere.",
];

const RULES = [
  "One account type per person, and the business type wins: a barber who owns the shop is BARBERSHOP; a stylist who owns the salon is SALON.",
  "Someone who rents a booth or suite but owns no business is BARBER or COSMETOLOGIST, not a business account.",
  "Ask; do not guess from one word. \"I do hair\" could be a cosmetologist, a salon owner or a student.",
];

function line(id: AudienceId): string {
  const a = AUDIENCES[id];
  const header = `${a.label.toUpperCase()} [${id}] — "${a.who}"`;
  if (a.status !== "live") {
    return `${header}\n  Not open for signup yet; say so plainly.`;
  }
  if (id === "client") {
    return `${header}\n  No signup needed: the account is made when they book an appointment, on a listing's Book button or with the booking tools in Claude.`;
  }
  const gets = a.benefits.map((b) => b.title).join("; ");
  const note = id === "agency" ? "\n  The partner program (managing clients' accounts, commission) is being built and is NOT open; never quote its terms." : "";
  return `${header}\n  Gets: ${gets}\n  Sign up: ${SITE_URL}${membershipPath(id)}${note}`;
}

export const accountGuideTool: McpTool = {
  name: "which_shearquery_account",
  title: "Which ShearQuery account someone needs",
  description:
    "Help someone choose the right ShearQuery account before they sign up: the account types (client, student, barber, cosmetologist, barbershop, salon, supply store, school, agency), what each gets, the questions that tell them apart, and the signup link. Ask the questions in conversation — do not guess the type from one word. Pass account_type to get just that type's details and link.",
  annotations: { readOnlyHint: true, openWorldHint: false },
  inputSchema: {
    type: "object",
    properties: {
      account_type: { type: "string", enum: ORDER, description: "Once decided, returns that type's details and signup link." },
    },
  },
  handler: async (args) => {
    const chosen = args.account_type ? storedAudience(String(args.account_type)) : null;
    if (chosen) return line(chosen);
    return [
      "SHEARQUERY ACCOUNT TYPES",
      "",
      "ASK THESE, in conversation, until one type fits:",
      ...QUESTIONS,
      "",
      "RULES:",
      ...RULES.map((r) => `- ${r}`),
      "",
      "THE TYPES:",
      ...ORDER.map(line),
    ].join("\n");
  },
};
