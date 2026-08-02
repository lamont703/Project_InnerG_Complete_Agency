-- Covering index for mcp_tdlr_license_counts.
--
-- That function groups all 433k licensee rows by licence type and, when a date
-- is supplied, parses the expiration string for each. Unindexed that is a full
-- heap scan: measured at 12.9s cold, which is a poor first call for an agent
-- and uncomfortably close to the endpoint's 60s ceiling.
--
-- Both columns are in the index so the aggregate can be answered index-only,
-- without touching the heap at all. license_type leads because it is the GROUP
-- BY key and the only equality filter the function accepts.
create index if not exists tdlr_licensees_raw_type_expiry_idx
  on public.tdlr_licensees_raw (license_type, license_expiration_date_mmddccyy);
