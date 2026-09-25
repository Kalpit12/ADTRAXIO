-- Phase 17.6: ADLY AI Agentic Campaign Execution

create table if not exists public.ai_execution_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  growth_brief_id uuid references public.ai_growth_briefs (id) on delete set null,
  title text not null,
  objective text not null,
  status text not null default 'draft'
    check (
      status in (
        'draft',
        'review',
        'approved',
        'executing',
        'completed',
        'partially_completed',
        'failed',
        'cancelled'
      )
    ),
  plan_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists ai_execution_plans_org_idx
  on public.ai_execution_plans (organization_id);

create index if not exists ai_execution_plans_status_idx
  on public.ai_execution_plans (status);

alter table public.ai_execution_plans enable row level security;

create policy "Org members view execution plans"
  on public.ai_execution_plans for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_execution_plans.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_execution_plans.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_execution_plans.client_workspace_id, auth.uid())
    )
  );

create policy "Org members manage execution plans"
  on public.ai_execution_plans for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_execution_plans.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_execution_plans.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_execution_plans.client_workspace_id, auth.uid())
    )
  )
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_execution_plans.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_execution_plans.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_execution_plans.client_workspace_id, auth.uid())
    )
  );
