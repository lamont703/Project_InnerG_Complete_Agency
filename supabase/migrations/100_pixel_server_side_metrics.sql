-- ============================================================
-- Migration 100: Server-Side Pixel Event Aggregation
-- Inner G Complete Agency — Proprietary Tracking System
-- ============================================================
-- This adds a highly optimized RPC to calculate funnel metrics
-- entirely on the database side, solving the 1,000 row limit
-- and performance issues on the client side.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_pixel_metrics_summary(p_project_id UUID)
RETURNS JSONB SECURITY DEFINER AS $$
DECLARE
    v_total_hits BIGINT;
    v_unique_visitors BIGINT;
    v_identified_count BIGINT;
    v_clicks JSONB;
BEGIN
    -- 1. Total Hits (Count exact from events)
    SELECT COUNT(*) INTO v_total_hits 
    FROM public.pixel_events 
    WHERE project_id = p_project_id;

    -- 2. Unique Visitors (Count from visitors table)
    SELECT COUNT(*) INTO v_unique_visitors 
    FROM public.pixel_visitors 
    WHERE project_id = p_project_id;

    -- 3. Identified Count (Stitched profiles)
    SELECT COUNT(*) INTO v_identified_count 
    FROM public.pixel_visitors 
    WHERE project_id = p_project_id 
    AND (
        email IS NOT NULL 
        OR full_name IS NOT NULL 
        OR (identity_metadata != '{}'::jsonb AND identity_metadata IS NOT NULL)
    );

    -- 4. Click Aggregations (Combining event_name and mapping element_name)
    -- This mirrors the client-side reduce logic but performs it in SQL
    WITH combined_keys AS (
        SELECT event_name as k FROM public.pixel_events WHERE project_id = p_project_id AND event_name IS NOT NULL
        UNION ALL
        SELECT element_name as k FROM public.pixel_events WHERE project_id = p_project_id AND element_name IS NOT NULL
    )
    SELECT jsonb_object_agg(k, cnt) INTO v_clicks
    FROM (
        SELECT k, COUNT(*)::BIGINT as cnt
        FROM combined_keys
        GROUP BY k
    ) s;

    RETURN jsonb_build_object(
        'totalHits', v_total_hits,
        'uniqueVisitors', v_unique_visitors,
        'identifiedCount', v_identified_count,
        'clicks', COALESCE(v_clicks, '{}'::jsonb)
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_pixel_metrics_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pixel_metrics_summary(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_pixel_metrics_summary(UUID) TO service_role;

COMMENT ON FUNCTION public.get_pixel_metrics_summary IS 'Returns aggregated pixel metrics (hits, visitors, identified, clicks) for a specific project.';
