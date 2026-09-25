-- Adly dashboard: campaigns and content (minimum schema for Phase 4)

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'completed')),
  spend numeric(12, 2) default 0,
  results_summary text,
  roas numeric(8, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text,
  platform text not null,
  content_type text not null default 'post',
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'published', 'failed')),
  thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index campaigns_organization_id_idx on public.campaigns (organization_id);
create index content_posts_organization_id_idx on public.content_posts (organization_id);

alter table public.campaigns enable row level security;
alter table public.content_posts enable row level security;

create policy "Org members view campaigns"
  on public.campaigns for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = campaigns.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy "Org members manage campaigns"
  on public.campaigns for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = campaigns.organization_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = campaigns.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy "Org members view content"
  on public.content_posts for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = content_posts.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy "Org members manage content"
  on public.content_posts for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = content_posts.organization_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = content_posts.organization_id
        and om.user_id = auth.uid()
    )
  );

create trigger campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

create trigger content_posts_updated_at
  before update on public.content_posts
  for each row execute function public.set_updated_at();
