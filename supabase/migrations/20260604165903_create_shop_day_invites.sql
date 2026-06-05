-- Create shop_day_invites table
CREATE TABLE shop_day_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id text NOT NULL,
  professional_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invite_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS if you want (optional, depends on your setup)
ALTER TABLE shop_day_invites ENABLE ROW LEVEL SECURITY;

-- Allow public access for now (or configure policies as needed)
CREATE POLICY "Enable all access" ON shop_day_invites FOR ALL USING (true) WITH CHECK (true);
