-- Materialise the TDLR license-type aggregate.
--
-- Computing it live times out: 432k rows, each needing a regex test and a
-- to_date() before the 90-day window can be applied. That's fine as a one-off
-- and unacceptable on a public page that wants to be cited — a statistic nobody
-- can load is not a citation, it's an outage.
--
-- The view carries only counts and the snapshot date. No licence numbers, no
-- names, no phone numbers — so it can be read directly by the anon role without
-- reopening the PII the raw lake is locked down to protect.

drop function if exists public.tdlr_license_type_counts();
drop function if exists public.tdlr_snapshot_date();

create materialized view if not exists public.tdlr_license_type_summary as
  select
    license_type::text as license_type,
    count(*)::bigint as total,
    count(*) filter (
      where license_expiration_date_mmddccyy ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
        and to_date(license_expiration_date_mmddccyy, 'MM/DD/YYYY')
            between current_date and current_date + 90
    )::bigint as expiring_90d,
    max(snapshot_date) as snapshot_date
  from public.tdlr_licensees_raw
  where source_dataset = '7358-krk7'
    and license_type is not null
  group by license_type;

create unique index if not exists idx_tdlr_license_type_summary_type
  on public.tdlr_license_type_summary (license_type);

-- Aggregates only; safe to read directly.
grant select on public.tdlr_license_type_summary to anon, authenticated, service_role;

-- Refresh after each ingest. CONCURRENTLY needs the unique index above and
-- keeps the view readable while it rebuilds, so a page load during a refresh
-- doesn't blank out.
create or replace function public.refresh_tdlr_license_summary()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.tdlr_license_type_summary;
end;
$$;

revoke execute on function public.refresh_tdlr_license_summary() from public;
grant execute on function public.refresh_tdlr_license_summary() to service_role;
