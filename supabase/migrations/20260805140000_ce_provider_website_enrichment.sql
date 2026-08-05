-- Website enrichment columns for Texas CE providers.
--
-- WHY THE WEBSITE AND NOT A GOOGLE BUSINESS PROFILE. A licensee choosing a CE
-- provider is picking between roughly $10 and $25 for the same state-mandated
-- four hours, taken online. They are not driving anywhere, so hours, directions
-- and photos of a building answer nothing. Price, format and whether the
-- business still exists answer everything — and those live on the homepage.
--
-- Much of this dataset has no storefront by design: 8 provider names ARE
-- domains, 20 say "online", and one operator holds 20 licences across 20 cities
-- on a single 888 number. A Maps listing does not exist for most of them.
--
-- website_verdict RECORDS WHY A URL WAS ACCEPTED OR REJECTED, because a domain
-- resolving is not evidence it belongs to the provider. Parked pages, squatters
-- and for-sale placeholders all answer 200 cheerfully.

alter table public.agent_texas_ce_provider_leads
  add column if not exists website_status        integer,
  add column if not exists website_final_url     text,
  add column if not exists website_title         text,
  -- 'confirmed'  content ties the site to this provider or to Texas CE
  -- 'unconfirmed' resolves, but nothing on the page connects it to them
  -- 'parked'     placeholder or for-sale page
  -- 'dead'       DNS failure, timeout, or 4xx/5xx
  add column if not exists website_verdict       text,
  add column if not exists price_min_usd         numeric,
  add column if not exists price_max_usd         numeric,
  add column if not exists mentions_tdlr         boolean,
  add column if not exists website_checked_at    timestamptz;

comment on column public.agent_texas_ce_provider_leads.website_verdict is
  'Why the URL was accepted: confirmed / unconfirmed / parked / dead. A 200 alone is not evidence the site belongs to the provider.';
comment on column public.agent_texas_ce_provider_leads.price_min_usd is
  'Lowest plausible course price found on the homepage. Bounded to $5-$200 — outside that range a dollar figure on a CE page is not a course price.';

create index if not exists idx_ce_provider_verdict on public.agent_texas_ce_provider_leads (website_verdict);
create index if not exists idx_ce_provider_price   on public.agent_texas_ce_provider_leads (price_min_usd);
