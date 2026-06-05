-- Add professional details columns to shop_day_invites table
ALTER TABLE shop_day_invites ADD COLUMN IF NOT EXISTS professionals_name text;
ALTER TABLE shop_day_invites ADD COLUMN IF NOT EXISTS professionals_phone_number text;
ALTER TABLE shop_day_invites ADD COLUMN IF NOT EXISTS professionals_address text;
