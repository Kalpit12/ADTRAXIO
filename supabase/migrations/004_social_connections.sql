-- Adly Phase 6: Social account connections

create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null
    check (platform in ('instagram', 'facebook', 'tiktok', 'linkedin', 'youtube')),
  platform_account_id text not null,
  account_name text,
  username text,
  profile_image_url text,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] default '{}',
  status text not null default 'connected'
    check (status in ('connected', 'expired', 'revoked', 'error')),
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz,
  unique (organization_id, platform, platform_account_id)
);

create table public.social_connection_pending (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform_target text not null check (platform_target in ('facebook', 'instagram')),
  payload_encrypted text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index social_accounts_organization_id_idx on public.social_accounts (organization_id);
create index social_accounts_platform_idx on public.social_accounts (platform);
create index social_accounts_status_idx on public.social_accounts (status);
create index social_connection_pending_expires_idx on public.social_connection_pending (expires_at);

alter table public.social_accounts enable row level security;
alter table public.social_connection_pending enable row level security;

create policy "Org members view social accounts"
  on public.social_accounts for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = social_accounts.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy "Org members manage social accounts"
  on public.social_accounts for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = social_accounts.organization_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = social_accounts.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy "Users manage own pending connections"
  on public.social_connection_pending for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create trigger social_accounts_updated_at
  before update on public.social_accounts
  for each row execute function public.set_updated_at();
