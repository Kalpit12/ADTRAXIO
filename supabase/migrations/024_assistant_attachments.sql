-- Phase 17: Assistant message attachments

alter table public.ai_messages
  add column if not exists attachments jsonb;

create index if not exists ai_messages_attachments_idx
  on public.ai_messages using gin (attachments);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assistant-attachments',
  'assistant-attachments',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Org members upload assistant attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'assistant-attachments'
    and (storage.foldername(name))[1] in (
      select om.organization_id::text
      from public.organization_members om
      where om.user_id = auth.uid()
    )
  );

create policy "Org members update assistant attachments"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'assistant-attachments'
    and (storage.foldername(name))[1] in (
      select om.organization_id::text
      from public.organization_members om
      where om.user_id = auth.uid()
    )
  );

create policy "Org members delete assistant attachments"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'assistant-attachments'
    and (storage.foldername(name))[1] in (
      select om.organization_id::text
      from public.organization_members om
      where om.user_id = auth.uid()
    )
  );

create policy "Public read assistant attachments"
  on storage.objects for select
  to public
  using (bucket_id = 'assistant-attachments');
