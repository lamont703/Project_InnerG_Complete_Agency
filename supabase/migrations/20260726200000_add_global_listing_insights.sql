-- Global "Listing Insights" leaderboard: organic conversion performance for
-- EVERY entity that has any pixel activity, across all 9 types. Companion to
-- get_listing_lead_report (single listing, monthly) — this returns one row per
-- entity with lifetime (or windowed) totals, for an admin-only leaderboard
-- filterable by entity type / city / state.
--
-- Attribution is the same page_url slug parse used everywhere else (pixel_events
-- carry no entity_id). Unlike get_entity_profile_engagement, this distinguishes
-- all 9 CLAIM_ENTITY_TYPES (barber_school vs cosmetology_school, and the two
-- store types) by which per-table slug join matched, and returns a raw location
-- string per entity — the app layer derives city/state from it against the
-- TX_CITIES / CA_CITIES lists (no `state` column exists in the schema).
--
-- Location column availability was verified against live rows:
--   * formatted_address + city: shop, salon, both schools, both stores
--   * city + address:           events
--   * metro_area + address:     barber, cosmetologist
CREATE OR REPLACE FUNCTION get_global_listing_insights(
  p_cutoff timestamptz DEFAULT NULL
)
RETURNS TABLE (
  route text,
  entity_type text,
  slug text,
  name text,
  location text,
  visits bigint,
  unique_visitors bigint,
  call_clicks bigint,
  website_clicks bigint,
  email_clicks bigint,
  total_leads bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ev AS (
    SELECT
      (regexp_match(page_url, '/(salons|schools|barbers|shop|stores|cosmetologists|events)/([^/?#]+)'))[1] AS route,
      (regexp_match(page_url, '/(salons|schools|barbers|shop|stores|cosmetologists|events)/([^/?#]+)'))[2] AS slug,
      event_name, visitor_id, metadata
    FROM pixel_events
    WHERE page_url ILIKE '%innergcomplete.com%'
      AND page_url ~ '/(salons|schools|barbers|shop|stores|cosmetologists|events)/[^/?#]+'
      AND (p_cutoff IS NULL OR created_at >= p_cutoff)
  ),
  agg AS (
    SELECT
      route,
      slug,
      COUNT(*) FILTER (WHERE event_name = 'page_view') AS visits,
      COUNT(DISTINCT visitor_id) FILTER (WHERE event_name = 'page_view') AS unique_visitors,
      COUNT(*) FILTER (
        WHERE event_name = 'click' AND metadata->>'ig_click' = 'outbound_lead'
          AND metadata->>'href' ILIKE 'tel:%'
      ) AS call_clicks,
      COUNT(*) FILTER (
        WHERE event_name = 'click' AND metadata->>'ig_click' = 'outbound_lead'
          AND COALESCE(metadata->>'href', '') NOT ILIKE 'tel:%'
          AND COALESCE(metadata->>'href', '') NOT ILIKE 'mailto:%'
      ) AS website_clicks,
      COUNT(*) FILTER (
        WHERE event_name = 'click' AND metadata->>'ig_click' = 'outbound_lead'
          AND metadata->>'href' ILIKE 'mailto:%'
      ) AS email_clicks,
      COUNT(*) FILTER (
        WHERE event_name = 'click' AND metadata->>'ig_click' = 'outbound_lead'
      ) AS total_leads
    FROM ev
    WHERE slug IS NOT NULL
    GROUP BY route, slug
  )
  SELECT
    a.route,
    CASE
      WHEN sh.slug IS NOT NULL THEN 'shop'
      WHEN sal.slug IS NOT NULL THEN 'salon'
      WHEN sch1.slug IS NOT NULL THEN 'barber_school'
      WHEN sch2.slug IS NOT NULL THEN 'cosmetology_school'
      WHEN st1.slug IS NOT NULL THEN 'barber_supply_store'
      WHEN st2.slug IS NOT NULL THEN 'beauty_supply_store'
      WHEN bar.slug IS NOT NULL THEN 'barber'
      WHEN cos.slug IS NOT NULL THEN 'cosmetologist'
      WHEN evt.slug IS NOT NULL THEN 'event'
    END AS entity_type,
    a.slug,
    COALESCE(sh.shop_name, sal.shop_name, sch1.school_name, sch2.school_name,
             st1.name, st2.name, bar.name, cos.name, evt.title) AS name,
    COALESCE(
      sh.formatted_address, sh.city,
      sal.formatted_address, sal.city,
      sch1.formatted_address, sch1.city,
      sch2.formatted_address, sch2.city,
      st1.formatted_address, st1.city,
      st2.formatted_address, st2.city,
      bar.metro_area, bar.address,
      cos.metro_area, cos.address,
      evt.city, evt.address
    ) AS location,
    a.visits,
    a.unique_visitors,
    a.call_clicks,
    a.website_clicks,
    a.email_clicks,
    a.total_leads
  FROM agg a
  LEFT JOIN agent_barbershop_leads sh        ON a.route = 'shop'           AND sh.slug   = a.slug
  LEFT JOIN agent_salon_leads sal            ON a.route = 'salons'         AND sal.slug  = a.slug
  LEFT JOIN agent_barber_school_leads sch1   ON a.route = 'schools'        AND sch1.slug = a.slug
  LEFT JOIN agent_cosmetology_school_leads sch2 ON a.route = 'schools'     AND sch2.slug = a.slug
  LEFT JOIN agent_barber_supply_store_leads st1 ON a.route = 'stores'      AND st1.slug  = a.slug
  LEFT JOIN agent_beauty_supply_store_leads st2 ON a.route = 'stores'      AND st2.slug  = a.slug
  LEFT JOIN agent_barber_leads bar           ON a.route = 'barbers'        AND bar.slug  = a.slug
  LEFT JOIN agent_cosmetologist_leads cos    ON a.route = 'cosmetologists' AND cos.slug  = a.slug
  LEFT JOIN events evt                       ON a.route = 'events'         AND evt.slug  = a.slug
  WHERE COALESCE(sh.shop_name, sal.shop_name, sch1.school_name, sch2.school_name,
                 st1.name, st2.name, bar.name, cos.name, evt.title) IS NOT NULL
  ORDER BY a.total_leads DESC, a.visits DESC;
$$;

GRANT EXECUTE ON FUNCTION get_global_listing_insights(timestamptz) TO service_role, authenticated;
