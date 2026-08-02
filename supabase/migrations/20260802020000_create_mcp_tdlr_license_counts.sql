-- Licensee counts for the MCP server's texas_licensee_counts tool.
--
-- Exists as an RPC rather than a client-side query for one reason: the
-- expiration date is stored as TEXT in mm/dd/ccyy, so any "expiring before X"
-- filter has to parse 433k strings. Doing that from the app timed out at 60s
-- while this work was being built. Pushing it into SQL keeps the parse next to
-- the data and returns two integers instead of a result set.
--
-- Deliberately does NOT break down by county. That version is what actually
-- blew the timeout, and it needs a stored/generated expiration column before it
-- can be served — see the note in the MCP tool description.
--
-- SECURITY: tdlr_licensees_raw is RLS-locked and holds the full public record
-- including owner_telephone. This function is SECURITY DEFINER so it can read
-- that table, and therefore returns ONLY aggregate counts — never a row, a
-- name, or a phone number. Do not extend it to return records.
create or replace function mcp_tdlr_license_counts(
  p_license_type text default null,
  p_expiring_before date default null
)
returns table (license_type text, total bigint, expiring bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.license_type,
    count(*) as total,
    count(*) filter (
      where p_expiring_before is not null
        -- Guard the regex before to_date: a malformed value would raise and
        -- take down the whole aggregate rather than being skipped.
        and l.license_expiration_date_mmddccyy ~ '^\d{2}/\d{2}/\d{4}$'
        and to_date(l.license_expiration_date_mmddccyy, 'MM/DD/YYYY') < p_expiring_before
    ) as expiring
  from tdlr_licensees_raw l
  where l.license_type is not null
    and (p_license_type is null or l.license_type = p_license_type)
  group by l.license_type
  order by count(*) desc
  limit 40;
$$;

-- Public read: this is aggregate data from a public record, and the MCP
-- endpoint is unauthenticated by design.
grant execute on function mcp_tdlr_license_counts(text, date) to anon, authenticated;
