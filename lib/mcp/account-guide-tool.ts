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
  return `${header}\n  Gets: ${gets}\n  Or sign up on the website: ${SITE_URL}${membershipPath(id)}${note}`;
}

export const accountGuideTool: McpTool = {
  name: "which_shearquery_account",
  title: "Which ShearQuery account someone needs",
  description:
    "Help someone choose and create the right ShearQuery account: the account types (client, student, barber, cosmetologist, barbershop, salon, supply store, school, agency), what each gets, and the questions that tell them apart. In Claude, the way to sign up is my_shearquery_account (it shows the Connect button) followed by set_my_account_type — not a website link. Ask the questions in conversation; do not guess the type from one word.",
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
      // THE CLAUDE PATH COMES FIRST. Tested 2026-09-28: given only links, Claude
      // handed a new user the website signup page three times and the Connect
      // button never appeared — it appears only when a tool that needs an
      // account is called. my_shearquery_account is that tool.
      "IF THEY'RE TALKING TO YOU IN CLAUDE, SIGN THEM UP HERE — don't send them to the website first:",
      "  1. Call my_shearquery_account. Claude shows a Connect button.",
      "  2. They tap it, create their ShearQuery account on the screen that opens, tap Allow, and come straight back to this chat.",
      "  3. Ask the questions below, confirm, and call set_my_account_type.",
      "The website links further down are the alternative, for anyone who'd rather sign up there.",
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

/** What to do right after the type is set, per type. Pages that exist today. */
const NEXT_STEP: Record<AudienceId, string> = {
  client: "They can book with a pro now — use find_pros_to_book.",
  student: `Next: set up their licence journey at ${SITE_URL}/account/journey — state, licence track, school and exam date.`,
  barber: `Next: find and claim their profile at ${SITE_URL}/search for the verified badge.`,
  cosmetologist: `Next: find and claim their profile at ${SITE_URL}/search for the verified badge.`,
  barbershop: `Next: claim the shop's listing at ${SITE_URL}/search, then my_shearquery_account shows what's connected.`,
  salon: `Next: claim the salon's listing at ${SITE_URL}/search, then my_shearquery_account shows what's connected.`,
  supply_store: `Next: claim the store's listing at ${SITE_URL}/search.`,
  school: `Next: claim the school's listing at ${SITE_URL}/search so tour requests reach them.`,
  agency: `Next: tell ShearQuery about the agency at ${SITE_URL}/account/agency — that is what gets their demo shop set up. The partner program is NOT open; never quote its terms.`,
};

/**
 * Set the signed-in person's account type — ONLY while it is empty.
 *
 * Someone who signs up on the login screen on the way to connecting Claude
 * gets no type (components/forms/CommunityMembershipForm: /login leaves it
 * empty rather than guessing). This lets Claude settle it by asking the
 * which_shearquery_account questions. It will never change a type already
 * set: the type decides plans, emails and, later, agency commission, so a
 * change is a deliberate act on the account, not something a conversation
 * does in passing.
 */
export const setMyAccountTypeTool: McpTool = {
  name: "set_my_account_type",
  title: "Set your ShearQuery account type",
  provides: "setting their account type, once, when it is empty",
  description:
    "Set the signed-in person's ShearQuery account type when it hasn't been set yet (my_shearquery_account shows it). Ask the which_shearquery_account questions first and confirm the answer with them. Refuses if a type is already set.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  inputSchema: {
    type: "object",
    properties: { account_type: { type: "string", enum: ORDER } },
    required: ["account_type"],
  },
  handler: async (args, ctx) => {
    if (!ctx.identity) return "This needs the person to be signed in to ShearQuery in this connection.";
    const id = storedAudience(String(args.account_type || ""));
    if (!id || AUDIENCES[id].status !== "live") return `"${String(args.account_type)}" isn't an account type that's open. Use which_shearquery_account.`;

    const db = (await import("@/lib/supabase/admin")).createAdminClient() as any;
    // Conditional on the column being empty, in the database: a type that is
    // already set cannot be overwritten, even by two calls racing.
    const { data: updated } = await db
      .from("community_members")
      .update({ audience: id })
      .eq("id", ctx.identity.memberId)
      .is("audience", null)
      .select("id");
    if (!updated?.length) {
      const { data } = await db.from("community_members").select("audience").eq("id", ctx.identity.memberId).maybeSingle();
      const current = storedAudience(data?.audience);
      return current
        ? `Their account is already a ${AUDIENCES[current].label} account, and Claude can't change a type once it's set. If it's wrong, they can contact ShearQuery to change it.`
        : "Couldn't set the type. Try again.";
    }
    return `Done — this is now a ${AUDIENCES[id].label} account.\n${NEXT_STEP[id]}`;
  },
};
