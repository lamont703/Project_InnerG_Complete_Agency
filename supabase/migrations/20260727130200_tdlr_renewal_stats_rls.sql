-- Lock down the TDLR raw lake (it holds owner PII) and expose only a safe,
-- aggregate-only function for public pages to read renewal counts from.

-- 1) Enable RLS with no policies → anon/authenticated cannot read raw rows.
--    (service_role and the postgres owner bypass RLS, so ingestion/admin still work.)
alter table public.tdlr_licensees_raw enable row level security;

-- 2) Aggregate-only accessor. SECURITY DEFINER so it can read the table under
--    RLS, but it returns only counts — never any row/PII.
create or replace function public.tdlr_renewal_stats(p_types text[])
returns table(total_licensed bigint, renewals_due_90d bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint as total_licensed,
    count(*) filter (
      where license_expiration_date_mmddccyy ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
        and to_date(license_expiration_date_mmddccyy, 'MM/DD/YYYY') between current_date and current_date + 90
    )::bigint as renewals_due_90d
  from public.tdlr_licensees_raw
  where source_dataset = '7358-krk7' and license_type = any(p_types);
$$;

grant execute on function public.tdlr_renewal_stats(text[]) to anon, authenticated, service_role;
