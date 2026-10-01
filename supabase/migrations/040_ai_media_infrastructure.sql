-- Phase 21.1: AI media generation jobs, assets, and usage (infrastructure only)

create table if not exists public.ai_media_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete cascade,
  created_by uuid not null,
  provider text not null
    check (provider in ('openai', 'google', 'elevenlabs')),
  media_type text not null
    check (media_type in ('image', 'video', 'audio')),
  status text not null default 'queued'
    check (
      status in ('queued', 'processing', 'completed', 'failed', 'cancelled')
    ),
  idempotency_key text,
  prompt text not null default '',
  input_metadata jsonb not null default '{}'::jsonb,
  output_storage_path text,
  media_asset_id uuid,
  error_category text,
  error_message text,
  provider_job_id text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create index if not exists ai_media_generation_jobs_org_idx
  on public.ai_media_generation_jobs (organization_id);

create index if not exists ai_media_generation_jobs_workspace_idx
  on public.ai_media_generation_jobs (client_workspace_id);

create index if not exists ai_media_generation_jobs_status_idx
  on public.ai_media_generation_jobs (status);

create index if not exists ai_media_generation_jobs_created_idx
  on public.ai_media_generation_jobs (created_at desc);

create table if not exists public.ai_media_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete cascade,
  created_by uuid not null,
  media_type text not null
    check (media_type in ('image', 'video', 'audio')),
  storage_bucket text not null default 'generated-media',
  storage_path text not null,
  mime_type text,
  width integer,
  height integer,
  duration_seconds numeric,
  file_size_bytes bigint,
  provider text not null
    check (provider in ('openai', 'google', 'elevenlabs')),
  generation_job_id uuid references public.ai_media_generation_jobs (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ai_media_assets_org_idx
  on public.ai_media_assets (organization_id);

create index if not exists ai_media_assets_workspace_idx
  on public.ai_media_assets (client_workspace_id);

create index if not exists ai_media_assets_job_idx
  on public.ai_media_assets (generation_job_id);

alter table public.ai_media_generation_jobs
  add constraint ai_media_generation_jobs_asset_fk
  foreign key (media_asset_id) references public.ai_media_assets (id) on delete set null;

create table if not exists public.ai_media_usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete cascade,
  user_id uuid not null,
  generation_job_id uuid references public.ai_media_generation_jobs (id) on delete set null,
  provider text not null
    check (provider in ('openai', 'google', 'elevenlabs')),
  media_type text not null
    check (media_type in ('image', 'video', 'audio')),
  model text,
  units jsonb not null default '{}'::jsonb,
  estimated_cost_usd numeric,
  created_at timestamptz not null default now()
);

create index if not exists ai_media_usage_events_org_idx
  on public.ai_media_usage_events (organization_id);

create index if not exists ai_media_usage_events_job_idx
  on public.ai_media_usage_events (generation_job_id);

alter table public.ai_media_generation_jobs enable row level security;
alter table public.ai_media_assets enable row level security;
alter table public.ai_media_usage_events enable row level security;

create policy "Org members view media generation jobs"
  on public.ai_media_generation_jobs for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_media_generation_jobs.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_media_generation_jobs.client_workspace_id is null
      or public.user_can_access_client_workspace(
        ai_media_generation_jobs.client_workspace_id,
        auth.uid()
      )
    )
  );

create policy "Org members insert media generation jobs"
  on public.ai_media_generation_jobs for insert
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_media_generation_jobs.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_media_generation_jobs.client_workspace_id is null
      or public.user_can_access_client_workspace(
        ai_media_generation_jobs.client_workspace_id,
        auth.uid()
      )
    )
    and ai_media_generation_jobs.created_by = auth.uid()
  );

create policy "Org members update media generation jobs"
  on public.ai_media_generation_jobs for update
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_media_generation_jobs.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_media_generation_jobs.client_workspace_id is null
      or public.user_can_access_client_workspace(
        ai_media_generation_jobs.client_workspace_id,
        auth.uid()
      )
    )
  );

create policy "Org members view media assets"
  on public.ai_media_assets for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_media_assets.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_media_assets.client_workspace_id is null
      or public.user_can_access_client_workspace(
        ai_media_assets.client_workspace_id,
        auth.uid()
      )
    )
  );

create policy "Org members insert media assets"
  on public.ai_media_assets for insert
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_media_assets.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_media_assets.client_workspace_id is null
      or public.user_can_access_client_workspace(
        ai_media_assets.client_workspace_id,
        auth.uid()
      )
    )
    and ai_media_assets.created_by = auth.uid()
  );

create policy "Org members view media usage events"
  on public.ai_media_usage_events for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_media_usage_events.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_media_usage_events.client_workspace_id is null
      or public.user_can_access_client_workspace(
        ai_media_usage_events.client_workspace_id,
        auth.uid()
      )
    )
  );

create policy "Org members insert media usage events"
  on public.ai_media_usage_events for insert
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_media_usage_events.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_media_usage_events.client_workspace_id is null
      or public.user_can_access_client_workspace(
        ai_media_usage_events.client_workspace_id,
        auth.uid()
      )
    )
    and ai_media_usage_events.user_id = auth.uid()
  );

-- Private generated media bucket (no public read)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'generated-media',
  'generated-media',
  false,
  104857600,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'video/mp4',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Org members read generated media"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'generated-media'
    and (storage.foldername(name))[1] = 'generated'
    and (storage.foldername(name))[2] in (
      select om.organization_id::text
      from public.organization_members om
      where om.user_id = auth.uid()
    )
  );

create policy "Org members upload generated media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'generated-media'
    and (storage.foldername(name))[1] = 'generated'
    and (storage.foldername(name))[2] in (
      select om.organization_id::text
      from public.organization_members om
      where om.user_id = auth.uid()
    )
  );

create policy "Org members update generated media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'generated-media'
    and (storage.foldername(name))[1] = 'generated'
    and (storage.foldername(name))[2] in (
      select om.organization_id::text
      from public.organization_members om
      where om.user_id = auth.uid()
    )
  );

create policy "Org members delete generated media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'generated-media'
    and (storage.foldername(name))[1] = 'generated'
    and (storage.foldername(name))[2] in (
      select om.organization_id::text
      from public.organization_members om
      where om.user_id = auth.uid()
    )
  );
