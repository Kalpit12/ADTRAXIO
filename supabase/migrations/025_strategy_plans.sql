-- Phase 17.3: Strategy plans for ADLY AI

create table if not exists public.strategy_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete set null,
  created_by uuid not null references auth.users (id) on delete cascade,
  title text not null,
  objective text not null default '',
  audience text,
  platforms text[] not null default '{}',
  content_pillars jsonb not null default '[]'::jsonb,
  cadence text,
  duration_days integer not null default 30,
  plan_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists strategy_plans_organization_id_idx
  on public.strategy_plans (organization_id);
create index if not exists strategy_plans_client_workspace_id_idx
  on public.strategy_plans (client_workspace_id);
create index if not exists strategy_plans_status_idx
  on public.strategy_plans (status);

alter table public.strategy_plans enable row level security;

create policy "Org members view strategy plans"
  on public.strategy_plans for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = strategy_plans.organization_id
        and om.user_id = auth.uid()
    )
    and (
      strategy_plans.client_workspace_id is null
      or public.user_can_access_client_workspace(strategy_plans.client_workspace_id, auth.uid())
    )
  );

create policy "Org members insert strategy plans"
  on public.strategy_plans for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.organization_members om
      where om.organization_id = strategy_plans.organization_id
        and om.user_id = auth.uid()
    )
    and (
      strategy_plans.client_workspace_id is null
      or public.user_can_access_client_workspace(strategy_plans.client_workspace_id, auth.uid())
    )
  );

create policy "Org members update strategy plans"
  on public.strategy_plans for update
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = strategy_plans.organization_id
        and om.user_id = auth.uid()
    )
    and (
      strategy_plans.client_workspace_id is null
      or public.user_can_access_client_workspace(strategy_plans.client_workspace_id, auth.uid())
    )
  );

create policy "Org members delete strategy plans"
  on public.strategy_plans for delete
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = strategy_plans.organization_id
        and om.user_id = auth.uid()
    )
    and (
      strategy_plans.client_workspace_id is null
      or public.user_can_access_client_workspace(strategy_plans.client_workspace_id, auth.uid())
    )
  );
