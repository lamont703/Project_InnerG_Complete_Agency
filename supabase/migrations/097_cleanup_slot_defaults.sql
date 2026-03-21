-- ============================================================
-- Migration 097: Final Entitlement Cleanup
-- Strips all feature defaults from non-primary projects.
-- Ensures only Agency, Bookstore, and Crypto start with active ports.
-- ============================================================

DO $$
DECLARE
    agency_id UUID := '00000000-0000-0000-0000-000000000001';
    bookstore_id UUID := (SELECT id FROM public.projects WHERE slug = 'kanes-bookstore');
    crypto_id UUID := (SELECT id FROM public.projects WHERE slug = 'only-crypto');
BEGIN
    -- Cleanup any stray entitlements for projects NOT in our explicit whitelist
    DELETE FROM public.project_slot_entitlements 
    WHERE project_id NOT IN (
        agency_id, 
        COALESCE(bookstore_id, '00000000-0000-0000-0000-000000000000'), 
        COALESCE(crypto_id, '00000000-0000-0000-0000-000000000000')
    );
END $$;
