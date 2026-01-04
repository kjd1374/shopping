-- Add admin_weight column to request_items table
ALTER TABLE request_items
ADD COLUMN admin_weight numeric NULL;

COMMENT ON COLUMN request_items.admin_weight IS 'Weight of the item in kg (Admin input)';
