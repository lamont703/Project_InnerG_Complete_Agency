-- Add shop_phone column to shop_day_invites table
ALTER TABLE shop_day_invites ADD COLUMN IF NOT EXISTS shop_phone text;
