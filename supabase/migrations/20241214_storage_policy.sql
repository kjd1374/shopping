-- Enable storage by creating the bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('request_images', 'request_images', true)
on conflict (id) do nothing;

-- Policy to allow public read access
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'request_images' );

-- Policy to allow authenticated uploads
create policy "Authenticated Uploads"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'request_images' );

-- Policy to allow anonymous uploads (if needed, but prefer authenticated)
-- for now, enabling for public to prevent errors if user is not fully logged in during guest request scenarios
create policy "Public Uploads"
  on storage.objects for insert
  to public
  with check ( bucket_id = 'request_images' );
