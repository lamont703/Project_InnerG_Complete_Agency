-- Some crawled "articles" are actually direct links to an image file (e.g.
-- CDN-hosted product photos), which render as a broken/empty card in the
-- Articles feed since there's no article content or reliable og_image to
-- show. is_image is a generated column (not a one-time backfill) so it's
-- always correct for both existing and future rows without depending on
-- crawler code remembering to set it.
ALTER TABLE public.scraped_web_pages
ADD COLUMN IF NOT EXISTS is_image BOOLEAN
GENERATED ALWAYS AS (url ~* '\.(jpg|jpeg|png|webp|gif|svg|avif)(\?.*)?$') STORED;

CREATE INDEX IF NOT EXISTS scraped_web_pages_is_image_idx ON public.scraped_web_pages (is_image);

-- search_web_pages_ranked gains an is_image_filter, mirroring is_video_filter.
-- Articles-tab callers now pass is_image_filter = false (in addition to
-- is_video_filter = false) so raw image links no longer surface there.
CREATE OR REPLACE FUNCTION public.search_web_pages_ranked(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  limit_val int DEFAULT 20,
  is_video_filter boolean DEFAULT NULL,
  offset_val int DEFAULT 0,
  is_image_filter boolean DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  url text,
  raw_text text,
  domain_id uuid,
  og_image_url text,
  is_video boolean,
  domain_url text,
  match_score numeric,
  total_matched bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH search_results AS (
    SELECT
      w.id,
      w.url,
      w.raw_text,
      w.domain_id,
      w.og_image_url,
      w.is_video,
      w.embedding,
      d.domain_url,
      to_tsvector('english', left(COALESCE(w.raw_text, ''), 100000)) as search_vector,
      websearch_to_tsquery('english', query_text) as search_query,
      (CASE
        WHEN query_embedding IS NOT NULL AND w.embedding IS NOT NULL
        THEN (1 - (w.embedding <=> query_embedding))
        ELSE 0
      END) as semantic_similarity
    FROM scraped_web_pages w
    INNER JOIN crawler_seed_domains d ON w.domain_id = d.id
    WHERE (is_video_filter IS NULL OR w.is_video = is_video_filter)
      AND (is_image_filter IS NULL OR w.is_image = is_image_filter)
      AND d.status = 'Active'
  )
  SELECT
    s.id,
    s.url,
    s.raw_text,
    s.domain_id,
    s.og_image_url,
    s.is_video,
    s.domain_url,
    (
      -- 80% Weight to AI Semantic Score
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      -- 20% Weight to Keyword Score
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END)
    )::numeric AS match_score,
    count(*) OVER() as total_matched
  FROM search_results s
  -- Soft filter: Must score higher than 10 points
  WHERE (
    (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
    (CASE WHEN query_text = '' THEN 10 ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0) END)
  ) > 10
  ORDER BY match_score DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
