-- Hybrid (semantic + full-text) ranking RPC for events, mirroring
-- search_salons_ranked's shape (same 20% keyword / 80% semantic blend,
-- count(*) OVER() for pagination without hitting PostgREST's 1000-row
-- default cap). Two differences specific to events:
--   1. A hard filter to event_date >= CURRENT_DATE — always upcoming-only,
--      since there's no rating/review-volume signal to lean on instead.
--   2. Sort: when query_text is empty (pure browsing), sort soonest-first
--      by event_date, since match_score is meaningless without a query.
--      When there IS a query, sort by match_score first with event_date
--      as the tiebreaker, so equally-relevant results still favor sooner
--      events.
CREATE OR REPLACE FUNCTION public.search_events_ranked(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  category_filter text DEFAULT NULL,
  limit_val int DEFAULT 10,
  offset_val int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  event_date date,
  end_date date,
  start_time time,
  end_time time,
  venue_name text,
  address text,
  city text,
  category text,
  organizer_name text,
  ticket_url text,
  image_url text,
  price_info text,
  match_score numeric,
  total_matched bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH search_results AS (
    SELECT
      e.id,
      e.title,
      e.description,
      e.event_date,
      e.end_date,
      e.start_time,
      e.end_time,
      e.venue_name,
      e.address,
      e.city,
      e.category,
      e.organizer_name,
      e.ticket_url,
      e.image_url,
      e.price_info,
      e.embedding,
      to_tsvector('english',
        COALESCE(e.title, '') || ' ' ||
        COALESCE(e.description, '') || ' ' ||
        COALESCE(e.city, '') || ' ' ||
        COALESCE(e.venue_name, '') || ' ' ||
        COALESCE(e.category, '')
      ) as search_vector,
      websearch_to_tsquery('english', query_text) as search_query,
      (CASE
        WHEN query_embedding IS NOT NULL AND e.embedding IS NOT NULL
        THEN (1 - (e.embedding <=> query_embedding))
        ELSE 0
      END) as semantic_similarity
    FROM events e
    WHERE e.event_date >= CURRENT_DATE
      AND (category_filter IS NULL OR e.category = category_filter)
  )
  SELECT
    s.id,
    s.title,
    s.description,
    s.event_date,
    s.end_date,
    s.start_time,
    s.end_time,
    s.venue_name,
    s.address,
    s.city,
    s.category,
    s.organizer_name,
    s.ticket_url,
    s.image_url,
    s.price_info,
    (
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END)
    )::numeric AS match_score,
    count(*) OVER() as total_matched
  FROM search_results s
  WHERE (
    (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
    (CASE WHEN query_text = '' THEN 10 ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0) END)
  ) > 10 OR query_text = ''
  ORDER BY
    (CASE WHEN query_text = '' THEN 0 ELSE
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
    END) DESC,
    s.event_date ASC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
