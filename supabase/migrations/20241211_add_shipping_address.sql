-- Add shipping_address column to requests table
ALTER TABLE requests ADD COLUMN IF NOT EXISTS shipping_address jsonb;
