-- Admin Policy Migration
-- Allow admins to view all profiles
create policy "Admins can view all profiles"
  on public.profiles
  for select
  using (
    auth.uid() in (
      select id from public.profiles where role = 'admin'
    )
  );

-- Allow admins to update any profile (e.g., to promote users)
create policy "Admins can update any profile"
  on public.profiles
  for update
  using (
    auth.uid() in (
      select id from public.profiles where role = 'admin'
    )
  );
