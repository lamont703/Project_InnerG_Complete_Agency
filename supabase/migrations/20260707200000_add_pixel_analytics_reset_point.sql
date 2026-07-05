-- Soft reset for pixel analytics: historical pixel_events rows stay in the
-- database untouched (unlike the earlier localhost cleanup, this is real
-- production visitor data, not noise — reversible by design), but every
-- metric is floored at reset_at so the dashboard behaves as if today is
-- day one. "All Time" effectively becomes "since reset." Re-runnable for
-- future resets: just UPDATE this row's reset_at, no new migration needed.
CREATE TABLE IF NOT EXISTS pixel_analytics_settings (
  id boolean PRIMARY KEY DEFAULT true,
  reset_at timestamptz,
  CONSTRAINT pixel_analytics_settings_single_row CHECK (id = true)
);

INSERT INTO pixel_analytics_settings (id, reset_at)
VALUES (true, now())
ON CONFLICT (id) DO UPDATE SET reset_at = now();

CREATE OR REPLACE FUNCTION get_pixel_analytics_summary(p_cutoff timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reset_at timestamptz;
  v_effective_cutoff timestamptz;

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

  v_ai_mode_activations int;
  v_ai_messages_sent int;
  v_ai_rate_limit_hits int;

  v_top_pages jsonb;
  v_top_insights jsonb;
  v_top_referrers jsonb;
  v_top_filters jsonb;
BEGIN
  SELECT reset_at INTO v_reset_at FROM pixel_analytics_settings WHERE id = true;
  -- GREATEST treats NULL as "no bound," so this correctly becomes just
  -- reset_at for "All Time" (p_cutoff NULL) and the later of the two
  -- for any shorter selected window (Today/7D/30D never reaches back
  -- past the reset point even if the window itself would).
  v_effective_cutoff := GREATEST(p_cutoff, v_reset_at);

  -- 1. Core KPIs & VC Metrics & AI Metrics
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
    COUNT(*) FILTER (WHERE event_name = 'claim_shop_initiated'),
    COUNT(*) FILTER (WHERE event_name = 'ai_mode_activated'),
    COUNT(*) FILTER (WHERE event_name = 'ai_chat_message_sent'),
    COUNT(*) FILTER (WHERE event_name = 'ai_rate_limit_hit')
  INTO
    v_views, v_clicks, v_active_users, v_engaged_users,
    v_total_searches, v_unique_searchers, v_outbound_leads, v_shop_claims,
    v_ai_mode_activations, v_ai_messages_sent, v_ai_rate_limit_hits
  FROM pixel_events
  WHERE page_url ILIKE '%innergcomplete.com%'
    AND (v_effective_cutoff IS NULL OR created_at >= v_effective_cutoff);

  -- 2. Returning Users — single consistent rule for every timeframe.
  SELECT COUNT(*) INTO v_returning_users
  FROM (
    SELECT visitor_id
    FROM pixel_events
    WHERE page_url ILIKE '%innergcomplete.com%'
      AND visitor_id IS NOT NULL
      AND (v_effective_cutoff IS NULL OR created_at >= v_effective_cutoff)
    GROUP BY visitor_id
    HAVING COUNT(DISTINCT DATE(created_at)) > 1
  ) sub;

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
            WHEN page_url ILIKE '%innergcomplete.com%' THEN SPLIT_PART(page_url, 'innergcomplete.com', 2)
            ELSE page_url
          END,
          '?', 1
        ) AS clean_url,
        COUNT(*) as cnt
      FROM pixel_events
      WHERE page_url IS NOT NULL
        AND page_url ILIKE '%innergcomplete.com%'
        AND (v_effective_cutoff IS NULL OR created_at >= v_effective_cutoff)
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
            WHEN page_url ILIKE '%innergcomplete.com%' THEN SPLIT_PART(page_url, 'innergcomplete.com', 2)
            ELSE page_url
          END,
          '?', 1
        ) AS clean_url,
        COUNT(*) as cnt
      FROM pixel_events
      WHERE page_url IS NOT NULL
        AND page_url ILIKE '%innergcomplete.com%'
        AND (v_effective_cutoff IS NULL OR created_at >= v_effective_cutoff)
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
    WHERE page_url ILIKE '%innergcomplete.com%'
      AND (v_effective_cutoff IS NULL OR created_at >= v_effective_cutoff)
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
      AND page_url ILIKE '%innergcomplete.com%'
      AND (v_effective_cutoff IS NULL OR created_at >= v_effective_cutoff)
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 10
  ) f;

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
    'aiModeActivations', COALESCE(v_ai_mode_activations, 0),
    'aiMessagesSent', COALESCE(v_ai_messages_sent, 0),
    'aiRateLimitHits', COALESCE(v_ai_rate_limit_hits, 0),
    'topPages', v_top_pages,
    'topInsights', v_top_insights,
    'topReferrers', v_top_referrers,
    'topFilters', v_top_filters
  );

  RETURN v_result;
END;
$$;
