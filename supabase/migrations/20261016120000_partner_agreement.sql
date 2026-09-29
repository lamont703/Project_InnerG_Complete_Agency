-- The agency partner agreement (lib/partner-agreement.ts): which version each
-- agency accepted, when, under what name, and from where. Once the agreement
-- is final, approving an agency requires the current version to be accepted.

alter table public.agency_profiles
  add column if not exists agreement_version     text,
  add column if not exists agreement_accepted_at timestamptz,
  add column if not exists agreement_accepted_by text,
  add column if not exists agreement_accepted_ip text;
