import "server-only";
import type { DueClient } from "./queue";
import type { InactiveReason } from "./notes";

/**
 * Reads the free-text notes and proposes the structured action they imply.
 *
 * WHY THIS EXISTS. The queue only ever acted on the structured fields — status,
 * snooze date, merge pointer, cadence override. Free text was shown to the
 * barber and read by nothing. That gap is not theoretical: on the first pass of
 * real notes, two of nine described an action in prose that was never applied.
 *
 *   Kedrick Emanuel  "this must be a duplicate. Kedrick came last week.
 *                     KD Emmanuel"        -> no merge set, still chased twice
 *   Amber C. Flynn    a message saying she needs a barber closer to home
 *                     and available Tuesdays -> still 'active', so the queue
 *                     would text her "you're about due" days after she said
 *                     she was stepping back
 *
 * Writing the sentence is natural. Clicking the matching action afterwards is
 * an extra step that is easy to skip, and the cost of skipping it is a message
 * that reads as though nobody was listening.
 *
 * IT PROPOSES AND NEVER APPLIES. Amber is the reason. "I may need to start
 * seeing another barber" is not "has left" — she also asked to still come for
 * her eyebrows. A model that auto-marked her inactive would be wrong in a way
 * that costs a fourteen-year relationship, and a model that left her active
 * would text her at the worst possible moment. Neither is safe to automate, so
 * the output is a suggestion with its reasoning attached and a human decides.
 *
 * Uses Gemini because that is what this repo already uses (@google/genai in
 * lib/gbp-description.ts and lib/gbp-review-replies.ts). No second provider is
 * introduced for one feature.
 */

/**
 * gemini-3.1-flash-lite, as every call site in this repo now does.
 *
 * The free-tier quota is per project PER MODEL — 20 requests a day on
 * 2.5-flash, and that bucket was already exhausted by the other features here,
 * so this agent would have 429'd on its first real run for reasons that have
 * nothing to do with it. A current model has its own budget and is a better
 * fit for a short classification job besides. Confirmed reachable on this key
 * 2026-08-20; `GET /v1beta/models?key=...` lists what the key can actually
 * call, which is worth checking before changing this rather than guessing at a
 * name.
 */
const MODEL = "gemini-3.5-flash";

export type ProposedAction = "merge" | "snooze" | "inactive" | "reduced" | "cadence" | "none";

export interface NoteProposal {
  customerId: string;
  clientName: string;
  action: ProposedAction;
  /** For "merge": the customer id this record should point at. */
  mergeTargetId?: string;
  mergeTargetName?: string;
  /** For "snooze": YYYY-MM-DD. */
  snoozeUntil?: string;
  /** For "inactive". */
  inactiveReason?: InactiveReason;
  /** For "cadence", and optionally for "reduced". */
  cadenceDays?: number;
  /** For "reduced": what they still come in for, e.g. "eyebrows". */
  reducedServices?: string;
  /** Why, in the model's words — shown to the human who decides. */
  reasoning: string;
  confidence: "high" | "medium" | "low";
}

const VALID_ACTIONS: ProposedAction[] = ["merge", "snooze", "inactive", "reduced", "cadence", "none"];
const VALID_REASONS: InactiveReason[] = [
  "moved",
  "switched_barber",
  "no_longer_local",
  "passed_away",
  "other",
];

export interface NoteAgentCandidate {
  customerId: string;
  clientName: string;
  note: string;
  currentStatus: string;
  hasMergePointer: boolean;
  cadenceDays: number;
  daysOverdue: number;
  visits: number;
  /** Current structured state, used to drop proposals that change nothing. */
  currentMergeTargetId: string | null;
  currentSnoozeUntil: string | null;
  currentCadenceOverride: number | null;
}

/**
 * Would applying this proposal actually change anything?
 *
 * The model re-proposes work that is already done — it read Anthony Bennett's
 * note "Duplicate - still comes in, books under his main account" and proposed
 * the merge that was set days earlier. Shown to a human, a suggestion that
 * changes nothing is worse than no suggestion: it costs a read, an "is this
 * already handled?" check, and a bit of trust each time.
 */
function isNoOp(p: NoteProposal, c: NoteAgentCandidate): boolean {
  if (p.action === "merge") return c.currentMergeTargetId === p.mergeTargetId;
  if (p.action === "inactive") return c.currentStatus === "inactive";
  if (p.action === "reduced") return c.currentStatus === "reduced";
  if (p.action === "snooze") return c.currentStatus === "snoozed" && c.currentSnoozeUntil === p.snoozeUntil;
  if (p.action === "cadence") return c.currentCadenceOverride === p.cadenceDays;
  return false;
}

/**
 * Validate the model's raw output into proposals we are willing to show.
 *
 * Pure and exported so the rules can be tested without an API call. Everything
 * here is a rejection rule rather than a repair: a proposal that references a
 * client who does not exist, or a merge target that is not a real record, is
 * dropped rather than guessed at. A wrong merge silently hides a paying client
 * from the queue, which is the most expensive mistake this feature can make.
 */
export function parseProposals(
  raw: unknown,
  candidates: NoteAgentCandidate[],
  roster: { customerId: string; name: string }[],
): NoteProposal[] {
  if (!Array.isArray(raw)) return [];

  const byId = new Map(candidates.map((c) => [c.customerId, c]));
  const rosterById = new Map(roster.map((r) => [r.customerId, r.name]));
  const out: NoteProposal[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;

    const customerId = typeof o.customerId === "string" ? o.customerId : "";
    const candidate = byId.get(customerId);
    if (!candidate) continue; // hallucinated or stale client

    const action = String(o.action ?? "") as ProposedAction;
    if (!VALID_ACTIONS.includes(action)) continue;
    if (action === "none") continue; // nothing to show

    const reasoning = typeof o.reasoning === "string" ? o.reasoning.trim().slice(0, 400) : "";
    if (!reasoning) continue; // a proposal with no stated reason is not reviewable

    const confidence =
      o.confidence === "high" || o.confidence === "medium" || o.confidence === "low"
        ? o.confidence
        : "low";

    const p: NoteProposal = { customerId, clientName: candidate.clientName, action, reasoning, confidence };

    if (action === "merge") {
      const target = typeof o.mergeTargetId === "string" ? o.mergeTargetId : "";
      // Must be a real record, and must not be the client themselves.
      if (!rosterById.has(target) || target === customerId) continue;
      p.mergeTargetId = target;
      p.mergeTargetName = rosterById.get(target);
    }

    if (action === "snooze") {
      const d = typeof o.snoozeUntil === "string" ? o.snoozeUntil : "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
      p.snoozeUntil = d;
    }

    if (action === "reduced") {
      if (typeof o.reducedServices === "string" && o.reducedServices.trim()) {
        p.reducedServices = o.reducedServices.trim().slice(0, 200);
      }
      const n = Number(o.cadenceDays);
      if (Number.isFinite(n) && n > 0 && n <= 730) p.cadenceDays = Math.round(n);
    }

    if (action === "inactive") {
      const r = String(o.inactiveReason ?? "other") as InactiveReason;
      p.inactiveReason = VALID_REASONS.includes(r) ? r : "other";
    }

    if (action === "cadence") {
      const n = Number(o.cadenceDays);
      if (!Number.isFinite(n) || n <= 0 || n > 730) continue;
      p.cadenceDays = Math.round(n);
    }

    if (isNoOp(p, candidate)) continue;

    out.push(p);
  }

  return out;
}

function buildPrompt(
  candidates: NoteAgentCandidate[],
  roster: { customerId: string; name: string }[],
  today: string,
): string {
  return `You are helping a barber keep his rebooking list honest.

He writes free-text notes about clients. The system only acts on structured
fields, so a note that says "this is a duplicate" does nothing unless the merge
is also set. Your job is to spot notes whose text implies an action that has NOT
been applied, and propose it.

Today is ${today}.

Actions you may propose:
- "merge"    - this record is the same person as another record. Give
               mergeTargetId, which MUST be an id from the roster below.
- "snooze"   - they are away for a knowable period and will return. Give
               snoozeUntil as YYYY-MM-DD.
- "inactive" - they have stopped coming entirely. Give inactiveReason, one of:
               moved, switched_barber, no_longer_local, passed_away, other.
- "reduced"  - STILL A CLIENT, but stepping back off their old rhythm. Use this
               whenever someone signals they will come less often, or for fewer
               services, or says they are mostly going elsewhere but asks to
               still be welcome. Prefer this over "inactive" for anyone who has
               not clearly gone. Give reducedServices if they name what they
               will still come for, and cadenceDays if a realistic longer
               interval is stated or obvious.
- "cadence"  - the note states a different real interval. Give cadenceDays.
- "none"     - the note implies nothing the structured fields are missing.

RULES:
1. Propose "none" freely. Most notes need nothing. Do not invent work.
2. If the note is ambiguous about whether someone has actually left, use
   confidence "low" and say what is ambiguous. Do not resolve it yourself.
2b. HEDGED LANGUAGE IS NOT A DECISION. "may need to", "might", "thinking about",
   "probably" mean the client has not committed, so confidence is at most
   "medium" — never "high". If they also ask to keep coming for anything at
   all, say so in the reasoning: that is a reduced relationship, not an ended
   one — propose "reduced", not "inactive".
3. Never propose merging two people who merely have similar names unless the
   note itself says they are the same person.
4. Base the proposal on what the note SAYS, not on the visit numbers.
5. Reasoning must be one short sentence, quoting the part of the note that
   justifies it.

Roster of all client records (for merge targets):
${roster.map((r) => `  ${r.customerId} = ${r.name}`).join("\n")}

Notes to review:
${candidates
  .map(
    (c) => `---
customerId: ${c.customerId}
name: ${c.clientName}
current status: ${c.currentStatus}${c.hasMergePointer ? " (already merged into another record)" : ""}
cadence: every ${c.cadenceDays} days, ${c.daysOverdue} days past it, ${c.visits} visits
note: "${c.note.replace(/"/g, "'")}"`,
  )
  .join("\n")}

Return a JSON array. One object per note, including the ones where action is "none".
Each object: {"customerId": string, "action": string, "reasoning": string,
"confidence": "high"|"medium"|"low", and whichever of mergeTargetId /
snoozeUntil / inactiveReason / cadenceDays the action needs}.`;
}

export interface NoteAgentResult {
  proposals: NoteProposal[];
  reviewed: number;
  /** Set when the model could not be reached — the UI says so rather than showing an empty result as "all clear". */
  error?: string;
}

export async function reviewNotes(
  clients: DueClient[],
  roster: { customerId: string; name: string }[],
  now: Date = new Date(),
): Promise<NoteAgentResult> {
  const candidates: NoteAgentCandidate[] = clients
    .filter((c) => c.note?.note && c.note.note.trim().length > 0)
    .map((c) => ({
      customerId: c.customerId,
      clientName: c.name,
      note: c.note!.note!,
      currentStatus: c.note!.status,
      hasMergePointer: Boolean(c.note!.mergedIntoCustomerId),
      cadenceDays: c.cadenceDays,
      daysOverdue: c.daysOverdue,
      visits: c.visits,
      currentMergeTargetId: c.note!.mergedIntoCustomerId,
      currentSnoozeUntil: c.note!.snoozeUntil,
      currentCadenceOverride: c.note!.cadenceOverrideDays,
    }));

  if (candidates.length === 0) return { proposals: [], reviewed: 0 };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { proposals: [], reviewed: candidates.length, error: "GEMINI_API_KEY is not set." };
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: buildPrompt(candidates, roster, now.toISOString().slice(0, 10)),
      config: { responseMimeType: "application/json" },
    });

    const text = (res.text || "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Even in JSON mode a model can wrap the array in prose or a fence.
      const m = text.match(/\[[\s\S]*\]/);
      if (!m) return { proposals: [], reviewed: candidates.length, error: "Model did not return JSON." };
      parsed = JSON.parse(m[0]);
    }

    return { proposals: parseProposals(parsed, candidates, roster), reviewed: candidates.length };
  } catch (e) {
    return {
      proposals: [],
      reviewed: candidates.length,
      error: e instanceof Error ? e.message : "Could not review notes.",
    };
  }
}
