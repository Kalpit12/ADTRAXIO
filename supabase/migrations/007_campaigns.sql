-- Adly Phase 9: Organic social campaigns (extends existing campaigns table)

alter table public.campaigns
  add column if not exists created_by uuid references auth.users (id) on delete set null,
  add column if not exists description text,
  add column if not exists objective text,
  add column if not exists start_date date,
  add column if not exists end_date date;

alter table public.campaigns drop constraint if exists campaigns_status_check;

alter table public.campaigns
  add constraint campaigns_status_check
  check (status in ('draft', 'active', 'completed', 'paused', 'archived'));

alter table public.campaigns drop constraint if exists campaigns_objective_check;

alter table public.campaigns
  add constraint campaigns_objective_check
  check (
    objective is null
    or objective in (
      'awareness',
      'engagement',
      'leads',
      'sales',
      'traffic',
      'app_installs',
      'growth'
    )
  );

create index if not exists campaigns_status_idx on public.campaigns (status);
create index if not exists campaigns_objective_idx on public.campaigns (objective);
create index if not exists campaigns_start_date_idx on public.campaigns (start_date);
create index if not exists campaigns_end_date_idx on public.campaigns (end_date);

create table public.campaign_content (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  content_id uuid not null references public.content (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (campaign_id, content_id)
);

create table public.campaign_accounts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  social_account_id uuid not null references public.social_accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (campaign_id, social_account_id)
);

create index campaign_content_campaign_id_idx on public.campaign_content (campaign_id);
create index campaign_content_content_id_idx on public.campaign_content (content_id);
create index campaign_accounts_campaign_id_idx on public.campaign_accounts (campaign_id);
create index campaign_accounts_social_account_id_idx on public.campaign_accounts (social_account_id);

alter table public.campaign_content enable row level security;
alter table public.campaign_accounts enable row level security;

create policy "Org members view campaign content"
  on public.campaign_content for select
  using (
    exists (
      select 1
      from public.campaigns c
      join public.organization_members om on om.organization_id = c.organization_id
      where c.id = campaign_content.campaign_id
        and om.user_id = auth.uid()
    )
  );

create policy "Org members manage campaign content"
  on public.campaign_content for all
  using (
    exists (
      select 1
      from public.campaigns c
      join public.organization_members om on om.organization_id = c.organization_id
      where c.id = campaign_content.campaign_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.campaigns c
      join public.organization_members om on om.organization_id = c.organization_id
      where c.id = campaign_content.campaign_id
        and om.user_id = auth.uid()
    )
  );

create policy "Org members view campaign accounts"
  on public.campaign_accounts for select
  using (
    exists (
      select 1
      from public.campaigns c
      join public.organization_members om on om.organization_id = c.organization_id
      where c.id = campaign_accounts.campaign_id
        and om.user_id = auth.uid()
    )
  );

create policy "Org members manage campaign accounts"
  on public.campaign_accounts for all
  using (
    exists (
      select 1
      from public.campaigns c
      join public.organization_members om on om.organization_id = c.organization_id
      where c.id = campaign_accounts.campaign_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.campaigns c
      join public.organization_members om on om.organization_id = c.organization_id
      where c.id = campaign_accounts.campaign_id
        and om.user_id = auth.uid()
    )
  );
