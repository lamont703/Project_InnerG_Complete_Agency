-- Migration: Add unique searchers metric
-- Extends the `get_pixel_analytics_summary` RPC to count unique visitors who searched

CREATE OR REPLACE FUNCTION get_pixel_analytics_summary(p_cutoff timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_views int;
  v_clicks int;
  v_active_users int;
  v_engaged_users int;
  v_returning_users int;
  
  v_total_searches int;
  v_unique_searchers int;
  v_outbound_leads int;
  v_shop_claims int;
  
  v_top_pages jsonb;
  v_top_insights jsonb;
  v_top_referrers jsonb;
  v_top_filters jsonb;
BEGIN

  -- 1. Core KPIs & VC Metrics
  SELECT 
    COUNT(*) FILTER (WHERE event_name = 'page_view'),
    COUNT(*) FILTER (WHERE event_name = 'click'),
    COUNT(DISTINCT visitor_id),
    COUNT(DISTINCT visitor_id) FILTER (
      WHERE event_name = 'click' 
         OR (event_name = 'scroll' AND metadata->>'depth' = '50%')
         OR (event_name = 'page_leave' AND (metadata->>'duration_seconds')::numeric >= 60)
    ),
    COUNT(*) FILTER (WHERE event_name = 'search_executed'),
    COUNT(DISTINCT visitor_id) FILTER (WHERE event_name = 'search_executed'),
    COUNT(*) FILTER (WHERE event_name = 'click' AND metadata->>'ig_click' = 'outbound_lead'),
    COUNT(*) FILTER (WHERE event_name = 'claim_shop_initiated')
  INTO 
    v_views, v_clicks, v_active_users, v_engaged_users, v_total_searches, v_unique_searchers, v_outbound_leads, v_shop_claims
  FROM pixel_events
  WHERE (page_url ILIKE '%localhost%' OR page_url ILIKE '%innergcomplete.com%')
    AND (p_cutoff IS NULL OR created_at >= p_cutoff);

  -- 2. Returning Users Logic
  IF p_cutoff IS NOT NULL THEN
    SELECT COUNT(DISTINCT visitor_id) INTO v_returning_users
    FROM pixel_events
    WHERE (page_url ILIKE '%localhost%' OR page_url ILIKE '%innergcomplete.com%')
      AND created_at >= p_cutoff
      AND visitor_id IN (
        SELECT visitor_id 
        FROM pixel_events 
        WHERE created_at < p_cutoff
      );
  ELSE
    SELECT COUNT(*) INTO v_returning_users
    FROM (
      SELECT visitor_id
      FROM pixel_events
      WHERE (page_url ILIKE '%localhost%' OR page_url ILIKE '%innergcomplete.com%')
        AND visitor_id IS NOT NULL
      GROUP BY visitor_id
      HAVING COUNT(DISTINCT DATE(created_at)) > 1
    ) sub;
  END IF;

  -- 3. Top Pages
  SELECT COALESCE(jsonb_agg(jsonb_build_object('url', final_url, 'count', cnt)), '[]'::jsonb)
  INTO v_top_pages
  FROM (
    SELECT 
      CASE WHEN clean_url = '' OR clean_url = '/' THEN 'Home' ELSE clean_url END AS final_url,
      SUM(cnt) as cnt
    FROM (
      SELECT 
        SPLIT_PART(
          CASE 
            WHEN page_url ILIKE '%localhost:3000%' THEN SPLIT_PART(page_url, 'localhost:3000', 2)
            WHEN page_url ILIKE '%innergcomplete.com%' THEN SPLIT_PART(page_url, 'innergcomplete.com', 2)
            ELSE page_url
          END, 
          '?', 1
        ) AS clean_url,
        COUNT(*) as cnt
      FROM pixel_events
      WHERE page_url IS NOT NULL
        AND (page_url ILIKE '%localhost%' OR page_url ILIKE '%innergcomplete.com%')
        AND (p_cutoff IS NULL OR created_at >= p_cutoff)
      GROUP BY 1
    ) base
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 10
  ) agg;

  -- 4. Top Insights
  SELECT COALESCE(jsonb_agg(jsonb_build_object('url', final_url, 'count', cnt)), '[]'::jsonb)
  INTO v_top_insights
  FROM (
    SELECT 
      clean_url AS final_url,
      SUM(cnt) as cnt
    FROM (
      SELECT 
        SPLIT_PART(
          CASE 
            WHEN page_url ILIKE '%localhost:3000%' THEN SPLIT_PART(page_url, 'localhost:3000', 2)
            WHEN page_url ILIKE '%innergcomplete.com%' THEN SPLIT_PART(page_url, 'innergcomplete.com', 2)
            ELSE page_url
          END, 
          '?', 1
        ) AS clean_url,
        COUNT(*) as cnt
      FROM pixel_events
      WHERE page_url IS NOT NULL
        AND (page_url ILIKE '%localhost%' OR page_url ILIKE '%innergcomplete.com%')
        AND (p_cutoff IS NULL OR created_at >= p_cutoff)
      GROUP BY 1
    ) base
    WHERE clean_url LIKE '/insights%'
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 10
  ) agg;

  -- 5. Top Referrers
  SELECT COALESCE(jsonb_agg(jsonb_build_object('url', ref, 'count', cnt)), '[]'::jsonb)
  INTO v_top_referrers
  FROM (
    SELECT 
      COALESCE(
        NULLIF(SPLIT_PART(REPLACE(REPLACE(referrer, 'https://', ''), 'http://', ''), '/', 1), ''),
        'Direct / Unknown'
      ) as ref,
      COUNT(*) as cnt
    FROM pixel_events
    WHERE (page_url ILIKE '%localhost%' OR page_url ILIKE '%innergcomplete.com%')
      AND (p_cutoff IS NULL OR created_at >= p_cutoff)
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 10
  ) agg;

  -- 6. Top Search Filters
  SELECT COALESCE(jsonb_agg(jsonb_build_object('filter_id', f.val, 'count', f.cnt)), '[]'::jsonb)
  INTO v_top_filters
  FROM (
    SELECT 
      jsonb_array_elements_text(metadata->'filters_used') as val,
      COUNT(*) as cnt
    FROM pixel_events
    WHERE event_name = 'search_executed'
      AND metadata->'filters_used' IS NOT NULL
      AND jsonb_typeof(metadata->'filters_used') = 'array'
      AND (page_url ILIKE '%localhost%' OR page_url ILIKE '%innergcomplete.com%')
      AND (p_cutoff IS NULL OR created_at >= p_cutoff)
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 10
  ) f;

  -- Combine into final JSON
  v_result := jsonb_build_object(
    'totalViews', COALESCE(v_views, 0),
    'totalClicks', COALESCE(v_clicks, 0),
    'activeUsers', COALESCE(v_active_users, 0),
    'engagedUsers', COALESCE(v_engaged_users, 0),
    'returningUsers', COALESCE(v_returning_users, 0),
    'totalSearches', COALESCE(v_total_searches, 0),
    'uniqueSearchers', COALESCE(v_unique_searchers, 0),
    'outboundLeads', COALESCE(v_outbound_leads, 0),
    'shopClaims', COALESCE(v_shop_claims, 0),
    'topPages', v_top_pages,
    'topInsights', v_top_insights,
    'topReferrers', v_top_referrers,
    'topFilters', v_top_filters
  );

  RETURN v_result;
END;
$$;
