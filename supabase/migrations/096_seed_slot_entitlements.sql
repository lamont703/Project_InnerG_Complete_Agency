-- ============================================================
-- Migration 096: Seed Project Slot Entitlements
-- Populates the database with existing project-specific and global features.
-- ============================================================

DO $$
DECLARE
    agency_id UUID := '00000000-0000-0000-0000-000000000001';
    bookstore_id UUID := (SELECT id FROM public.projects WHERE slug = 'kanes-bookstore');
    crypto_id UUID := (SELECT id FROM public.projects WHERE slug = 'only-crypto');
    all_projects RECORD;
BEGIN
    -- 1. Agency Global (innergcomplete) - Full Access
    -- Includes all marketing, pixel, and agency-level slots
    INSERT INTO public.project_slot_entitlements (project_id, slot_id)
    VALUES
        (agency_id, 'total_signups'),
        (agency_id, 'app_installs'),
        (agency_id, 'funnel_conversion'),
        (agency_id, 'social_reach'),
        (agency_id, 'pixel_total_pings'),
        (agency_id, 'pixel_unique_visitors'),
        (agency_id, 'pixel_identified_count'),
        (agency_id, 'active_architectures'),
        (agency_id, 'system_health'),
        (agency_id, 'agency_intelligence'),
        (agency_id, 'youtube_subscribers'),
        (agency_id, 'youtube_views'),
        (agency_id, 'youtube_video_count'),
        (agency_id, 'linkedin_followers'),
        (agency_id, 'linkedin_impressions'),
        (agency_id, 'linkedin_engagement'),
        (agency_id, 'linkedin_clicks'),
        (agency_id, 'linkedin_likes'),
        (agency_id, 'linkedin_comments'),
        (agency_id, 'linkedin_shares'),
        (agency_id, 'linkedin_post_views'),
        (agency_id, 'instagram_followers'),
        (agency_id, 'instagram_reach'),
        (agency_id, 'instagram_engagement'),
        (agency_id, 'facebook_page_likes'),
        (agency_id, 'facebook_reach'),
        (agency_id, 'tiktok_followers'),
        (agency_id, 'tiktok_views')
    ON CONFLICT (project_id, slot_id) DO NOTHING;

    -- 2. Kane's Bookstore - Marketing + Exclusive Bookstore Slots
    IF bookstore_id IS NOT NULL THEN
        INSERT INTO public.project_slot_entitlements (project_id, slot_id)
        VALUES
            (bookstore_id, 'total_signups'),
            (bookstore_id, 'app_installs'),
            (bookstore_id, 'funnel_conversion'),
            (bookstore_id, 'social_reach'),
            (bookstore_id, 'pixel_total_pings'),
            (bookstore_id, 'pixel_unique_visitors'),
            (bookstore_id, 'pixel_identified_count'),
            (bookstore_id, 'bookstore_inventory_value'),
            (bookstore_id, 'active_readers'),
            (bookstore_id, 'monthly_book_sales'),
            (bookstore_id, 'bookstore_total_orders'),
            (bookstore_id, 'bookstore_total_sales_value'),
            (bookstore_id, 'bookstore_avg_order_value')
        ON CONFLICT (project_id, slot_id) DO NOTHING;
    END IF;

    -- 3. Only-Crypto (and shared client nodes)
    IF crypto_id IS NOT NULL THEN
        INSERT INTO public.project_slot_entitlements (project_id, slot_id)
        VALUES
            (crypto_id, 'total_signups'),
            (crypto_id, 'app_installs'),
            (crypto_id, 'funnel_conversion'),
            (crypto_id, 'social_reach'),
            (crypto_id, 'pixel_total_pings'),
            (crypto_id, 'pixel_unique_visitors'),
            (crypto_id, 'pixel_identified_count'),
            (crypto_id, 'instagram_followers'),
            (crypto_id, 'instagram_reach'),
            (crypto_id, 'facebook_page_likes'),
            (crypto_id, 'youtube_views'),
            (crypto_id, 'tiktok_views')
        ON CONFLICT (project_id, slot_id) DO NOTHING;
    END IF;

    -- 4. Cleanup any stray entitlements for projects NOT in our explicit whitelist
    DELETE FROM public.project_slot_entitlements 
    WHERE project_id NOT IN (agency_id, COALESCE(bookstore_id, '00000000-0000-0000-0000-000000000000'), COALESCE(crypto_id, '00000000-0000-0000-0000-000000000000'));

END $$;
