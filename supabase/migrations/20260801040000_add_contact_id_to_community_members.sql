-- Link a community member to their GoHighLevel contact.
--
-- Every entity table already carries contact_id from scripts/sync_entities_to_ghl.js,
-- but community_members did not — so the people who actually signed up were the
-- one group missing from the CRM, and there was no way to follow up with them.
--
-- Deliberately NOT unique. The entity tables index this uniquely, and the sync
-- script has to swallow a 23505 whenever two rows share a phone and collapse
-- into a single GHL contact. Here that case is ordinary rather than exceptional
-- — two members at one shop phone, a couple sharing a mobile — and a member is
-- not worth failing over a CRM id. A null means "not synced yet", which the
-- backfill script reads as its work queue.

ALTER TABLE public.community_members
    ADD COLUMN IF NOT EXISTS contact_id text,
    ADD COLUMN IF NOT EXISTS contact_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS community_members_contact_id_idx
    ON public.community_members (contact_id)
    WHERE contact_id IS NOT NULL;

COMMENT ON COLUMN public.community_members.contact_id IS
    'GoHighLevel contact id. Null means the member has not reached the CRM yet — see scripts/sync_members_to_ghl.js.';
COMMENT ON COLUMN public.community_members.contact_synced_at IS
    'When the member was last pushed to GoHighLevel.';
