-- Lightweight interest capture for the cosmetology practice deck's
-- "AI Enhanced Prep" CTA — deliberately NOT wired into the barber
-- registration/deployment pipeline (barber_registrations -> clients ->
-- projects -> project_slot_entitlements), since that pipeline hardcodes
-- industry='barbering', a barber-only deploymentBlueprint, and a fixed
-- set of barber-specific diagnostic slots (barber_shaving_mastery, etc.)
-- with no cosmetology equivalent built yet. Routing a cosmetology
-- registrant through that flow would silently mislabel them as a barber
-- student — the exact mismatch this whole feature exists to fix. A real
-- cosmetology-aware dashboard/blueprint is a separate, larger build; this
-- table just captures genuine interest until that exists.
CREATE TABLE IF NOT EXISTS cosmetology_prep_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    first_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE cosmetology_prep_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can join the waitlist"
ON cosmetology_prep_waitlist FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Super Admins can view the waitlist"
ON cosmetology_prep_waitlist FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'super_admin'
    )
);
