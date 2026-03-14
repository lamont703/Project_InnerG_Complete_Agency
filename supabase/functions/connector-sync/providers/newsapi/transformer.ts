
import { NewsArticle, NewsBucketCategory } from "./types.ts";

/**
 * NewsAPITransformer
 * Maps NewsAPI articles to news_intelligence table structure.
 */
export class NewsAPITransformer {
    static toInternalArticle(projectId: string, bucket: NewsBucketCategory, article: NewsArticle) {
        return {
            project_id: projectId,
            bucket: bucket,
            title: article.title,
            description: article.description || null,
            url: article.url,
            source_name: article.source.name,
            published_at: article.publishedAt,
            synced_at: new Date().toISOString()
        };
    }
}
