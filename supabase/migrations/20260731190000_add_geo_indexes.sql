-- Composite (latitude, longitude) indexes for the proximity queries.
--
-- Nine tables carry coordinates and not one of them was indexed on those
-- columns, so every "what's near this point" query was a sequential scan. That
-- is survivable at a few hundred rows and stops being survivable as the
-- directory grows: a haversine evaluated across every row of
-- agent_barbershop_leads already exceeded a 60s statement timeout while
-- building the local-standing panel, which is what surfaced this.
--
-- Callers (lib/account/local-standing.ts, lib/shop-ecosystem.ts) filter with a
-- bounding box first and only then compute true distance. That shape is exactly
-- what a btree can serve: a range scan on latitude, with longitude available in
-- the same index tuple so the second predicate is checked without touching the
-- heap.
--
-- PARTIAL, on latitude IS NOT NULL: 5-8% of rows have no coordinates, they can
-- never satisfy a BETWEEN (NULL comparisons aren't true), and excluding them
-- keeps the index smaller without changing a single result.
--
-- Plain CREATE INDEX rather than CONCURRENTLY — Supabase runs migrations inside
-- a transaction, which forbids CONCURRENTLY, and at these row counts the build
-- and its brief write lock are effectively instantaneous.
--
-- `events` is deliberately excluded: 4 rows, where the planner would correctly
-- ignore an index anyway and it would only add write overhead.

create index if not exists agent_barbershop_leads_lat_lng_idx
  on public.agent_barbershop_leads (latitude, longitude)
  where latitude is not null;

create index if not exists agent_salon_leads_lat_lng_idx
  on public.agent_salon_leads (latitude, longitude)
  where latitude is not null;

create index if not exists agent_barber_leads_lat_lng_idx
  on public.agent_barber_leads (latitude, longitude)
  where latitude is not null;

create index if not exists agent_cosmetologist_leads_lat_lng_idx
  on public.agent_cosmetologist_leads (latitude, longitude)
  where latitude is not null;

create index if not exists agent_barber_school_leads_lat_lng_idx
  on public.agent_barber_school_leads (latitude, longitude)
  where latitude is not null;

create index if not exists agent_cosmetology_school_leads_lat_lng_idx
  on public.agent_cosmetology_school_leads (latitude, longitude)
  where latitude is not null;

create index if not exists agent_barber_supply_store_leads_lat_lng_idx
  on public.agent_barber_supply_store_leads (latitude, longitude)
  where latitude is not null;

create index if not exists agent_beauty_supply_store_leads_lat_lng_idx
  on public.agent_beauty_supply_store_leads (latitude, longitude)
  where latitude is not null;
