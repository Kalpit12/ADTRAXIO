-- Adly Phase 8: Analytics & performance snapshots

create table public.analytics_daily (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  social_account_id uuid not null references public.social_accounts (id) on delete cascade,
  platform text not null check (platform in ('facebook', 'instagram')),
  metric_date date not null,
  followers bigint,
  following bigint,
  profile_views bigint,
  impressions bigint,
  reach bigint,
  engagement bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  clicks bigint,
  video_views bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, social_account_id, metric_date)
);

create table public.content_analytics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  social_account_id uuid not null references public.social_accounts (id) on delete cascade,
  scheduled_post_id uuid references public.scheduled_posts (id) on delete set null,
  platform_post_id text not null,
  platform text not null check (platform in ('facebook', 'instagram')),
  metric_date date not null,
  impressions bigint,
  reach bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  clicks bigint,
  video_views bigint,
  engagement_rate numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, platform_post_id, metric_date)
);

create index analytics_daily_organization_id_idx on public.analytics_daily (organization_id);
create index analytics_daily_social_account_id_idx on public.analytics_daily (social_account_id);
create index analytics_daily_metric_date_idx on public.analytics_daily (metric_date);
create index analytics_daily_platform_idx on public.analytics_daily (platform);

create index content_analytics_organization_id_idx on public.content_analytics (organization_id);
create index content_analytics_social_account_id_idx on public.content_analytics (social_account_id);
create index content_analytics_metric_date_idx on public.content_analytics (metric_date);
create index content_analytics_platform_idx on public.content_analytics (platform);
create index content_analytics_platform_post_id_idx on public.content_analytics (platform_post_id);

alter table public.analytics_daily enable row level security;
alter table public.content_analytics enable row level security;

create policy "Org members view analytics daily"
  on public.analytics_daily for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = analytics_daily.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy "Org members manage analytics daily"
  on public.analytics_daily for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = analytics_daily.organization_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = analytics_daily.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy "Org members view content analytics"
  on public.content_analytics for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = content_analytics.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy "Org members manage content analytics"
  on public.content_analytics for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = content_analytics.organization_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = content_analytics.organization_id
        and om.user_id = auth.uid()
    )
  );

create trigger analytics_daily_updated_at
  before update on public.analytics_daily
  for each row execute function public.set_updated_at();

create trigger content_analytics_updated_at
  before update on public.content_analytics
  for each row execute function public.set_updated_at();
