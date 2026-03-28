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
        description: "CRITICAL: This tool MUST be called to persist a post to the database. Whenever the user asks to 'draft', 'prepare', 'create', or 'write' a post, you MUST execute this tool first.",
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
                },
                recurrence: {
                    type: "string",
                    description: "Optional. Specifies if the post should be automatically replicated on a schedule. 'weekly' creates 52 weekly identical drafts. 'monthly' creates 12 monthly identical drafts.",
                    enum: ["none", "weekly", "monthly"]
                }
            },
            required: ["platform", "content_text"]
        }
    },
    execute: async (context: ToolContext, args: any) => {
        const { platform, content_text, source_type, source_metadata, source_id, ai_reasoning, recurrence } = args
        const targetProjectId = context.projectId

        const baseDate = new Date()
        let datesToSchedule: Date[] = [baseDate]

        if (recurrence === "weekly") {
            for (let i = 1; i < 52; i++) {
                const nextDate = new Date(baseDate)
                nextDate.setDate(baseDate.getDate() + (i * 7))
                datesToSchedule.push(nextDate)
            }
        } else if (recurrence === "monthly") {
            for (let i = 1; i < 12; i++) {
                const nextDate = new Date(baseDate)
                nextDate.setMonth(baseDate.getMonth() + i)
                datesToSchedule.push(nextDate)
            }
        }

        const postsToInsert = datesToSchedule.map((date, index) => ({
            project_id: targetProjectId,
            platform,
            content_text,
            status: "draft",
            source_type: source_type || "manual",
            source_metadata: {
                ...(source_metadata || {}),
                ...(source_id ? { source_record_id: source_id } : {})
            },
            scheduled_at: index > 0 ? date.toISOString() : null,
            ai_reasoning: ai_reasoning || ""
        }))

        const { data, error } = await context.adminClient
            .from("social_content_plan")
            .insert(postsToInsert)
            .select()

        if (error) throw error

        // If this was based on news intelligence, mark the article as processed
        if (source_type === "news" && source_id) {
            console.log(`[create_social_draft] Marking news_intelligence ${source_id} as processed`)
            await context.adminClient
                .from("news_intelligence")
                .update({ 
                    is_processed: true,
                    processed_at: new Date().toISOString(),
                    social_plan_id: data[0].id
                })
                .eq("id", source_id)
        }

        return {
            message: recurrence && recurrence !== "none" 
                ? `Successfully orchestrated ${data.length} recurring drafts for ${platform}. The first draft is ID ${data[0].id}.` 
                : `Successfully created a ${platform} draft. It is now awaiting review in the dashboard.`,
            draft_id: data[0].id
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
