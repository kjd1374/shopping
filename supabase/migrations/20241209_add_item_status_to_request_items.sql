-- Add item_status and user_response columns to request_items table
ALTER TABLE public.request_items 
ADD COLUMN IF NOT EXISTS item_status text DEFAULT 'pending' CHECK (item_status IN ('pending', 'approved', 'rejected', 'needs_info')),
ADD COLUMN IF NOT EXISTS user_response text;

-- Optional: Drop is_buyable if it exists (commented out for safety, run manually if needed)
-- ALTER TABLE public.request_items DROP COLUMN IF EXISTS is_buyable;
