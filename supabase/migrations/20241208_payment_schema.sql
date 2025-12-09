-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id TEXT NOT NULL, -- PortOne payment ID (imp_uid)
    merchant_uid TEXT NOT NULL, -- Order ID (merchant_uid)
    amount INTEGER NOT NULL,
    status TEXT NOT NULL, -- paid, ready, failed, cancelled
    user_id UUID REFERENCES auth.users(id),
    request_id UUID REFERENCES public.requests(id),
    pg_provider TEXT,
    pay_method TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_payments_merchant_uid ON public.payments(merchant_uid);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_request_id ON public.payments(request_id);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own payments"
    ON public.payments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
    ON public.payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Add shipping address and tracking info to requests table
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS shipping_address JSONB,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'; -- unpaid, paid, refund_pending, refunded

-- Comment on columns
COMMENT ON COLUMN public.requests.shipping_address IS 'Stores name, phone, address, zipcode';
