-- Add admin_options column to request_items table
ALTER TABLE request_items ADD COLUMN admin_options JSONB DEFAULT '[]'::jsonb;

-- Comment on column
COMMENT ON COLUMN request_items.admin_options IS 'Array of {name: string, price: number} for option-specific pricing';
