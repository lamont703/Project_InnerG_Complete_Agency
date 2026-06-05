-- Add shop_name and notes columns to shop_day_invites table
ALTER TABLE shop_day_invites ADD COLUMN IF NOT EXISTS shop_name text;
ALTER TABLE shop_day_invites ADD COLUMN IF NOT EXISTS notes text;

-- Make shop_id nullable since we might not have a confirmed shop_id yet from the public directory
ALTER TABLE shop_day_invites ALTER COLUMN shop_id DROP NOT NULL;
