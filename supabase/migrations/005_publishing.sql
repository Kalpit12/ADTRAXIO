-- Adly Phase 7: Publishing & scheduling

create table public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  content_id uuid references public.content (id) on delete set null,
  social_account_id uuid not null references public.social_accounts (id) on delete cascade,
  platform text not null check (platform in ('facebook', 'instagram')),
  scheduled_for timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  caption text,
  media_type text check (media_type is null or media_type in ('image', 'video')),
  media_url text,
  platform_post_id text,
  error_code text,
  error_message text,
  published_at timestamptz,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scheduled_posts_organization_id_idx on public.scheduled_posts (organization_id);
create index scheduled_posts_social_account_id_idx on public.scheduled_posts (social_account_id);
create index scheduled_posts_status_idx on public.scheduled_posts (status);
create index scheduled_posts_scheduled_for_idx on public.scheduled_posts (scheduled_for);
create index scheduled_posts_status_scheduled_for_idx
  on public.scheduled_posts (status, scheduled_for)
  where status = 'scheduled';

alter table public.scheduled_posts enable row level security;

create policy "Org members view scheduled posts"
  on public.scheduled_posts for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = scheduled_posts.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy "Org members manage scheduled posts"
  on public.scheduled_posts for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = scheduled_posts.organization_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = scheduled_posts.organization_id
        and om.user_id = auth.uid()
    )
  );

create trigger scheduled_posts_updated_at
  before update on public.scheduled_posts
  for each row execute function public.set_updated_at();

-- Supabase Storage: publishing media (public read for Meta API access)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-media',
  'content-media',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Org members upload content media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'content-media'
    and (storage.foldername(name))[1] in (
      select om.organization_id::text
      from public.organization_members om
      where om.user_id = auth.uid()
    )
  );

create policy "Org members update own content media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'content-media'
    and (storage.foldername(name))[1] in (
      select om.organization_id::text
      from public.organization_members om
      where om.user_id = auth.uid()
    )
  );

create policy "Org members delete own content media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'content-media'
    and (storage.foldername(name))[1] in (
      select om.organization_id::text
      from public.organization_members om
      where om.user_id = auth.uid()
    )
  );

create policy "Public read content media"
  on storage.objects for select
  to public
  using (bucket_id = 'content-media');
