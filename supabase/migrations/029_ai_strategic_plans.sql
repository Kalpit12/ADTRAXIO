-- Phase 17.8: ADLY AI Strategic Execution Planner

create table if not exists public.ai_strategic_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  objective text not null,
  strategy_type text not null default 'custom'
    check (
      strategy_type in (
        'content_growth',
        'engagement_recovery',
        'audience_growth',
        'campaign_push',
        'consistency',
        'performance_optimization',
        'custom'
      )
    ),
  status text not null default 'draft'
    check (
      status in (
        'draft',
        'prepared',
        'review',
        'approved',
        'executing',
        'completed',
        'partially_completed',
        'failed',
        'cancelled',
        'expired'
      )
    ),
  plan_json jsonb not null default '{}'::jsonb,
  evidence_json jsonb not null default '[]'::jsonb,
  confidence text not null default 'medium'
    check (confidence in ('high', 'medium', 'low')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists ai_strategic_plans_org_idx
  on public.ai_strategic_plans (organization_id);

create index if not exists ai_strategic_plans_status_idx
  on public.ai_strategic_plans (status);

alter table public.ai_strategic_plans enable row level security;

create policy "Org members view strategic plans"
  on public.ai_strategic_plans for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_strategic_plans.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_strategic_plans.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_strategic_plans.client_workspace_id, auth.uid())
    )
  );

create policy "Org members manage strategic plans"
  on public.ai_strategic_plans for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_strategic_plans.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_strategic_plans.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_strategic_plans.client_workspace_id, auth.uid())
    )
  )
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_strategic_plans.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_strategic_plans.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_strategic_plans.client_workspace_id, auth.uid())
    )
  );
