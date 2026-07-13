-- Stores real Google Ads API KeywordPlanIdeaService results so the agent
-- (and the internal dashboard) can read/reuse pulls without re-hitting the
-- API for the same seed keyword within a TTL.
create table if not exists keyword_intelligence_pulls (
  id uuid primary key default gen_random_uuid(),
  seed_keyword text not null,
  keyword_text text not null,
  avg_monthly_searches integer,
  competition text,
  competition_index integer,
  low_top_of_page_bid_micros bigint,
  high_top_of_page_bid_micros bigint,
  geo_target text,
  language text,
  pulled_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists keyword_intelligence_pulls_keyword_idx
  on keyword_intelligence_pulls (keyword_text);

create index if not exists keyword_intelligence_pulls_seed_idx
  on keyword_intelligence_pulls (seed_keyword, pulled_at desc);
