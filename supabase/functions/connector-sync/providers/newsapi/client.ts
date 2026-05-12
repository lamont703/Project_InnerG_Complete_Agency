
import { NewsAPIResponse, NewsArticle } from "./types.ts";

/**
 * NewsAPIClient
 * Handles authenticated requests to NewsAPI.org
 */
export class NewsAPIClient {
    private baseUrl = "https://newsapi.org/v2";

    constructor(private apiKey: string) {
        if (!apiKey) throw new Error("NewsAPI Key is required");
    }

    private async request<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
        const queryParams = new URLSearchParams({
            ...params,
            apiKey: this.apiKey
        });

        const url = `${this.baseUrl}/${endpoint}?${queryParams.toString()}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== "ok") {
            throw new Error(`NewsAPI Error: ${data.message || data.code || 'Unknown error'}`);
        }

        return data as T;
    }

    /**
     * Fetch top headlines for a specific category.
     */
    async getTopHeadlines(category: string = 'technology', q?: string): Promise<NewsArticle[]> {
        const params: Record<string, string> = { 
            category,
            language: 'en'
        };
        if (q) params.q = q;

        const data = await this.request<NewsAPIResponse>("top-headlines", params);
        return data.articles;
    }

    /**
     * Search "everything" with keywords, sorted by relevancy.
     */
    async searchEverything(q: string, pageSize: number = 5): Promise<NewsArticle[]> {
        const data = await this.request<NewsAPIResponse>("everything", {
            q,
            sortBy: "relevancy",
            language: "en",
            pageSize: pageSize.toString()
        });
        return data.articles;
    }
}
