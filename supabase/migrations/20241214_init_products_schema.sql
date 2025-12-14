-- 1. Create the products table if it doesn't exist
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rank INTEGER,
    title TEXT,
    brand TEXT,
    image TEXT,
    origin_url TEXT,
    product_type TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Drop the old strict constraint if it exists (allows global duplicate URLs)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_origin_url_key;

-- 3. Add the new composite constraint (allows same URL in different product_types)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_type_url_unique;
ALTER TABLE products ADD CONSTRAINT products_type_url_unique UNIQUE (product_type, origin_url);

-- 4. Enable RLS (Row Level Security) just in case
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 5. Allow public read access
CREATE POLICY "Allow public read access" ON products FOR SELECT USING (true);

-- 6. Allow service role (backend) to insert/update/delete
CREATE POLICY "Allow service role full access" ON products USING (true) WITH CHECK (true);
