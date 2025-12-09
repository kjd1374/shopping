-- 1. DROP ALL EXISTING POLICIES (Clean Slate)
DROP POLICY IF EXISTS "Users can view their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can create their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can delete their own requests" ON public.requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON public.requests;
DROP POLICY IF EXISTS "Admins can insert requests" ON public.requests;
DROP POLICY IF EXISTS "Admins can update requests" ON public.requests;
DROP POLICY IF EXISTS "Admins can delete requests" ON public.requests;

DROP POLICY IF EXISTS "Users can view their own request items" ON public.request_items;
DROP POLICY IF EXISTS "Users can create their own request items" ON public.request_items;
DROP POLICY IF EXISTS "Users can delete their own request items" ON public.request_items;
DROP POLICY IF EXISTS "Users can update their own request items" ON public.request_items;
DROP POLICY IF EXISTS "Admins can view all request items" ON public.request_items;
DROP POLICY IF EXISTS "Admins can insert request items" ON public.request_items;
DROP POLICY IF EXISTS "Admins can update request items" ON public.request_items;
DROP POLICY IF EXISTS "Admins can delete request items" ON public.request_items;

-- 2. ENABLE RLS
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_items ENABLE ROW LEVEL SECURITY;

-- 3. CREATE SIMPLE 'SELECT' POLICIES (Test Phase)
-- Users: View own
CREATE POLICY "Users can view their own requests"
ON public.requests FOR SELECT
USING ( auth.uid() = user_id );

CREATE POLICY "Users can view their own request items"
ON public.request_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.requests
    WHERE requests.id = request_items.request_id
    AND requests.user_id = auth.uid()
  )
);

-- Users: Insert own
CREATE POLICY "Users can create their own requests"
ON public.requests FOR INSERT
WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can create their own request items"
ON public.request_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.requests
    WHERE requests.id = request_items.request_id
    AND requests.user_id = auth.uid()
  )
);

-- Admins: View/Edit ALL (Using Profiles table)
CREATE POLICY "Admins can do everything on requests"
ON public.requests
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can do everything on request_items"
ON public.request_items
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
