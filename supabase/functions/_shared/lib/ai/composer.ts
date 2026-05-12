/**
 * _shared/lib/composer.ts
 * Inner G Complete Agency — AI Context Composer
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This is the ONLY place that should build 
 * the "Worldview" briefing for the AI. It handles project 
 * identity and recent history retrieval.
 * ─────────────────────────────────────────────────────────
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { RagService } from "./rag.ts"

export class ContextComposer {
    constructor(private adminClient: SupabaseClient) { }

    /**
     * Builds a comprehensive string summarizing the project's current state.
     */
    async buildProjectBriefing(projectId: string): Promise<string> {
        const { data: project } = await this.adminClient
            .from("projects")
            .select("name, status, clients(name, industry)")
            .eq("id", projectId)
            .single();

        if (!project) return "Context: General Intelligence (No specific project found).";

        const clientName = (project.clients as any)?.name ?? "Unknown Client";
        const industry = (project.clients as any)?.industry ?? "Unknown Industry";

        return `
## CURRENT PROJECT CONTEXT
Project: ${project.name}
Client: ${clientName}
Industry: ${industry}
Status: ${project.status}
`;
    }

    /**
     * Combines RAG results and project data into a master briefing.
     */
    async buildMasterContext(projectId: string, query: string): Promise<string> {
        const briefing = await this.buildProjectBriefing(projectId);

        const rag = new RagService(this.adminClient);
        const history = await rag.searchAsContext({ projectId, query });

        return `${briefing}\n\n## RELEVANT HISTORICAL CONTEXT\n${history}`;
    }
}
