-- Formal advertiser campaigns: links a user (advertiser) to an ad placement so
-- their /account/ad-performance page can show only the ad events that belong to
-- them. A campaign matches a pixel_events ad_impression/ad_click when:
--   metadata->>placement = placement
--   AND (creative IS NULL OR metadata->>creative = creative)
--   AND (scope    IS NULL OR metadata->>scope    = scope)
-- Assigned by an internal admin at /admin/ad-campaigns when a placement is sold.

CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  -- Which slot: shop_profile | salon_profile | state_hub_banner | city_hub_banner | search_results
  placement    text NOT NULL,
  -- Narrow the match to a specific creative (entity slug) and/or geographic
  -- scope. NULL means "any" for that dimension.
  creative     text,
  scope        text,
  status       text NOT NULL DEFAULT 'active', -- active | paused
  start_date   date,
  end_date     date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ad_campaigns_user_idx ON public.ad_campaigns (user_id, status);
CREATE INDEX IF NOT EXISTS ad_campaigns_placement_idx ON public.ad_campaigns (placement);

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

-- An advertiser can read their own campaigns (the /account page runs as them).
CREATE POLICY "Users read own ad_campaigns"
  ON public.ad_campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Service role (admin assignment + server-side aggregation) has full access.
CREATE POLICY "Service role full access to ad_campaigns"
  ON public.ad_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);
