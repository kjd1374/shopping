-- Update requests table for 70/30 split payment
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS deposit_amount INTEGER,
ADD COLUMN IF NOT EXISTS final_amount INTEGER,
DROP COLUMN IF EXISTS payment_status;

ALTER TABLE public.requests
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'; 
-- status values: unpaid, deposit_pending, deposit_paid, final_pending, paid

COMMENT ON COLUMN public.requests.deposit_amount IS '70% deposit amount';
COMMENT ON COLUMN public.requests.final_amount IS '30% final payment amount';
