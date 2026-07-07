-- Second real gap found live: "any barber industry events coming up"
-- (a broad, generic phrase, not a literal substring of any stored data)
-- returned zero rows even though a real matching event exists. The
-- previous fix's ILIKE fallback required the WHOLE query phrase to
-- appear as a literal substring — works for a city name ("Houston") but
-- not a multi-word descriptive phrase where only SOME words are
-- meaningful. Same class of fix already proven for school/student name
-- matching earlier: match on individual significant tokens (>= 3 chars)
-- instead of the whole phrase, requiring only one token to hit.
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
  WITH query_tokens AS (
    SELECT unnest(string_to_array(lower(trim(query_text)), ' ')) AS token
  ),
  search_results AS (
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
      END) as semantic_similarity,
      (SELECT count(*) FROM query_tokens qt
        WHERE length(qt.token) >= 3 AND (
          lower(COALESCE(e.title, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(e.description, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(e.venue_name, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(e.city, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(e.category, '')) LIKE '%' || qt.token || '%'
        )
      ) AS token_matches
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
  WHERE query_text = ''
     OR (
       (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
       COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
     ) > 10
     OR (query_embedding IS NULL AND s.token_matches > 0)
  ORDER BY
    (CASE WHEN query_text = '' THEN 0 ELSE
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0) +
      s.token_matches
    END) DESC,
    s.event_date ASC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
