-- ============================================================
-- Migration 004: Create Campaigns Domain
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Tables: campaigns, campaign_metrics, funnel_stages, funnel_events
-- ============================================================

-- CAMPAIGNS
CREATE TABLE IF NOT EXISTS public.campaigns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  goal                TEXT,
  status              campaign_status NOT NULL DEFAULT 'draft',
  start_date          DATE,
  end_date            DATE,
  ghl_campaign_id     TEXT,           -- GHL pipeline/campaign ID
  ig_hashtag          TEXT,           -- e.g. "#KanesGiveaway"
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS campaigns_updated_at ON public.campaigns;
CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_campaigns_project_id ON public.campaigns(project_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);

-- CAMPAIGN METRICS (Daily KPI Snapshots)
CREATE TABLE IF NOT EXISTS public.campaign_metrics (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id             UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  snapshot_date           DATE NOT NULL,
  total_signups           INTEGER NOT NULL DEFAULT 0,
  new_signups_today       INTEGER NOT NULL DEFAULT 0,
  app_installs            INTEGER NOT NULL DEFAULT 0,
  activation_rate         NUMERIC(5,4) NOT NULL DEFAULT 0, -- 0.0000 to 1.0000
  social_reach            INTEGER NOT NULL DEFAULT 0,
  social_engagement       INTEGER NOT NULL DEFAULT 0,
  sentiment_positive_pct  NUMERIC(5,4) NOT NULL DEFAULT 0,
  ad_impressions          INTEGER NOT NULL DEFAULT 0,
  landing_page_visits     INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_date ON public.campaign_metrics(campaign_id, snapshot_date DESC);

-- FUNNEL STAGES (ordered steps within a campaign)
CREATE TABLE IF NOT EXISTS public.funnel_stages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  position        INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, position)
);

CREATE INDEX IF NOT EXISTS idx_funnel_stages_campaign ON public.funnel_stages(campaign_id, position);

-- FUNNEL EVENTS (daily counts per stage)
CREATE TABLE IF NOT EXISTS public.funnel_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_stage_id     UUID NOT NULL REFERENCES public.funnel_stages(id) ON DELETE CASCADE,
  snapshot_date       DATE NOT NULL,
  count               INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (funnel_stage_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_stage_date ON public.funnel_events(funnel_stage_id, snapshot_date DESC);

COMMENT ON TABLE public.campaign_metrics IS
  'Daily KPI snapshot per campaign. Populated by generate-daily-snapshot Edge Function or KPI Aggregation via client_db_connections.';
COMMENT ON COLUMN public.campaign_metrics.activation_rate IS
  'Ratio 0.0–1.0. UI displays as percentage (e.g. 0.651 = 65.1%).';
COMMENT ON TABLE public.funnel_stages IS
  'Ordered funnel step definitions for a campaign.';
COMMENT ON TABLE public.funnel_events IS
  'Daily count of entries at each funnel stage.';
