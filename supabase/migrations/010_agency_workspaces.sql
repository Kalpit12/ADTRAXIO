-- Adly Phase 12: Agency client workspaces

create table public.client_workspaces (
  id uuid primary key default gen_random_uuid(),
  agency_organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_by uuid not null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_organization_id, slug)
);

create table public.client_workspace_members (
  id uuid primary key default gen_random_uuid(),
  client_workspace_id uuid not null references public.client_workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (client_workspace_id, user_id)
);

create table public.client_invitations (
  id uuid primary key default gen_random_uuid(),
  client_workspace_id uuid not null references public.client_workspaces (id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'manager', 'editor', 'viewer')),
  invited_by uuid not null references auth.users (id) on delete set null,
  token_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index client_workspaces_agency_org_idx on public.client_workspaces (agency_organization_id);
create index client_workspaces_status_idx on public.client_workspaces (status);
create index client_workspace_members_user_idx on public.client_workspace_members (user_id);
create index client_workspace_members_client_idx on public.client_workspace_members (client_workspace_id);
create index client_invitations_client_idx on public.client_invitations (client_workspace_id);
create index client_invitations_token_hash_idx on public.client_invitations (token_hash);

alter table public.content
  add column if not exists client_workspace_id uuid references public.client_workspaces (id) on delete set null;
alter table public.social_accounts
  add column if not exists client_workspace_id uuid references public.client_workspaces (id) on delete set null;
alter table public.scheduled_posts
  add column if not exists client_workspace_id uuid references public.client_workspaces (id) on delete set null;
alter table public.campaigns
  add column if not exists client_workspace_id uuid references public.client_workspaces (id) on delete set null;
alter table public.analytics_daily
  add column if not exists client_workspace_id uuid references public.client_workspaces (id) on delete set null;
alter table public.content_analytics
  add column if not exists client_workspace_id uuid references public.client_workspaces (id) on delete set null;
alter table public.ai_recommendations
  add column if not exists client_workspace_id uuid references public.client_workspaces (id) on delete set null;

create index if not exists content_client_workspace_id_idx on public.content (client_workspace_id);
create index if not exists social_accounts_client_workspace_id_idx on public.social_accounts (client_workspace_id);
create index if not exists scheduled_posts_client_workspace_id_idx on public.scheduled_posts (client_workspace_id);
create index if not exists campaigns_client_workspace_id_idx on public.campaigns (client_workspace_id);
create index if not exists analytics_daily_client_workspace_id_idx on public.analytics_daily (client_workspace_id);
create index if not exists content_analytics_client_workspace_id_idx on public.content_analytics (client_workspace_id);
create index if not exists ai_recommendations_client_workspace_id_idx on public.ai_recommendations (client_workspace_id);

-- Access helper: org owner or client workspace member
create or replace function public.user_can_access_client_workspace(
  p_client_workspace_id uuid,
  p_user_id uuid default auth.uid()
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.client_workspaces cw
    join public.organization_members om
      on om.organization_id = cw.agency_organization_id
     and om.user_id = p_user_id
    where cw.id = p_client_workspace_id
      and cw.status = 'active'
      and (
        om.role = 'owner'
        or exists (
          select 1
          from public.client_workspace_members cwm
          where cwm.client_workspace_id = cw.id
            and cwm.user_id = p_user_id
        )
      )
  );
$$;

alter table public.client_workspaces enable row level security;
alter table public.client_workspace_members enable row level security;
alter table public.client_invitations enable row level security;

create policy "Agency members view client workspaces"
  on public.client_workspaces for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = client_workspaces.agency_organization_id
        and om.user_id = auth.uid()
    )
    and (
      exists (
        select 1 from public.organization_members om
        where om.organization_id = client_workspaces.agency_organization_id
          and om.user_id = auth.uid()
          and om.role = 'owner'
      )
      or public.user_can_access_client_workspace(client_workspaces.id, auth.uid())
    )
  );

create policy "Agency owners manage client workspaces"
  on public.client_workspaces for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = client_workspaces.agency_organization_id
        and om.user_id = auth.uid()
        and om.role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = client_workspaces.agency_organization_id
        and om.user_id = auth.uid()
        and om.role = 'owner'
    )
  );

create policy "Client members view membership"
  on public.client_workspace_members for select
  using (
    public.user_can_access_client_workspace(client_workspace_members.client_workspace_id, auth.uid())
  );

create policy "Client managers manage membership"
  on public.client_workspace_members for all
  using (
    exists (
      select 1 from public.client_workspace_members cwm
      where cwm.client_workspace_id = client_workspace_members.client_workspace_id
        and cwm.user_id = auth.uid()
        and cwm.role in ('owner', 'manager')
    )
    or exists (
      select 1
      from public.client_workspaces cw
      join public.organization_members om on om.organization_id = cw.agency_organization_id
      where cw.id = client_workspace_members.client_workspace_id
        and om.user_id = auth.uid()
        and om.role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from public.client_workspace_members cwm
      where cwm.client_workspace_id = client_workspace_members.client_workspace_id
        and cwm.user_id = auth.uid()
        and cwm.role in ('owner', 'manager')
    )
    or exists (
      select 1
      from public.client_workspaces cw
      join public.organization_members om on om.organization_id = cw.agency_organization_id
      where cw.id = client_workspace_members.client_workspace_id
        and om.user_id = auth.uid()
        and om.role = 'owner'
    )
  );

create policy "Inviters view client invitations"
  on public.client_invitations for select
  using (
    public.user_can_access_client_workspace(client_invitations.client_workspace_id, auth.uid())
  );

create policy "Managers create client invitations"
  on public.client_invitations for insert
  with check (
    exists (
      select 1 from public.client_workspace_members cwm
      where cwm.client_workspace_id = client_invitations.client_workspace_id
        and cwm.user_id = auth.uid()
        and cwm.role in ('owner', 'manager')
    )
    or exists (
      select 1
      from public.client_workspaces cw
      join public.organization_members om on om.organization_id = cw.agency_organization_id
      where cw.id = client_invitations.client_workspace_id
        and om.user_id = auth.uid()
        and om.role = 'owner'
    )
  );

create trigger client_workspaces_updated_at
  before update on public.client_workspaces
  for each row execute function public.set_updated_at();
