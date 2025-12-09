-- WARNING: This will delete ALL data in requests and request_items
TRUNCATE TABLE public.request_items CASCADE;
TRUNCATE TABLE public.requests CASCADE;

-- If you want to reset the ID sequence (if serial, currently uuid so not needed)
-- But for good measure for related tables if any (none yet for batches linked?)
-- shipment_batches does not have data likely, but if so:
TRUNCATE TABLE public.shipment_batches CASCADE;
