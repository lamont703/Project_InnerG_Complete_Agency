-- Add formatted_address and owner_name columns to shop_day_invites table
ALTER TABLE shop_day_invites ADD COLUMN IF NOT EXISTS formatted_address text;
ALTER TABLE shop_day_invites ADD COLUMN IF NOT EXISTS owner_name text;
