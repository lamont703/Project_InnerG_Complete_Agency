-- Ranks entity profile pages (salons, schools, barbers, shops, stores,
-- cosmetologists, events) by real page visits and outbound-lead clicks
-- (call/website/tickets), independent of the existing
-- get_search_performance_by_entity RPC — that one only measures impressions
-- inside our own /tools/barbershop-search results, not total traffic to the
-- profile page itself (organic search, direct, referral, etc.). This is
-- the "who's actually getting found and would want to know it" leaderboard
-- for owner-outreach purposes.
--
-- entity_type/slug are parsed directly out of page_url rather than joined
-- from a tracked entity_id, since page_view events carry no entity
-- metadata today — the URL path is the only signal available, and every
-- profile route is already slug-keyed.
CREATE OR REPLACE FUNCTION get_entity_profile_engagement(
  p_cutoff timestamptz DEFAULT NULL,
  p_limit int DEFAULT 25
)
RETURNS TABLE (
  entity_type text,
  slug text,
  name text,
  href text,
  visits bigint,
  outbound_clicks bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH profile_views AS (
    SELECT
      (regexp_match(page_url, '/(salons|schools|barbers|shop|stores|cosmetologists|events)/([^/?#]+)'))[1] AS route,
      (regexp_match(page_url, '/(salons|schools|barbers|shop|stores|cosmetologists|events)/([^/?#]+)'))[2] AS slug
    FROM pixel_events
    WHERE event_name = 'page_view'
      AND page_url ILIKE '%innergcomplete.com%'
      AND page_url ~ '/(salons|schools|barbers|shop|stores|cosmetologists|events)/[^/?#]+'
      AND (p_cutoff IS NULL OR created_at >= p_cutoff)
  ),
  visit_agg AS (
    SELECT
      CASE route
        WHEN 'salons' THEN 'salon' WHEN 'schools' THEN 'school' WHEN 'barbers' THEN 'barber'
        WHEN 'shop' THEN 'shop' WHEN 'stores' THEN 'store' WHEN 'cosmetologists' THEN 'cosmetologist'
        WHEN 'events' THEN 'event'
      END AS entity_type,
      slug,
      COUNT(*) AS visits
    FROM profile_views
    WHERE slug IS NOT NULL
    GROUP BY 1, 2
  ),
  outbound_clicks AS (
    SELECT
      CASE (regexp_match(page_url, '/(salons|schools|barbers|shop|stores|cosmetologists|events)/([^/?#]+)'))[1]
        WHEN 'salons' THEN 'salon' WHEN 'schools' THEN 'school' WHEN 'barbers' THEN 'barber'
        WHEN 'shop' THEN 'shop' WHEN 'stores' THEN 'store' WHEN 'cosmetologists' THEN 'cosmetologist'
        WHEN 'events' THEN 'event'
      END AS entity_type,
      (regexp_match(page_url, '/(salons|schools|barbers|shop|stores|cosmetologists|events)/([^/?#]+)'))[2] AS slug,
      COUNT(*) AS clicks
    FROM pixel_events
    WHERE event_name = 'click'
      AND metadata->>'ig_click' = 'outbound_lead'
      AND page_url ILIKE '%innergcomplete.com%'
      AND page_url ~ '/(salons|schools|barbers|shop|stores|cosmetologists|events)/[^/?#]+'
      AND (p_cutoff IS NULL OR created_at >= p_cutoff)
    GROUP BY 1, 2
  )
  SELECT
    v.entity_type,
    v.slug,
    COALESCE(sal.shop_name, sh.shop_name, bar.name, cos.name, sch1.school_name, sch2.school_name, st1.name, st2.name, ev.title) AS name,
    CASE v.entity_type
      WHEN 'salon' THEN '/salons/' || v.slug
      WHEN 'school' THEN '/schools/' || v.slug
      WHEN 'barber' THEN '/barbers/' || v.slug
      WHEN 'shop' THEN '/shop/' || v.slug
      WHEN 'store' THEN '/stores/' || v.slug
      WHEN 'cosmetologist' THEN '/cosmetologists/' || v.slug
      WHEN 'event' THEN '/events/' || v.slug
    END AS href,
    v.visits,
    COALESCE(o.clicks, 0) AS outbound_clicks
  FROM visit_agg v
  LEFT JOIN outbound_clicks o ON o.entity_type = v.entity_type AND o.slug = v.slug
  LEFT JOIN agent_salon_leads sal ON v.entity_type = 'salon' AND sal.slug = v.slug
  LEFT JOIN agent_barbershop_leads sh ON v.entity_type = 'shop' AND sh.slug = v.slug
  LEFT JOIN agent_barber_leads bar ON v.entity_type = 'barber' AND bar.slug = v.slug
  LEFT JOIN agent_cosmetologist_leads cos ON v.entity_type = 'cosmetologist' AND cos.slug = v.slug
  LEFT JOIN agent_barber_school_leads sch1 ON v.entity_type = 'school' AND sch1.slug = v.slug
  LEFT JOIN agent_cosmetology_school_leads sch2 ON v.entity_type = 'school' AND sch2.slug = v.slug
  LEFT JOIN agent_barber_supply_store_leads st1 ON v.entity_type = 'store' AND st1.slug = v.slug
  LEFT JOIN agent_beauty_supply_store_leads st2 ON v.entity_type = 'store' AND st2.slug = v.slug
  LEFT JOIN events ev ON v.entity_type = 'event' AND ev.slug = v.slug
  WHERE COALESCE(sal.shop_name, sh.shop_name, bar.name, cos.name, sch1.school_name, sch2.school_name, st1.name, st2.name, ev.title) IS NOT NULL
  ORDER BY v.visits DESC
  LIMIT p_limit;
$$;
