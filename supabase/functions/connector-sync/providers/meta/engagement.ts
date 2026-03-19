import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MetaClient } from "./client.ts";
import { InstagramComment } from "./types.ts";
import { RagService } from "../../../_shared/lib/ai/rag.ts";
import { generateContent, GEMINI_MODELS } from "../../../_shared/lib/ai/gemini.ts";
import { Logger } from "../../../_shared/lib/core/logger.ts";
import { SignalRepo } from "../../../_shared/lib/db/intelligence/signals.ts";

export class MetaEngagementService {
    private logger: Logger;
    private rag: RagService;
    private signalRepo: SignalRepo;

    constructor(
        private adminClient: SupabaseClient,
        private projectId: string,
        private apiKey: string
    ) {
        this.logger = new Logger("meta-engagement");
        this.rag = new RagService(adminClient);
        this.signalRepo = new SignalRepo(adminClient);
    }

    /**
     * Scan and respond to new comments on synced Instagram media
     */
    async processNewComments(client: MetaClient, igUserId: string): Promise<number> {
        this.logger.info(`Starting Instagram intervention-aware engagement for project ${this.projectId}`);

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

        if (!config?.instagram_engagement_enabled) {
            this.logger.info(`Instagram engagement is DISABLED in config for project ${this.projectId}`);
            return 0;
        }

        this.logger.info(`Instagram engagement is ENABLED for project ${this.projectId}. Finding comments...`);

        // 2. Fetch comments that haven't been processed by AI yet
        const { data: comments, error: commentError } = await this.adminClient
            .from("instagram_comments")
            .select("*, instagram_media(instagram_media_id, caption, permalink)")
            .eq("project_id", this.projectId)
            .is("ai_processed_at", null)
            .neq("from_id", igUserId) // Never respond to ourselves
            .order("created_at", { ascending: true });

        if (commentError || !comments || comments.length === 0) {
            this.logger.info("No new Instagram comments to process.");
            return 0;
        }

        let responsesSent = 0;

        for (const comment of comments) {
            try {
                const mediaData = (comment as any).instagram_media;
                const permalink = mediaData?.permalink || `https://www.instagram.com/reels/${mediaData?.instagram_media_id || ""}/`;

                // 3. INTERVENTION CHECK: Is it actually our turn to speak?
                const threadRootId = comment.parent_comment_id || comment.instagram_comment_id;
                
                this.logger.info(`Checking IG thread status for root: ${threadRootId}`);

                const { data: threadActivity, error: threadError } = await this.adminClient
                    .from("instagram_comments")
                    .select("instagram_comment_id, from_id, created_at")
                    .or(`parent_comment_id.eq."${threadRootId}",instagram_comment_id.eq."${threadRootId}"`)
                    .order("created_at", { ascending: false })
                    .limit(1);

                if (threadError) {
                    this.logger.error(`IG Thread activity check error:`, threadError);
                } else if (threadActivity && threadActivity.length > 0) {
                    const latest = threadActivity[0];
                    if (latest.from_id === igUserId) {
                        this.logger.info(`Skipping IG ${comment.id}: Agent/Admin was the last speaker.`);
                        await this.markProcessed(comment.id, "intervention: admin spoke last");
                        continue;
                    }
                    
                    if (latest.instagram_comment_id !== comment.instagram_comment_id) {
                        this.logger.info(`Skipping IG ${comment.id}: Newer turn exists (${latest.instagram_comment_id}).`);
                        await this.markProcessed(comment.id, "stale: newer turn exists");
                        continue;
                    }
                }

                // 4. Analysis & Context Gathering
                const { data: olderHistory } = await this.adminClient
                    .from("instagram_comments")
                    .select("content, from_username, from_id, created_at")
                    .or(`parent_comment_id.eq."${threadRootId}",instagram_comment_id.eq."${threadRootId}"`)
                    .lt("created_at", comment.created_at)
                    .order("created_at", { ascending: true });

                const contextHistory = [
                    ...(olderHistory || []),
                    { content: comment.content, from_id: comment.from_id, from_username: comment.from_username, created_at: comment.created_at }
                ].map(c => `${c.from_id === igUserId ? 'YOU' : 'USER (' + c.from_username + ')'}: "${c.content}"`).join('\n');

                const ragContext = await this.rag.searchAsContext({
                    projectId: this.projectId,
                    query: comment.content,
                    limit: 3
                });

                const analysis = await generateContent({
                    model: GEMINI_MODELS.FLASH_LITE,
                    systemPrompt: "Analyze the user comment on Instagram. If they want a meeting, call, or demo, set 'meeting_interest' to true. Otherwise false. Respond in JSON.",
                    userMessage: `Comment History:\n${contextHistory}\n\nLatest Comment: "${comment.content}"`,
                    temperature: 0.1,
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
                    this.logger.info(`Detected IG meeting interest in ${threadRootId}. Creating Signal.`);
                    await this.signalRepo.create(this.projectId, {
                        signal_type: "conversion",
                        severity: "critical",
                        title: "High Intent: Instagram Meeting Request",
                        body: `Prospect (${comment.from_username}) expressed interest in a meeting/call on Instagram. \n\nThread Context:\n${contextHistory}\n\nACTION: Manual intervention required.`,
                        action_label: "VIEW MEDIA",
                        action_url: permalink,
                        is_agency_only: true,
                        metadata: {
                            comment_id: comment.instagram_comment_id,
                            from_username: comment.from_username,
                            intent: result.intent_summary,
                            history: contextHistory
                        }
                    });
                }

                // 6. Generate Cohesive response
                const aiResponse = await generateContent({
                    model: GEMINI_MODELS.PRO,
                    systemPrompt: this.buildSystemPrompt(config, mediaData?.caption || "", ragContext, result.meeting_interest),
                    userMessage: `CONVERSATION HISTORY:\n${contextHistory}\n\nRespond naturally to the last USER message.`,
                    temperature: 0.8
                }, this.apiKey);

                let finalResponse = aiResponse.text || "";
                if (comment.from_username && comment.parent_comment_id) {
                    // Prepend @mention since we are replying at the root of the thread
                    finalResponse = `@${comment.from_username} ${finalResponse}`;
                }

                const mediaId = mediaData?.instagram_media_id;

                if (finalResponse && mediaId) {
                    this.logger.info(`Posting IG reply to root ${threadRootId}`);
                    
                    const creationResult = await client.createInstagramReply(
                        threadRootId, // Always target the top-level comment (Instagram only supports 1 layer of depth)
                        finalResponse
                    );

                    await this.adminClient.from("instagram_comments").insert({
                        project_id: this.projectId,
                        media_id: comment.media_id,
                        instagram_comment_id: creationResult.id, 
                        from_id: igUserId,
                        from_username: "Agent",
                        content: finalResponse,
                        parent_comment_id: threadRootId, 
                        created_at: new Date().toISOString(),
                        last_synced_at: new Date().toISOString(),
                        ai_processed_at: new Date().toISOString()
                    });

                    responsesSent++;
                    await this.markProcessed(comment.id);
                }

            } catch (err: any) {
                this.logger.error(`Failed to process IG comment ${comment.id}:`, err);
            }
        }

        return responsesSent;
    }

    private buildSystemPrompt(config: any, mediaCaption: string, ragContext: string, hasMeetingInterest: boolean): string {
        return `
You are a warm, human-toned community engagement agent for a professional brand on Instagram.
Your goal is to build connection and keep the conversation alive.

CONTEXT:
- Original Media Caption: "${mediaCaption}"
- Brand Knowledge (RAG): ${ragContext}
- Agency Persona: ${config.agency_persona || "Professional, helpful, and personable."}

GUIDELINES:
1. Speak naturally. Use "I" and "we" where appropriate. Keep it concise for Instagram.
2. IMPORTANT: You are replying to the LAST USER message in the Conversation History.
3. If the user asked for a meeting (Intent Flag: ${hasMeetingInterest}), acknowledge it warmly but DO NOT give a link. Say something like "That's a great idea, let me flag this for the team so we can coordinate!"
4. Keep it to 1-2 impactful sentences. NO hashtags in replies.
        `;
    }

    private async markProcessed(commentId: string, note?: string) {
        if (note) {
            this.logger.info(`IG Comment ${commentId} marked processed with note: ${note}`);
        }
        await this.adminClient
            .from("instagram_comments")
            .update({ ai_processed_at: new Date().toISOString() })
            .eq("id", commentId);
    }
}
