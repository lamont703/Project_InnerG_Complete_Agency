/**
 * notion/transformer.ts
 * Notion Data Transformer
 */

import { NotionPage, InternalNotionPage } from "./types.ts";

export class NotionTransformer {
    static toInternalPage(
        projectId: string, 
        page: NotionPage, 
        title: string, 
        content: string
    ): InternalNotionPage {
        return {
            project_id: projectId,
            notion_page_id: page.id,
            title: title,
            parent_id: page.parent?.type === "page_id" ? page.parent.page_id : 
                      page.parent?.type === "database_id" ? page.parent.database_id : undefined,
            url: page.url,
            content: content,
            last_edited_time: page.last_edited_time
        };
    }
}
