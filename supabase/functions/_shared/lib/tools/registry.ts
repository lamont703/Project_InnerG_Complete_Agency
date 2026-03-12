/**
 * _shared/lib/tools/registry.ts
 * Inner G Complete Agency — Tool Registry Configuration
 */

import { ToolRegistry } from "./index.ts"
import { listOpenTicketsTool, updateTicketStatusTool } from "./ticket-tools.ts"
import { getGithubInsightsTool, getRecentGithubActivityTool, searchGithubKnowledgeTool } from "./github-tools.ts"
import { getSocialInsightsTool, listRecentSocialPostsTool, searchSocialKnowledgeTool } from "./social-tools.ts"

import { getYoutubeChannelStatsTool, listRecentYoutubeVideosTool, searchYoutubeKnowledgeTool } from "./youtube-tools.ts"
import { getLinkedinPageStatsTool, listRecentLinkedinPostsTool, searchLinkedinKnowledgeTool } from "./linkedin-tools.ts"
import { listRecentNotionPagesTool, searchNotionKnowledgeTool } from "./notion-tools.ts"

/**
 * Creates and configures the default tool registry for AI agents.
 */
export function createDefaultRegistry(): ToolRegistry {
    const registry = new ToolRegistry()

    // Register Ticket Tools
    registry.register(listOpenTicketsTool)
    registry.register(updateTicketStatusTool)

    // Register GitHub Intelligence Tools
    registry.register(getGithubInsightsTool)
    registry.register(getRecentGithubActivityTool)
    registry.register(searchGithubKnowledgeTool)

    // Register Social Planner Tools
    registry.register(getSocialInsightsTool)
    registry.register(listRecentSocialPostsTool)
    registry.register(searchSocialKnowledgeTool)

    // Register YouTube Intelligence Tools
    registry.register(getYoutubeChannelStatsTool)
    registry.register(listRecentYoutubeVideosTool)
    registry.register(searchYoutubeKnowledgeTool)

    // Register LinkedIn Intelligence Tools
    registry.register(getLinkedinPageStatsTool)
    registry.register(listRecentLinkedinPostsTool)
    registry.register(searchLinkedinKnowledgeTool)

    // Register Notion Intelligence Tools
    registry.register(listRecentNotionPagesTool)
    registry.register(searchNotionKnowledgeTool)

    return registry
}
