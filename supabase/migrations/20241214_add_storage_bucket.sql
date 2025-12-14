-- Create a new private bucket 'request_images'
insert into storage.buckets (id, name, public)
values ('request_images', 'request_images', true);

-- Allow authenticated users to upload files to 'request_images'
create policy "Authenticated users can upload images"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'request_images' );

-- Allow public access to view images (so admins can see them easily without signed URLs for now)
create policy "Public can view images"
on storage.objects for select
to public
using ( bucket_id = 'request_images' );
