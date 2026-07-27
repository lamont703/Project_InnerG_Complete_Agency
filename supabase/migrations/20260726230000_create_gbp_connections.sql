-- Per-member Google Business Profile connection: stores the OAuth tokens, the
-- fetched GBP locations, the selected/matched location, and the directory entity
-- it links to. One connection per community member (mirrors the one-listing
-- claim model). Service-role only — tokens never leave the server.
CREATE TABLE IF NOT EXISTS public.gbp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_member_id uuid NOT NULL UNIQUE REFERENCES public.community_members(id) ON DELETE CASCADE,
  google_account_email text,
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  scope text,
  locations jsonb NOT NULL DEFAULT '[]',   -- raw fetched GBP locations (name/title/address/placeId/…)
  selected_location text,                  -- GBP resource name (locations/{id}) once chosen
  place_id text,
  entity_type text,                        -- linked directory entity (phase 2: matcher)
  entity_id uuid,
  status text NOT NULL DEFAULT 'connected',-- connected | needs_selection | linked | error | revoked
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gbp_connections_member_idx ON public.gbp_connections (community_member_id);

ALTER TABLE public.gbp_connections ENABLE ROW LEVEL SECURITY;
-- No policies → only the service-role key (server-side admin client) can touch it.
