/**
 * _shared/lib/tools/ghl/index.ts
 * Inner G Complete Agency — GoHighLevel CRM Intelligence Tools
 */

import { createSearchTool, createRecentActivityTool } from "../factory.ts"

// 1. Search CRM Knowledge
export const searchCrmKnowledgeTool = createSearchTool({
    name: "search_crm_knowledge",
    platform: "GoHighLevel CRM",
    tableNames: ["ghl_contacts", "ghl_pipelines", "ghl_pipeline_stages", "ghl_opportunities"],
    description: "Search for specific contacts, leads, pipelines, or sales opportunities in the GHL CRM knowledge base.",
    emptyMessage: "I couldn't find any specific CRM data (contacts or opportunities) matching your query."
})

// 2. List Recent Contacts
export const listRecentContactsTool = createRecentActivityTool({
    name: "list_recent_contacts",
    platform: "GoHighLevel",
    tableName: "ghl_contacts",
    description: "Fetches the most recently added or updated contacts from GoHighLevel."
})

// 3. List Recent Opportunities
export const listRecentOpportunitiesTool = createRecentActivityTool({
    name: "list_recent_opportunities",
    platform: "GoHighLevel",
    tableName: "ghl_opportunities",
    description: "Fetches the most recent sales opportunities and their current status from GHL pipelines.",
    statusEnum: ["open", "won", "lost", "abandoned"]
})
