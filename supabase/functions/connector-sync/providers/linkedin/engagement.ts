import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { LinkedInClient } from "./client.ts";
import { LinkedInComment } from "./types.ts";
import { RagService } from "../../../_shared/lib/rag.ts";
import { generateContent, GEMINI_MODELS } from "../../../_shared/lib/gemini.ts";
import { Logger } from "../../../_shared/lib/logger.ts";
import { SignalRepo } from "../../../_shared/lib/db/signals.ts";

export class LinkedInEngagementService {
    private logger: Logger;
    private rag: RagService;
    private signalRepo: SignalRepo;

    constructor(
        private adminClient: SupabaseClient,
        private projectId: string,
        private apiKey: string
    ) {
        this.logger = new Logger("linkedin-engagement");
        this.rag = new RagService(adminClient);
        this.signalRepo = new SignalRepo(adminClient);
    }

    /**
     * Scan and respond to new comments on synced LinkedIn posts
     */
    async processNewComments(client: LinkedInClient, pageUrn: string): Promise<number> {
        this.logger.info(`Starting intervention-aware engagement for project ${this.projectId}`);

        // 1. Fetch project-specific agent configuration
        const { data: config, error: configError } = await this.adminClient
            .from("project_agent_config")
            .select("*")
            .eq("project_id", this.projectId)
            .single();

        if (configError) {
            this.logger.error(`Config fetch error for project ${this.projectId}:`, configError);
            return 0;
        }

        if (!config?.linkedin_engagement_enabled) {
            this.logger.info(`LinkedIn engagement is DISABLED in config for project ${this.projectId}`);
            return 0;
        }

        this.logger.info(`LinkedIn engagement is ENABLED for project ${this.projectId}. Finding comments...`);

        // 2. Fetch comments that haven't been processed by AI yet
        const { data: comments, error: commentError } = await this.adminClient
            .from("linkedin_comments")
            .select("*, linkedin_posts(linkedin_post_id, content)")
            .eq("project_id", this.projectId)
            .is("ai_processed_at", null)
            .neq("actor_urn", pageUrn) // Never respond to ourselves
            .order("created_at", { ascending: true });

        if (commentError || !comments || comments.length === 0) {
            return 0;
        }

        let responsesSent = 0;

        for (const comment of comments) {
            try {
                // 3. INTERVENTION CHECK: Is it actually our turn to speak?
                // We check the absolute status of the thread root to see who spoke last.
                const threadRootAtomicId = comment.parent_comment_id || comment.linkedin_comment_id;
                
                this.logger.info(`Checking thread status for root: ${threadRootAtomicId}`);

                // Fetch the absolute latest comment in this entire branch
                const { data: threadActivity, error: threadError } = await this.adminClient
                    .from("linkedin_comments")
                    .select("linkedin_comment_id, actor_urn, created_at")
                    .or(`parent_comment_id.eq."${threadRootAtomicId}",linkedin_comment_id.eq."${threadRootAtomicId}"`)
                    .order("created_at", { ascending: false })
                    .limit(1);

                if (threadError) {
                    this.logger.error(`Thread activity check error:`, threadError);
                } else if (threadActivity && threadActivity.length > 0) {
                    const latest = threadActivity[0];
                    if (latest.actor_urn === pageUrn) {
                        this.logger.info(`Skipping ${comment.id}: Page/Admin was the last speaker in this thread.`);
                        await this.markProcessed(comment.id, "intervention: admin spoke last");
                        continue;
                    }
                    
                    if (latest.linkedin_comment_id !== comment.linkedin_comment_id) {
                        // This specific comment record is "stale" because there's already a newer 
                        // user comment in the same thread. We'll wait until the loop hits the newest one.
                        this.logger.info(`Skipping ${comment.id}: Newer user turn exists (${latest.linkedin_comment_id}).`);
                        await this.markProcessed(comment.id, "stale: newer turn exists");
                        continue;
                    }
                }

                // 4. Analysis & Context Gathering
                // We provide the AI with the conversational history so it can respond cohesiveley.
                // Fetch older comments in this thread to give the AI context on how we got here
                const { data: olderHistory } = await this.adminClient
                    .from("linkedin_comments")
                    .select("content, actor_urn, created_at")
                    .or(`parent_comment_id.eq."${threadRootAtomicId}",linkedin_comment_id.eq."${threadRootAtomicId}"`)
                    .lt("created_at", comment.created_at)
                    .order("created_at", { ascending: true });

                const contextHistory = [
                    ...(olderHistory || []),
                    { content: comment.content, actor_urn: comment.actor_urn, created_at: comment.created_at }
                ].map(c => `${c.actor_urn === pageUrn ? 'YOU' : 'USER'}: "${c.content}"`).join('\n');

                const ragContext = await this.rag.searchAsContext({
                    projectId: this.projectId,
                    query: comment.content,
                    limit: 3
                });

                const analysis = await generateContent({
                    model: GEMINI_MODELS.FLASH_LITE,
                    systemPrompt: "Analyze the user comment. If they want a meeting, call, or demo, set 'meeting_interest' to true. Otherwise false. Respond in JSON.",
                    userMessage: `Comment History:\n${contextHistory}\n\nLatest Comment: "${comment.content}"`,
                    responseSchema: {
                        type: "object",
                        properties: {
                            meeting_interest: { type: "boolean" },
                            intent_summary: { type: "string" }
                        },
                        required: ["meeting_interest", "intent_summary"]
                    }
                }, this.apiKey);

                const result = JSON.parse(analysis.text || '{"meeting_interest": false}');

                // 5. Action: If meeting intent found, CREATE SIGNAL
                if (result.meeting_interest) {
                    this.logger.info(`Detected meeting interest in ${threadRootAtomicId}. Creating Agency Signal.`);
                    await this.signalRepo.create(this.projectId, {
                        signal_type: "conversion",
                        severity: "critical",
                        title: "High Intent: Google Meet Request",
                        body: `Prospect (${comment.actor_urn}) expressed interest in a meeting/call on LinkedIn. \n\nThread Context:\n${contextHistory}\n\nACTION: Manual intervention required to finalize scheduling.`,
                        action_label: "VIEW POST",
                        action_url: `https://www.linkedin.com/feed/update/${(comment as any).linkedin_posts?.linkedin_post_id || ""}`,
                        is_agency_only: true,
                        metadata: {
                            comment_id: comment.linkedin_comment_id,
                            actor_urn: comment.actor_urn,
                            intent: result.intent_summary,
                            history: contextHistory
                        }
                    });
                }

                // 6. Generate Cohesive response
                const aiResponse = await generateContent({
                    model: GEMINI_MODELS.PRO,
                    systemPrompt: this.buildSystemPrompt(config, (comment as any).linkedin_posts?.content || "", ragContext, result.meeting_interest),
                    userMessage: `CONVERSATION HISTORY:\n${contextHistory}\n\nRespond naturally to the last USER message.`,
                    temperature: 0.8
                }, this.apiKey);

                const postUrn = (comment as any).linkedin_posts?.linkedin_post_id;
                const dbCommentId = comment.linkedin_comment_id;

                if (aiResponse.text && postUrn) {
                    // Alphanumeric-safe extraction (respects -f_Ut43FoQ etc)
                    const parts = dbCommentId.split(/[:,\(]/);
                    const lastPart = parts[parts.length - 1] || "";
                    const atomicId = lastPart.replace(/\)$/, "").trim();

                    const normalizedParentUrn = `urn:li:comment:(${postUrn},${atomicId})`;

                    this.logger.info(`Posting reply to ${normalizedParentUrn} on post ${postUrn}`);
                    const creationResult = await client.createComment(
                        postUrn,              // Target URN must be the POST
                        pageUrn,              // Actor
                        aiResponse.text,
                        normalizedParentUrn   // Parent is the COMMENT
                    );

                    // RECORD THE REPLY IMMEDIATELY to prevent double-speech in the same loop
                    // Store only the atomic ID for consistency
                    const createdUrn = (creationResult as any).id || "";
                    const cParts = createdUrn.split(/[:,\(]/);
                    const cLast = cParts[cParts.length - 1] || "";
                    const createdAtomicId = cLast.replace(/\)$/, "").trim() || createdUrn;

                    await this.adminClient.from("linkedin_comments").insert({
                        project_id: this.projectId,
                        post_id: comment.post_id,
                        linkedin_comment_id: createdAtomicId, 
                        actor_urn: pageUrn,
                        content: aiResponse.text,
                        parent_comment_id: atomicId, 
                        created_at: new Date().toISOString(),
                        last_synced_at: new Date().toISOString(),
                        ai_processed_at: new Date().toISOString()
                    });

                    responsesSent++;
                    await this.markProcessed(comment.id);
                } else if (!postUrn) {
                    this.logger.error(`Cannot reply to comment ${comment.id}: Mapping to post URN failed.`);
                    await this.markProcessed(comment.id, "error: missing post URN");
                }

            } catch (err) {
                this.logger.error(`Failed to process comment ${comment.id}:`, err);
            }
        }

        return responsesSent;
    }

    private buildSystemPrompt(config: any, postContent: string, ragContext: string, hasMeetingInterest: boolean): string {
        return `
You are a warm, human-toned community engagement agent for a professional brand.
Your goal is to build connection and keep the conversation alive.

CONTEXT:
- Original Post Content: "${postContent}"
- Brand Knowledge (RAG): ${ragContext}
- Agency Persona: ${config.agency_persona || "Professional, helpful, and personable."}

GUIDELINES:
1. Speak naturally. Use "I" and "we" where appropriate. Avoid cliches.
2. IMPORTANT: You are replying to the LAST USER message in the Conversation History. Make sure your response is a cohesive, direct reply to what THEY just said.
3. If the user asked for a meeting (Intent Flag: ${hasMeetingInterest}), acknowledge it warmly but DO NOT give a link. Say something like "That's a great idea, let me flag this for the team so we can coordinate!"
4. If it's general engagement, keep the dialogue moving based on the Brand Knowledge.
5. Keep it to 1-2 impactful sentences. NO external links. NO scheduling.
        `;
    }

    private async markProcessed(commentId: string, note?: string) {
        if (note) {
            this.logger.info(`Comment ${commentId} marked processed with note: ${note}`);
        }
        await this.adminClient
            .from("linkedin_comments")
            .update({ ai_processed_at: new Date().toISOString() })
            .eq("id", commentId);
    }
}
