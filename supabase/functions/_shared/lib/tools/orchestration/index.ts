/**
 * _shared/lib/tools/orchestration/index.ts
 * Inner G Complete Agency — Social Content Orchestration Tools
 */

import { RegisteredTool, ToolContext } from "../index.ts"

/**
 * Tool: create_social_draft
 * Allows the AI Agent to draft content for social media platforms.
 */
export const createSocialDraftTool: RegisteredTool = {
    definition: {
        name: "create_social_draft",
        description: "ACTUALLY creates a social media draft in the project's content plan. Use this whenever the user asks to draft, post, or share content based on GitHub commits, Notion pages, or GHL data.",
        parameters: {
            type: "object",
            properties: {
                platform: {
                    type: "string",
                    description: "The platform to draft for.",
                    enum: ["linkedin", "tiktok", "facebook", "instagram", "twitter", "youtube"]
                },
                content_text: {
                    type: "string",
                    description: "The body text of the post. LinkedIn strictly limits this to 3000 characters."
                },
                source_type: {
                    type: "string",
                    description: "The source of the shared knowledge.",
                    enum: ["github", "notion", "ghl", "manual", "news"]
                },
                source_metadata: {
                    type: "object",
                    description: "Optional metadata linking to the source (e.g. { 'page_id': '...' })."
                },
                source_id: {
                    type: "string",
                    description: "The UUID of the specific intelligence record being used (e.g. news article ID)."
                },
                ai_reasoning: {
                    type: "string",
                    description: "Briefly explain why this content was selected for posting."
                }
            },
            required: ["platform", "content_text"]
        }
    },
    execute: async (context: ToolContext, args: any) => {
        const { platform, content_text, source_type, source_metadata, source_id, ai_reasoning } = args

        const { data, error } = await context.adminClient
            .from("social_content_plan")
            .insert({
                project_id: context.projectId,
                platform,
                content_text,
                status: "draft",
                source_type: source_type || "manual",
                source_metadata: {
                    ...(source_metadata || {}),
                    ...(source_id ? { source_record_id: source_id } : {})
                },
                ai_reasoning: ai_reasoning || ""
            })
            .select()
            .single()

        if (error) throw error

        // If this was based on news intelligence, mark the article as processed
        if (source_type === "news" && source_id) {
            console.log(`[create_social_draft] Marking news_intelligence ${source_id} as processed`)
            await context.adminClient
                .from("news_intelligence")
                .update({ 
                    is_processed: true,
                    processed_at: new Date().toISOString(),
                    social_plan_id: data.id
                })
                .eq("id", source_id)
        }

        return {
            message: `Successfully created a ${platform} draft. It is now awaiting review in the dashboard.`,
            draft_id: data.id
        }
    }
}

/**
 * Tool: list_social_drafts
 * Lists pending drafts for the project.
 */
export const listSocialDraftsTool: RegisteredTool = {
    definition: {
        name: "list_social_drafts",
        description: "Lists pending social media drafts to see what is currently in the planning pipeline.",
        parameters: {
            type: "object",
            properties: {
                platform: {
                    type: "string",
                    description: "Filter by platform.",
                    enum: ["linkedin", "tiktok"]
                },
                limit: {
                    type: "number",
                    description: "Number of drafts to return. Defaults to 5.",
                    default: 5
                }
            }
        }
    },
    execute: async (context: ToolContext, args: any) => {
        const { platform, limit = 5 } = args
        let query = context.adminClient
            .from("social_content_plan")
            .select("*")
            .eq("project_id", context.projectId)
            .eq("status", "draft")
            .order("created_at", { ascending: false })
            .limit(limit)

        if (platform) {
            query = query.eq("platform", platform)
        }

        const { data, error } = await query
        if (error) throw error
        return data
    }
}
