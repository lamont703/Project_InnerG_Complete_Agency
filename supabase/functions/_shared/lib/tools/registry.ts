/**
 * _shared/lib/tools/registry.ts
 * Inner G Complete Agency — Tool Registry Configuration
 */

import { ToolRegistry } from "./index.ts"
import { listOpenTicketsTool, updateTicketStatusTool } from "./tickets/index.ts"
import { getGithubInsightsTool, getRecentGithubActivityTool, searchGithubKnowledgeTool, createGithubIssueTool } from "./github/index.ts"
import { getSocialInsightsTool, listRecentSocialPostsTool, searchSocialKnowledgeTool } from "./social/index.ts"

import { getYoutubeChannelStatsTool, listRecentYoutubeVideosTool, searchYoutubeKnowledgeTool } from "./youtube/index.ts"
import { getLinkedinPageStatsTool, listRecentLinkedinPostsTool, searchLinkedinKnowledgeTool } from "./linkedin/index.ts"
import { getInstagramAccountStatsTool, listRecentInstagramMediaTool, searchInstagramKnowledgeTool } from "./instagram/index.ts"
import { getFacebookPageStatsTool, searchFacebookKnowledgeTool } from "./facebook/index.ts"
import { listRecentNotionPagesTool, searchNotionKnowledgeTool } from "./notion/index.ts"
import { getTiktokAccountStatsTool, listRecentTiktokVideosTool, searchTiktokKnowledgeTool } from "./tiktok/index.ts"
import { searchCrmKnowledgeTool, listRecentContactsTool, listRecentOpportunitiesTool } from "./ghl/index.ts"
import { createSocialDraftTool, listSocialDraftsTool } from "./orchestration/index.ts"
import { getProjectMetricsTool } from "./metrics/index.ts"
import { generateSocialVisualTool } from "./creative/index.ts"

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
    registry.register(createGithubIssueTool)

    // Register Social Planner Tools
    registry.register(getSocialInsightsTool)
    registry.register(listRecentSocialPostsTool)
    registry.register(searchSocialKnowledgeTool)

    // Register Social Orchestration Tools
    registry.register(createSocialDraftTool)
    registry.register(listSocialDraftsTool)

    // Register YouTube Intelligence Tools
    registry.register(getYoutubeChannelStatsTool)
    registry.register(listRecentYoutubeVideosTool)
    registry.register(searchYoutubeKnowledgeTool)

    // Register LinkedIn Intelligence Tools
    registry.register(getLinkedinPageStatsTool)
    registry.register(listRecentLinkedinPostsTool)
    registry.register(searchLinkedinKnowledgeTool)

    // Register Instagram Intelligence Tools
    registry.register(getInstagramAccountStatsTool)
    registry.register(listRecentInstagramMediaTool)
    registry.register(searchInstagramKnowledgeTool)

    // Register Facebook Intelligence Tools
    registry.register(getFacebookPageStatsTool)
    registry.register(searchFacebookKnowledgeTool)

    // Register Notion Intelligence Tools
    registry.register(listRecentNotionPagesTool)
    registry.register(searchNotionKnowledgeTool)

    // Register TikTok Intelligence Tools
    registry.register(getTiktokAccountStatsTool)
    registry.register(listRecentTiktokVideosTool)
    registry.register(searchTiktokKnowledgeTool)

    // Register GHL CRM Tools
    registry.register(searchCrmKnowledgeTool)
    registry.register(listRecentContactsTool)
    registry.register(listRecentOpportunitiesTool)

    // Register Business Metrics Tools
    registry.register(getProjectMetricsTool)

    // Register Creative AI Tools
    registry.register(generateSocialVisualTool)

    return registry
}
