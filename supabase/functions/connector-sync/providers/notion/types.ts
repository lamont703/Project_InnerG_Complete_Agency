/**
 * notion/types.ts
 * Notion API Types
 */

export interface NotionPage {
    id: string;
    created_time: string;
    last_edited_time: string;
    url: string;
    properties: any;
    parent: {
        type: string;
        page_id?: string;
        database_id?: string;
        workspace?: boolean;
    };
}

export interface NotionBlock {
    id: string;
    type: string;
    [key: string]: any;
}

export interface InternalNotionPage {
    project_id: string;
    notion_page_id: string;
    title: string;
    parent_id?: string;
    url?: string;
    content?: string;
    last_edited_time: string;
}
