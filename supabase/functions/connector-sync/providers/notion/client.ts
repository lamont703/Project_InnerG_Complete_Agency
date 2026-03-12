/**
 * notion/client.ts
 * Notion API Client
 */

export class NotionClient {
    private baseUrl = "https://api.notion.com/v1";

    constructor(private apiKey: string) {}

    private async request(endpoint: string, method = "GET", body?: any) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: {
                "Authorization": `Bearer ${this.apiKey}`,
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Notion API Error: ${error.message || response.statusText}`);
        }

        return response.json();
    }

    async getPage(pageId: string) {
        return this.request(`/pages/${pageId}`);
    }

    async getBlocks(blockId: string) {
        let blocks: any[] = [];
        let cursor: string | undefined;

        do {
            const url = cursor 
                ? `/blocks/${blockId}/children?start_cursor=${encodeURIComponent(cursor)}` 
                : `/blocks/${blockId}/children`;
            const result = await this.request(url);
            blocks = [...blocks, ...result.results];
            cursor = result.next_cursor;
        } while (cursor);

        return blocks;
    }

    async search(query = "", filter?: any, cursor?: string) {
        const body: any = {
            query,
            filter,
            page_size: 100,
        };
        
        if (cursor) {
            body.start_cursor = cursor;
        }

        return this.request("/search", "POST", body);
    }

    /**
     * Helper to get page title from properties
     */
    getPageTitle(page: any): string {
        const props = page.properties;
        // Search for title property (it's usually 'title' or 'Name')
        for (const key in props) {
            if (props[key].type === "title") {
                return props[key].title.map((t: any) => t.plain_text).join("");
            }
        }
        return "Untitled";
    }

    /**
     * Basic block to text conversion
     */
    async getPageContent(pageId: string): Promise<string> {
        const blocks = await this.getBlocks(pageId);
        return blocks
            .map((block: any) => {
                const type = block.type;
                const content = block[type]?.rich_text?.map((t: any) => t.plain_text).join("") || "";
                
                switch (type) {
                    case "heading_1": return `# ${content}`;
                    case "heading_2": return `## ${content}`;
                    case "heading_3": return `### ${content}`;
                    case "bulleted_list_item": return `* ${content}`;
                    case "numbered_list_item": return `1. ${content}`;
                    case "to_do": return `[${block.to_do.checked ? "x" : " "}] ${content}`;
                    default: return content;
                }
            })
            .filter(Boolean)
            .join("\n\n");
    }
}
