-- 1. Check existing policies
-- SELECT * FROM pg_policies WHERE tablename IN ('requests', 'request_items');

-- 2. Drop existing restrictive policies to start fresh/clean
DROP POLICY IF EXISTS "Enable read access for users" ON public.requests;
DROP POLICY IF EXISTS "Enable read access for users" ON public.request_items;
DROP POLICY IF EXISTS "Users can view own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can view own request items" ON public.request_items;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.requests;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.request_items;

-- Drop any potential admin policies if they exist lightly
DROP POLICY IF EXISTS "Admins can do everything" ON public.requests;
DROP POLICY IF EXISTS "Admins can do everything" ON public.request_items;
DROP POLICY IF EXISTS "Users can insert own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can insert own request items" ON public.request_items;
DROP POLICY IF EXISTS "Users can delete own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can delete own request items" ON public.request_items;
DROP POLICY IF EXISTS "Admins can all requests" ON public.requests;
DROP POLICY IF EXISTS "Admins can all request items" ON public.request_items;
DROP POLICY IF EXISTS "Users can update own request items" ON public.request_items;

-- 3. Re-enable RLS
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_items ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Users can VIEW their own requests (AND Admins can view all)
CREATE POLICY "Users can view own requests" 
ON public.requests FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 5. Policy: Users can VIEW their own request items (AND Admins can view all)
CREATE POLICY "Users can view own request items" 
ON public.request_items FOR SELECT 
USING (
  request_id IN (SELECT id FROM public.requests WHERE user_id = auth.uid())
  OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 6. Policy: Admins can UPDATE/INSERT/DELETE requests
CREATE POLICY "Admins can all requests" 
ON public.requests FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 7. Policy: Admins can UPDATE/INSERT/DELETE request items
CREATE POLICY "Admins can all request items" 
ON public.request_items FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 8. Policy: Users can INSERT their own requests (needed for creation)
CREATE POLICY "Users can insert own requests" 
ON public.requests FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own request items" 
ON public.request_items FOR INSERT 
WITH CHECK (
    request_id IN (SELECT id FROM public.requests WHERE user_id = auth.uid())
);

-- 9. Policy: Users can DELETE own requests (optional, but good for cleanup if needed)
CREATE POLICY "Users can delete own requests" 
ON public.requests FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own request items" 
ON public.request_items FOR DELETE 
USING (
    request_id IN (SELECT id FROM public.requests WHERE user_id = auth.uid())
);

-- 10. Update User Policies for Request Items to include UPDATE (for user_response)
-- Users need to update 'user_response'
CREATE POLICY "Users can update own request items" 
ON public.request_items FOR UPDATE
USING (
    request_id IN (SELECT id FROM public.requests WHERE user_id = auth.uid())
);
