-- Adly Content Studio: AI-generated creative drafts (Phase 5)

create table public.content (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  content_type text not null,
  platform text not null,
  goal text not null,
  audience text,
  tone text not null,
  topic text not null,
  additional_context text,
  cta text,
  hook text,
  headline text,
  primary_copy text,
  caption text,
  hashtags text[] default '{}',
  creative_direction text,
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index content_organization_id_idx on public.content (organization_id);
create index content_user_id_idx on public.content (user_id);
create index content_updated_at_idx on public.content (updated_at desc);
create index content_status_idx on public.content (status);

alter table public.content enable row level security;

create policy "Org members view content studio"
  on public.content for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = content.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy "Org members manage content studio"
  on public.content for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = content.organization_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = content.organization_id
        and om.user_id = auth.uid()
    )
  );

create trigger content_studio_updated_at
  before update on public.content
  for each row execute function public.set_updated_at();
