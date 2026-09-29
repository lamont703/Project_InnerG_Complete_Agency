import type { McpTool } from "@/lib/mcp/tools";
import { NEEDS, PIPELINE_STATUSES, PROSPECT_TYPES, STATUS_LABEL, LIVE_CHECKS_PER_DAY, liveChecksEnabled, type Need, type PipelineStatus, type ProspectType } from "@/lib/prospecting-rules";

/**
 * Prospecting from Claude, for APPROVED agencies (lib/prospecting.ts).
 * Contact details are phone and website only — never email.
 */

async function approvedAgency(memberId: string): Promise<string | null> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { data } = await (createAdminClient().from("agency_profiles") as any).select("partner_status").eq("community_member_id", memberId).maybeSingle();
  if (!data) return "Prospecting is for agency accounts.";
  return data.partner_status === "approved" ? null : "Prospecting opens once ShearQuery approves the agency.";
}

const common = { requiresIdentity: true } as const;

export const findProspectsTool: McpTool = {
  ...common,
  name: "find_prospects",
  title: "Find businesses to pitch",
  provides: "businesses in the directory worth pitching, ranked by need, with phone and website",
  description:
    "For an APPROVED agency: find barbershops, salons, schools or supply stores in a city or ZIP that aren't on ShearQuery yet and could use help, ranked by need: few Google reviews for their city, a low rating, stalled reviews, no website in our directory (plus open booths, a sign a shop is growing). Each result has its id (for prospect_details / save_prospect), phone, website, links, and the date the data is from. Uses ShearQuery's own directory — free. Never shows email addresses.",
  annotations: { readOnlyHint: true, openWorldHint: false },
  inputSchema: {
    type: "object",
    properties: {
      business_type: { type: "string", enum: Object.keys(PROSPECT_TYPES) },
      city: { type: "string", description: "e.g. Houston" },
      zip: { type: "string", description: "A 5-digit ZIP, instead of or as well as a city." },
      needs: { type: "array", items: { type: "string", enum: [...NEEDS] }, description: "Only businesses with ALL of these." },
      limit: { type: "integer", minimum: 1, maximum: 25, description: "Default 15." },
    },
    required: ["business_type"],
  },
  handler: async (args, ctx) => {
    if (!ctx.identity) return "This needs the agency to be signed in.";
    const blocked = await approvedAgency(ctx.identity.memberId);
    if (blocked) return blocked;
    if (!args.city && !args.zip) return "Give a city or a ZIP to search.";
    const { findProspects } = await import("@/lib/prospecting");
    const r = await findProspects({ agencyMemberId: ctx.identity.memberId, type: args.business_type as ProspectType, city: args.city, zip: args.zip, needs: (args.needs || []) as Need[], limit: args.limit });
    if (!r.prospects.length) return `No ${String(args.business_type).replace("_", " ")} prospects matched in ${args.city || args.zip} (looked at ${r.looked}).`;
    return [
      `PROSPECTS — ${r.matched} of ${r.looked} ${String(args.business_type).replace("_", " ")}s in ${[args.city, args.zip].filter(Boolean).join(" ")} could use help and aren't on ShearQuery yet; top ${r.prospects.length}:`,
      "",
      ...r.prospects.map((p, i) => [
        `${i + 1}. ${p.name} — ${p.typeLabel}, ${p.city ?? "?"}${p.savedStatus ? ` [in your pipeline: ${STATUS_LABEL[p.savedStatus]}]` : ""}`,
        `   id ${p.ref}`,
        `   why: ${p.signals.map((s) => s.text).join("; ")}`,
        `   phone ${p.phone ?? "—"} · website ${p.website ?? "—"}${p.mapsUrl ? ` · ${p.mapsUrl}` : ""}`,
        `   data as of ${p.dataAsOf ?? "unknown"}`,
      ].join("\n")),
      "",
      liveChecksEnabled()
        ? "This is ShearQuery's directory data, not a live look at Google. prospect_live_check confirms a business's current rating, reviews and website before pitching (capped per day)."
        : "This is ShearQuery's directory data, not a live look at Google — each result shows its date. Numbers may have moved since; the Google Maps link shows the business as it is now.",
    ].join("\n");
  },
};

export const prospectDetailsTool: McpTool = {
  ...common,
  name: "prospect_details",
  title: "A prospect's audit and talking points",
  provides: "a prospect's contact details and public Google audit from stored data, as talking points",
  description:
    "For an APPROVED agency: one business's contact details (phone, website — never email) and its Google profile audit from ShearQuery's stored data, with the date that data is from. Use the findings as talking points and to draft the agency's intro message. Free. Pass the id from find_prospects, or the business's name.",
  annotations: { readOnlyHint: true, openWorldHint: false },
  inputSchema: { type: "object", properties: { prospect: { type: "string", description: "An id like shop:marcus-cuts-houston-1a2b, or a business name." } }, required: ["prospect"] },
  handler: async (args, ctx) => {
    if (!ctx.identity) return "This needs the agency to be signed in.";
    const blocked = await approvedAgency(ctx.identity.memberId);
    if (blocked) return blocked;
    const { prospectDetails } = await import("@/lib/prospecting");
    const r = await prospectDetails(ctx.identity.memberId, args.prospect);
    if ("error" in r) return r.error;
    const p = r.prospect;
    const findings = (r.audit?.checks || []).filter((c) => c.status === "fail" || c.status === "warn");
    return [
      `${p.name} — ${p.typeLabel}, ${p.address ?? p.city ?? ""}`,
      `id ${p.ref}${p.savedStatus ? ` · in your pipeline: ${STATUS_LABEL[p.savedStatus]}` : ""}`,
      r.onShearQuery ? "ALREADY ON SHEARQUERY — they've claimed their listing, so they can't be credited to an agency." : "",
      `Phone ${p.phone ?? "—"} · Website ${p.website ?? "—"}`,
      `ShearQuery listing: ${p.listingUrl}${p.mapsUrl ? ` · Google Maps: ${p.mapsUrl}` : ""}`,
      "",
      `FROM SHEARQUERY'S DIRECTORY, AS OF ${p.dataAsOf ?? "an unknown date"} (not a live Google check):`,
      `  Rating ${p.rating ?? "—"} from ${p.reviews} reviews`,
      r.audit ? `  Public audit score ${r.audit.score}/100 (covers ${r.audit.coverage.visible} of ${r.audit.coverage.total} checks — the rest need their Google connected)` : "  No audit available.",
      ...findings.map((c) => `  - ${c.label}: ${c.detail}${c.fix ? ` Fix: ${c.fix}` : ""}`),
      // Only what the audit didn't already say (it covers reviews and website).
      ...p.signals.filter((s) => !r.audit || !["few_reviews", "no_website"].includes(s.key)).map((s) => `  - ${s.text}`),
      "",
      liveChecksEnabled()
        ? `Talking points should come from the findings above. Before pitching on numbers that may have moved, prospect_live_check gives the current picture (${r.liveChecksLeft} of ${LIVE_CHECKS_PER_DAY} left in the last 24 hours).`
        : "Talking points should come from the findings above. The data may have moved since its date — say 'about' rather than an exact count, or check the Google Maps link first.",
    ].filter((l) => l !== "").join("\n");
  },
};

export const prospectLiveCheckTool: McpTool = {
  ...common,
  name: "prospect_live_check",
  title: "Check a prospect live on Google",
  provides: "a prospect's current rating, reviews, hours and website from Google (capped per day)",
  description:
    `For an APPROVED agency: look a business up on Google right now — current rating, review count, hours, website, phone and whether it's open — and compare with ShearQuery's stored data. Capped at ${LIVE_CHECKS_PER_DAY} per agency per 24 hours, so use it on businesses about to be pitched. What it finds also refreshes ShearQuery's directory.`,
  requiresScope: "propose",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  inputSchema: { type: "object", properties: { prospect: { type: "string" } }, required: ["prospect"] },
  handler: async (args, ctx) => {
    if (!ctx.identity) return "This needs the agency to be signed in.";
    const blocked = await approvedAgency(ctx.identity.memberId);
    if (blocked) return blocked;
    const { liveCheck } = await import("@/lib/prospecting");
    const r: any = await liveCheck(ctx.identity.memberId, args.prospect);
    if (r.error) return `${r.error}${r.liveChecksLeft != null ? ` (${r.liveChecksLeft} live checks left)` : ""}`;
    const moved = (a: unknown, b: unknown) => (a === b || a == null ? "" : ` (was ${a} in our data)`);
    return [
      `LIVE ON GOOGLE — ${r.now.name ?? r.name}${r.now.status && r.now.status !== "OPERATIONAL" ? ` · Google status: ${r.now.status}` : ""}`,
      r.matchedByName ? "Found by name and address, since we had no Google id for it — check it's the right business before pitching." : "",
      `  Rating ${r.now.rating ?? "—"}${moved(r.before.rating, r.now.rating)} from ${r.now.reviews} reviews${moved(r.before.reviews, r.now.reviews)}`,
      `  Website ${r.now.website ?? "none on Google"}${r.before.website && !r.now.website ? " (we had one on file)" : !r.before.website && r.now.website ? " (not in our data before)" : ""}`,
      `  Phone ${r.now.phone ?? "—"}`,
      `  Hours ${r.now.hours?.length ? r.now.hours.join("; ") : "none published on Google"}`,
      r.now.mapsUrl ? `  ${r.now.mapsUrl}` : "",
      "",
      `ShearQuery's directory has been updated with this. ${r.liveChecksLeft} of ${LIVE_CHECKS_PER_DAY} live checks left in the last 24 hours.`,
    ].filter((l) => l !== "").join("\n");
  },
};

export const saveProspectTool: McpTool = {
  ...common,
  name: "save_prospect",
  title: "Save or update a prospect in the pipeline",
  provides: "saving a business to the agency's pipeline and updating its status and notes",
  description:
    "For an APPROVED agency: add a business to its prospect pipeline, or update its status (to_contact, contacted, interested, invited, joined, not_interested) and a short note. Saving doesn't reserve the business — another agency can still sign it up first. 'Joined' is also set automatically once the business joins through this agency.",
  requiresScope: "propose",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  inputSchema: {
    type: "object",
    properties: {
      prospect: { type: "string" },
      status: { type: "string", enum: [...PIPELINE_STATUSES] },
      note: { type: "string", description: "e.g. 'Spoke to the owner, call back Friday'." },
    },
    required: ["prospect"],
  },
  handler: async (args, ctx) => {
    if (!ctx.identity) return "This needs the agency to be signed in.";
    const blocked = await approvedAgency(ctx.identity.memberId);
    if (blocked) return blocked;
    const { saveProspect } = await import("@/lib/prospecting");
    const r: any = await saveProspect(ctx.identity.memberId, args.prospect, args.status as PipelineStatus | undefined, args.note);
    if (r.error) return r.error;
    return `Saved ${r.name} (${r.ref})${r.status ? ` as ${STATUS_LABEL[r.status as PipelineStatus]}` : ""}${args.note ? ", with the note" : ""}. my_prospects shows the pipeline.`;
  },
};

export const myProspectsTool: McpTool = {
  ...common,
  name: "my_prospects",
  title: "The agency's prospect pipeline",
  provides: "the agency's saved prospects with status and notes",
  description: "For an APPROVED agency: its saved prospects with status, notes and when each was last touched — optionally only one status. Use it to answer 'who haven't I followed up with?'.",
  annotations: { readOnlyHint: true, openWorldHint: false },
  inputSchema: { type: "object", properties: { status: { type: "string", enum: [...PIPELINE_STATUSES] } } },
  handler: async (args, ctx) => {
    if (!ctx.identity) return "This needs the agency to be signed in.";
    const blocked = await approvedAgency(ctx.identity.memberId);
    if (blocked) return blocked;
    const { myProspects } = await import("@/lib/prospecting");
    const list = await myProspects(ctx.identity.memberId, args.status as PipelineStatus | undefined);
    const { shareActivity } = await import("@/lib/audit-share");
    const activity = await shareActivity(ctx.identity.memberId);
    if (!list.length) return args.status ? `No prospects marked ${STATUS_LABEL[args.status as PipelineStatus]}.` : "The pipeline is empty — find_prospects, then save_prospect.";
    const days = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000);
    const counts = PIPELINE_STATUSES.map((s) => [s, list.filter((p: any) => p.status === s).length] as const).filter(([, n]) => n);
    return [
      `PIPELINE (${list.length}): ${counts.map(([s, n]) => `${STATUS_LABEL[s]} ${n}`).join(" · ")}`,
      "",
      ...list.map((p: any) => {
        const k = `${p.entity_type}:${p.entity_id}`;
        const v = activity.views.get(k);
        const seen = v ? ` · opened their audit ${v.views}× (last ${days(v.last)} day${days(v.last) === 1 ? "" : "s"} ago)` : "";
        const asked = activity.requested.has(k) ? " · ASKED FOR A REVIEW" : "";
        return `- ${p.business_name}${p.city ? `, ${p.city}` : ""} — ${STATUS_LABEL[p.status as PipelineStatus]}, last touched ${days(p.updated_at)} day${days(p.updated_at) === 1 ? "" : "s"} ago${seen}${asked} · id ${p.entity_type}:${p.slug}${p.note ? `\n    note: ${p.note}` : ""}`;
      }),
    ].join("\n");
  },
};

export const shareAuditLinkTool: McpTool = {
  ...common,
  name: "share_audit_link",
  title: "A shareable audit page for a prospect",
  provides: "a link to a business's own Google audit page that credits the agency when they join",
  description:
    "For an APPROVED agency: a link to a page showing that business its own free Google profile check, with 'Shared with you by <agency>', a 'Get started free' button that credits the business to this agency when it joins, and a 'Request a free profile review' form that records the business's permission to be contacted. The AGENCY sends the link from its own email, DMs or in person — ShearQuery sends nothing. Also adds the business to the pipeline. my_prospects shows whether they opened it. Offer a short message to go with it, written from the audit findings (prospect_details), without exact counts that may have moved.",
  requiresScope: "propose",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  inputSchema: { type: "object", properties: { prospect: { type: "string" } }, required: ["prospect"] },
  handler: async (args, ctx) => {
    if (!ctx.identity) return "This needs the agency to be signed in.";
    const blocked = await approvedAgency(ctx.identity.memberId);
    if (blocked) return blocked;
    const { shareAuditLink } = await import("@/lib/audit-share");
    const r: any = await shareAuditLink(ctx.identity.memberId, args.prospect);
    if (r.error) return r.error;
    return [
      `AUDIT LINK for ${r.name}${r.city ? ` (${r.city})` : ""}:`,
      r.url,
      "",
      "Send it from the agency's own email, DMs or in person — ShearQuery doesn't send it. It's in the pipeline now; my_prospects shows when it's opened and whether they ask for a review.",
      "Suggest a short, friendly message to go with it, based on the real findings (prospect_details). Don't quote exact review counts — the data has a date.",
    ].join("\n");
  },
};

export const PROSPECT_TOOLS: McpTool[] = [findProspectsTool, prospectDetailsTool, prospectLiveCheckTool, saveProspectTool, myProspectsTool, shareAuditLinkTool];
