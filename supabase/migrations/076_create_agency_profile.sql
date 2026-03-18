-- Migration 076: Create Agency Profile Settings Table
-- Inner G Complete Agency — Client Intelligence Portal

CREATE TABLE IF NOT EXISTS public.agency_profile (
  id                  UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000',
  name                TEXT NOT NULL DEFAULT 'Inner G Complete',
  description         TEXT DEFAULT 'Full-service growth agency specializing in digital transformation and brand acceleration.',
  support_email       TEXT DEFAULT 'support@innergcomplete.com',
  primary_domain      TEXT,
  settings            JSONB DEFAULT '{}'::jsonb,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed with initial data if not exists
INSERT INTO public.agency_profile (id, name, description, support_email)
VALUES (
    '00000000-0000-0000-0000-000000000000', 
    'Inner G Complete', 
    'Full-service growth agency specializing in digital transformation and brand acceleration.', 
    'support@innergcomplete.com'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    support_email = EXCLUDED.support_email;

-- Enable RLS
ALTER TABLE public.agency_profile ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Super admins can manage agency profile" ON public.agency_profile;
CREATE POLICY "Super admins can manage agency profile"
  ON public.agency_profile FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Anyone can view agency profile" ON public.agency_profile;
CREATE POLICY "Anyone can view agency profile"
  ON public.agency_profile FOR SELECT
  TO authenticated
  USING (true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS agency_profile_updated_at ON public.agency_profile;
CREATE TRIGGER agency_profile_updated_at
  BEFORE UPDATE ON public.agency_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
