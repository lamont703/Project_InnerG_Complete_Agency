import { findClips } from "@/lib/broll-library";
import { PROFILES } from "@/lib/newsdesk-config";
import { NONCE_TTL_MINUTES } from "./consent";
import type { VideoRequest, VideoSpec } from "./interpret";

/**
 * THE PROPOSAL EMAIL — what will be made, what it costs, and the code to approve.
 *
 * IT NAMES THE B-ROLL IT WILL REUSE VERSUS GENERATE, and that is the line worth
 * reading before approving. Generation costs credits; reuse costs nothing. A
 * proposal that hides which is which turns "yes" into a blank cheque, so this
 * searches broll_assets by tag BEFORE proposing anything — the same
 * search-before-generate rule lib/broll-library.js exists to enforce.
 */

/**
 * What findClips() returns, restated here.
 *
 * lib/broll-library.js is CommonJS with JSDoc types, so TypeScript widens its
 * rows to `Object` and any typed predicate over them fails to compile. Naming
 * the two fields this file actually reads is cheaper and more honest than
 * `any`, and it breaks loudly if the library ever stops returning them.
 */
interface BrollClip { id: string; tags: string[] }

export interface BrollPlan {
  segmentIndex: number;
  tags: string[];
  reuse: string[];
  needed: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function planBroll(db: any, spec: VideoSpec): Promise<BrollPlan[]> {
  const plans: BrollPlan[] = [];
  const seen: string[] = [];
  for (const [i, seg] of spec.segments.entries()) {
    if (seg.mode !== "voice" || seg.visual !== "broll") continue;
    const tags = seg.tags ?? [];
    const hits = (tags.length ? await findClips(db, { tags, limit: 6 }) : []) as unknown as BrollClip[];
    const fresh = hits.filter((h) => !seen.includes(h.id));
    for (const h of fresh) seen.push(h.id);
    /*
     * One shot per six seconds is what render_news_short.js does, so the count
     * of clips this segment WANTS is estimated the same way. Anything the
     * library cannot cover has to be generated, and that is the number the
     * reader is being asked to approve.
     */
    const wants = Math.max(1, Math.ceil((seg.text?.split(/\s+/).length ?? 0) / 175 * 60 / 6));
    plans.push({
      segmentIndex: i,
      tags,
      reuse: fresh.slice(0, wants).map((h) => h.tags.slice(0, 3).join("/")),
      needed: Math.max(0, wants - fresh.length),
    });
  }
  return plans;
}

export interface ProposalInput {
  request: VideoRequest;
  estimate: { seconds: number; usd: number };
  reasoning: string;
  broll: BrollPlan[];
  code: string;
  creditsPerClip: number;
}

export function proposalEmail(p: ProposalInput): string {
  const lines: string[] = [];
  lines.push(`Here is what I would make. Nothing is rendered and nothing is spent until you reply with the code at the bottom.`, "");

  if (p.request.kind === "card") {
    const c = p.request.card;
    lines.push(`FORMAT   Data Reel — ${c.title}`);
    lines.push(`COST     free (no avatar is bought)`, "");
    lines.push(`  ${c.stat}`);
    lines.push(`  ${c.label}`);
    if (c.punch) lines.push(`  ${c.punch}`);
    if (c.question) lines.push(`  ${c.question}`);
    lines.push(`  ${c.source}`);
    /*
     * THE SOURCE LINE IS SHOWN BECAUSE IT IS THE THING TO CHECK. A figure whose
     * provenance nobody can trace should not publish, and this is the last point
     * a human sees it before it does.
     */
  } else if (p.request.kind === "grid") {
    const g = p.request.grid;
    lines.push(`FORMAT   Lookbook — ${g.title}`);
    lines.push(`COST     free (rendered from the grid image you attached)`, "");
    lines.push(`  headline: ${g.headline}`);
    g.names.forEach((n, i) => lines.push(`  ${i + 1}. ${n}`));
  } else {
    const spec = p.request.spec;
    const profile = PROFILES[spec.profile];
    lines.push(`FORMAT   ${profile.publish.videoType} — ${spec.title}`);
    lines.push(`COST     $${p.estimate.usd.toFixed(2)} of HeyGen (${p.estimate.seconds.toFixed(0)}s on camera, cap $${profile.budgetUsd})`);
    const toGenerate = p.broll.reduce((a, b) => a + b.needed, 0);
    lines.push(toGenerate
      ? `B-ROLL   ${p.broll.reduce((a, b) => a + b.reuse.length, 0)} clips reused from the library, ${toGenerate} to generate (~${toGenerate * p.creditsPerClip} Higgsfield credits)`
      : `B-ROLL   all from the library, nothing new to generate`);
    lines.push("", "SEGMENTS");
    for (const [i, sg] of spec.segments.entries()) {
      const plan = p.broll.find((b) => b.segmentIndex === i);
      const where = sg.mode === "clip"
        ? `[their clip ${sg.from}s–${sg.to}s]`
        : sg.visual === "broll"
          ? `[b-roll: ${plan?.reuse.join(", ") || "to generate"}${plan?.needed ? ` +${plan.needed} new` : ""}]`
          : sg.visual ? `[${sg.visual}]` : "[on camera]";
      const label = sg.mode === "avatar" ? "ON CAMERA" : sg.mode === "clip" ? "CLIP     " : "voice    ";
      lines.push(`  ${String(i).padStart(2)} ${label} ${where}`);
      if (sg.text) lines.push(`     ${sg.text}`);
    }
  }

  if (p.reasoning) lines.push("", `WHY THIS SHAPE`, `  ${p.reasoning}`);
  lines.push("", "-".repeat(56), "");
  lines.push(`To approve, reply with this code in your own text — not in the quoted part:`, "");
  lines.push(`    ${p.code}`, "");
  lines.push(`It is good for ${NONCE_TTL_MINUTES} minutes and works once. Reply with anything else, or nothing, and this job is dropped.`);
  lines.push(`If it is wrong, just say what to change and I will send a new proposal.`);
  return lines.join("\n");
}
