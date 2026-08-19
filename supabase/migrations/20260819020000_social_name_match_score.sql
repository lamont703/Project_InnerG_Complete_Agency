-- How closely a scraped handle resembles the business name.
--
-- WHY THIS IS NOT confirmed_at. The score is a FACT we computed; confirmation
-- is a CLAIM that a person checked. Collapsing the two would make
-- "confirmed_at is not null" mean "a regex liked it", and every consumer that
-- trusts that column would silently be trusting something weaker than it was
-- promised. Keeping them separate lets a caller choose its own bar and lets
-- confirmed_at go on meaning what it says.
--
-- 0.6 IS THE USEFUL LINE, from reviewing the first full crawl: at or above it
-- the handle contains the distinctive words of the business name
-- (@fortworthbarbershop for Fort Worth Barber Shop). Below it the crawl picked
-- up something real but different -- most often a barber's personal account
-- from a "meet the team" page, which is a real person and not the business.

alter table public.entity_social_profiles
  add column if not exists name_match_score numeric;

comment on column public.entity_social_profiles.name_match_score is
  'Similarity between the handle and the business name, 0-1. A computed fact, NOT verification - confirmed_at is the only column that means a person checked.';

create index if not exists idx_social_match_score
  on public.entity_social_profiles (platform, name_match_score desc)
  where rejected_reason is null;
