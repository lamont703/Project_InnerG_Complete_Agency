-- HOW THE PUBLISHED CONTENT IS ACTUALLY PERFORMING, one row per platform per day.
--
-- WHAT THIS TABLE HAD TO ACCEPT BEFORE IT COULD BE DESIGNED. The five places
-- this site publishes to do not agree on what a "view" is, whether it is
-- reported per post or per account, or whether there is any reporting at all.
-- Every one of these was established by calling the API, not by reading a doc:
--
--   youtube     views, per video AND per day        YouTube Analytics API
--   instagram   views + reach, per media, LIFETIME  Graph API media insights
--   gbp         impressions, per LOCATION, per day  Business Profile Performance
--   linkedin    NOTHING                             403 ACCESS_DENIED
--   tiktok_ghl  likes/shares/comments, no views     GoHighLevel post insights
--   google      impressions, per SITE, per day      Search Console API
--
-- THE WORD "IMPRESSIONS" IS MOSTLY GONE. YouTube Analytics rejects the metric
-- outright ("Unknown identifier (impressions)") and Instagram now answers "The
-- Media Insights API does not support the impressions metric for this media
-- product type." Both moved to views. Only GBP and Search Console still report
-- a true impression. So metric_kind records WHICH NUMBER THIS IS, and the page
-- says so, because silently adding YouTube views to GBP impressions and calling
-- the total "impressions" would be a made-up number presented as a measurement.
create table if not exists public.content_metrics_daily (
  platform text not null
    check (platform in ('youtube','instagram','gbp','linkedin','tiktok_ghl','x','google')),

  -- The day the metric belongs to, NOT the day it was collected. For platforms
  -- that only report a lifetime total this is the collection day, which is what
  -- makes is_cumulative below necessary rather than cosmetic.
  metric_date date not null,

  -- Per post where the platform reports per post. EMPTY STRING, not null, for
  -- account-wide numbers — GBP reports for a location and Search Console for a
  -- site, neither of which can be attributed to one post. A nullable column
  -- here cannot carry a primary key, and the alternative (a synthetic id per
  -- account) would invent a post that does not exist.
  external_post_id text not null default '',

  -- Which queue item produced it, where that is knowable. Null for account-wide
  -- rows and for anything published before the publisher existed.
  queue_item_id uuid references public.publisher_queue(id) on delete set null,

  -- The headline number, whatever the platform calls it. Nullable because a
  -- platform can answer "I have engagement but no view count" — tiktok_ghl does
  -- exactly that, and storing 0 there would draw a line at the bottom of the
  -- chart implying we measured zero views rather than none.
  value bigint,

  -- What `value` actually is. Never assume it across platforms.
  metric_kind text not null check (metric_kind in ('impressions','views','reach','none')),

  -- TRUE when `value` is a lifetime total re-read each day rather than that
  -- day's activity. Instagram is the only one today. The chart differences
  -- these series; summing them instead would count every past view again on
  -- every subsequent day and produce a curve that only ever goes up.
  is_cumulative boolean not null default false,

  reach bigint,
  likes bigint,
  comments bigint,
  shares bigint,

  -- Why a platform reported nothing, kept so the page can distinguish "zero
  -- views" from "this platform cannot tell us" — which is the single most
  -- misleading thing a metrics dashboard can get wrong.
  unavailable_reason text,

  captured_at timestamptz not null default now(),

  primary key (platform, metric_date, external_post_id)
);

create index if not exists content_metrics_daily_date_idx
  on public.content_metrics_daily (metric_date desc, platform);

alter table public.content_metrics_daily enable row level security;

-- Service role only. The page is admin-gated and reads through a server
-- component, same posture as publisher_queue.
create policy "Allow service role full access" on public.content_metrics_daily
  for all to service_role using (true) with check (true);

comment on table public.content_metrics_daily is
  'Daily performance of published content, one row per platform per day (per post where the platform reports that way). metric_kind says which number value holds, because only GBP and Search Console still report true impressions.';
