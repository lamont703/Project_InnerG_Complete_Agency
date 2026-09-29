/**
 * The pure half of the agency support view: from a client's status, what's
 * worth the agency's help first. Tested in agency-support-rules.test.ts.
 */

export interface SupportStatus {
  googleConnection: "none" | "connected" | "needs_selection" | "error" | "revoked";
  claimedListing: boolean;
  pendingDrafts: number;
  failedChanges: { kind: string; error: string; at: string }[];
  plan: string;
  publishesLeft: number | null;
  autopilotFailures: number;
  calendar: "none" | "live" | "demo";
  textFailures: number;
  instagram: "none" | "connected" | "expired" | "error";
  auditScore: number | null;
}

/** Most urgent first. Each is something the agency can actually help the owner do. */
export function nextSteps(s: SupportStatus): string[] {
  const out: string[] = [];
  if (s.googleConnection === "revoked" || s.googleConnection === "error") {
    out.push("Their Google connection has broken. Walk them through reconnecting Google on ShearQuery (Google profile audit page) — nothing on Google can be read or changed until they do.");
  } else if (s.googleConnection === "needs_selection") {
    out.push("Google is connected but no location is chosen. They pick their business on the Google profile audit page.");
  } else if (s.googleConnection === "none") {
    out.push(s.claimedListing ? "They haven't connected Google yet. That unlocks the audit, drafts and publishing." : "They haven't claimed their listing or connected Google yet — start with claiming the listing.");
  }
  if (s.failedChanges.length) out.push(`${s.failedChanges.length} change${s.failedChanges.length === 1 ? "" : "s"} failed on Google recently — the reasons are listed; most need a small fix and redrafting.`);
  if (s.pendingDrafts) out.push(`${s.pendingDrafts} draft${s.pendingDrafts === 1 ? " is" : "s are"} waiting for them to approve. Drafts expire after 24 hours.`);
  if (s.publishesLeft === 0) out.push("They've used this month's free publishes. More waits until next month, or Manage publishes without a limit.");
  if (s.autopilotFailures) out.push(`Autopilot failed ${s.autopilotFailures} time${s.autopilotFailures === 1 ? "" : "s"} this week — usually the Google connection.`);
  if (s.textFailures) out.push(`${s.textFailures} appointment text${s.textFailures === 1 ? "" : "s"} didn't send in the last two weeks — check the numbers on those clients.`);
  if (s.instagram === "expired" || s.instagram === "error") out.push("Their Instagram connection has expired; they reconnect it on ShearQuery.");
  if (s.auditScore != null && s.auditScore < 70 && s.googleConnection === "connected") out.push(`Their Google profile scores ${s.auditScore}/100 — the audit lists the fixes, and Claude can draft most of them.`);
  if (!out.length) out.push("Nothing is stuck. Everything connected is working.");
  return out;
}
