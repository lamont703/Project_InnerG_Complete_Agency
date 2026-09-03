-- THE PARTIAL INDEX COULD NOT BE AN ON CONFLICT TARGET.
--
-- 20260902101500 created the uniqueness as a PARTIAL index
-- (`where source_ref is not null`). That is a correct constraint and a useless
-- conflict target: Postgres will only use a partial index for ON CONFLICT if the
-- statement carries a matching WHERE predicate, and supabase-js `upsert()` emits
-- `on conflict (source, source_ref)` with no predicate. The upsert fails with
-- "no unique or exclusion constraint matching the ON CONFLICT specification" —
-- at runtime, on the first insert, not at migration time.
--
-- A PLAIN UNIQUE INDEX IS EQUIVALENT HERE. NULLs compare as distinct in a unique
-- index, so rows with a null source_ref are still unconstrained against each
-- other — exactly what the partial predicate was written to express — while the
-- index becomes usable as a conflict target.
drop index if exists public.broll_assets_source_ref_idx;

create unique index if not exists broll_assets_source_ref_idx
  on public.broll_assets (source, source_ref);
