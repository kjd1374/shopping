-- Drop the global unique constraint on origin_url
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_origin_url_key;

-- Optionally, add a composite unique constraint so the same product can exist in different rankings (product_types)
-- preventing duplicates only within the same ranking list
ALTER TABLE products ADD CONSTRAINT products_type_url_unique UNIQUE (product_type, origin_url);
