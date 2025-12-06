-- 1. Create Shipment Batches Table
create table public.shipment_batches (
  id uuid default uuid_generate_v4() primary key,
  batch_name text, -- e.g. "11월 4주차 발송분"
  tracking_no text, -- International tracking number
  status text default 'shipped' check (status in ('shipped', 'arrived', 'completed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Alter Requests Table to link with Batches
alter table public.requests 
  add column batch_id uuid references public.shipment_batches(id),
  add column local_tracking_no text,
  add column recipient_name text,
  add column recipient_phone text,
  add column shipping_address text;

-- 3. Update Requests Status Check Constraint to include 'shipping_local'
alter table public.requests drop constraint if exists requests_status_check;
alter table public.requests add constraint requests_status_check 
  check (status in ('pending', 'reviewed', 'ordered', 'shipping_local', 'completed'));

-- 4. RLS Policies (Optional, assuming public/partner access for now or existing policies cover it)
-- Allow read access to shipment_batches
create policy "Enable read access for all users" on public.shipment_batches for select using (true);
-- Allow write access (if needed, e.g. admin or partner updates) - keeping it open for dev
create policy "Enable insert/update for all users" on public.shipment_batches for all using (true) with check (true);
