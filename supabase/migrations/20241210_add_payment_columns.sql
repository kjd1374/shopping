-- Add missing columns for payment flow
ALTER TABLE public.requests
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS deposit_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_amount numeric DEFAULT 0;

-- Optional: Comment on columns
COMMENT ON COLUMN public.requests.payment_status IS 'unpaid | deposit_pending | deposit_paid | final_pending | paid';
