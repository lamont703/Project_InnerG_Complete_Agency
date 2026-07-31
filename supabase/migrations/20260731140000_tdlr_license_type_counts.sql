-- Aggregate license counts by type, for the citable statistics block on /texas.
--
-- Same posture as tdlr_renewal_stats: the raw lake holds owner PII and stays
-- RLS-locked with no policies, and public pages read only through a
-- SECURITY DEFINER function that can return nothing but counts. Adding a
-- read policy to the table instead would expose 432k rows of names and phone
-- numbers to anyone with the anon key.
--
-- The snapshot date is exposed alongside, because a statistic a publisher might
-- cite is worthless — and misleading — without the date it was true.

create or replace function public.tdlr_license_type_counts()
returns table(license_type text, total bigint, expiring_90d bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    license_type::text,
    count(*)::bigint as total,
    count(*) filter (
      where license_expiration_date_mmddccyy ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
        and to_date(license_expiration_date_mmddccyy, 'MM/DD/YYYY')
            between current_date and current_date + 90
    )::bigint as expiring_90d
  from public.tdlr_licensees_raw
  where source_dataset = '7358-krk7'
    and license_type is not null
  group by license_type
  order by count(*) desc;
$$;

create or replace function public.tdlr_snapshot_date()
returns date
language sql
stable
security definer
set search_path = public
as $$
  select max(snapshot_date) from public.tdlr_licensees_raw where source_dataset = '7358-krk7';
$$;

-- Explicit rather than inherited: Postgres grants EXECUTE to PUBLIC by default,
-- and on a SECURITY DEFINER function that default is how a lock-down quietly
-- becomes an open door. Revoke first, then grant deliberately.
revoke execute on function public.tdlr_license_type_counts() from public;
revoke execute on function public.tdlr_snapshot_date() from public;
grant execute on function public.tdlr_license_type_counts() to anon, authenticated, service_role;
grant execute on function public.tdlr_snapshot_date() to anon, authenticated, service_role;
