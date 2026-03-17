/**
 * _shared/lib/tools/notion/index.ts
 * Inner G Complete Agency — Notion Intelligence Tools
 */

import { createSearchTool, createRecentActivityTool } from "../factory.ts"

/**
 * Tool: list_recent_notion_pages
 */
export const listRecentNotionPagesTool = createRecentActivityTool({
    name: "list_recent_notion_pages",
    platform: "Notion",
    tableName: "notion_pages",
    dateField: "last_edited_time",
    description: "Fetches the most recently updated Notion pages to track current documentation and knowledge base updates."
})

/**
 * Tool: search_notion_knowledge
 */
export const searchNotionKnowledgeTool = createSearchTool({
    name: "search_notion_knowledge",
    platform: "Notion",
    tableNames: ["notion_pages"],
    description: "Performs a semantic search over Notion page content, titles, and discussions. Use this to answer specific questions like 'What is our SOP for onboarding?' or 'Give me a summary of the latest project roadmap from Notion.'."
})
