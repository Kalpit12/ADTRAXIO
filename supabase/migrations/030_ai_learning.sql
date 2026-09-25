-- Phase 17.9: ADLY AI Learning & Outcome Intelligence

create table if not exists public.ai_learning_outcomes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete cascade,
  strategic_plan_id uuid references public.ai_strategic_plans (id) on delete set null,
  execution_plan_id uuid references public.ai_execution_plans (id) on delete set null,
  execution_step_id text,
  source_type text not null,
  source_id uuid,
  platform text,
  content_id uuid,
  campaign_id uuid references public.campaigns (id) on delete set null,
  scheduled_post_id uuid references public.scheduled_posts (id) on delete set null,
  objective text not null default '',
  idempotency_key text not null,
  baseline_json jsonb not null default '{}'::jsonb,
  outcome_json jsonb not null default '{}'::jsonb,
  comparison_json jsonb not null default '{}'::jsonb,
  learning_json jsonb not null default '{}'::jsonb,
  confidence text not null default 'low'
    check (confidence in ('high', 'medium', 'low')),
  status text not null default 'pending'
    check (
      status in (
        'pending',
        'measuring',
        'measured',
        'insufficient_data',
        'failed'
      )
    ),
  measure_after timestamptz not null,
  measured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create index if not exists ai_learning_outcomes_org_idx
  on public.ai_learning_outcomes (organization_id);

create index if not exists ai_learning_outcomes_workspace_idx
  on public.ai_learning_outcomes (client_workspace_id);

create index if not exists ai_learning_outcomes_strategic_plan_idx
  on public.ai_learning_outcomes (strategic_plan_id);

create index if not exists ai_learning_outcomes_execution_plan_idx
  on public.ai_learning_outcomes (execution_plan_id);

create index if not exists ai_learning_outcomes_content_idx
  on public.ai_learning_outcomes (content_id);

create index if not exists ai_learning_outcomes_campaign_idx
  on public.ai_learning_outcomes (campaign_id);

create index if not exists ai_learning_outcomes_platform_idx
  on public.ai_learning_outcomes (platform);

create index if not exists ai_learning_outcomes_measured_at_idx
  on public.ai_learning_outcomes (measured_at);

create index if not exists ai_learning_outcomes_measure_after_idx
  on public.ai_learning_outcomes (measure_after);

alter table public.ai_learning_outcomes enable row level security;

create policy "Org members view learning outcomes"
  on public.ai_learning_outcomes for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_learning_outcomes.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_learning_outcomes.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_learning_outcomes.client_workspace_id, auth.uid())
    )
  );

create policy "Org members insert learning outcomes"
  on public.ai_learning_outcomes for insert
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_learning_outcomes.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_learning_outcomes.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_learning_outcomes.client_workspace_id, auth.uid())
    )
  );

create policy "Org members update learning outcomes"
  on public.ai_learning_outcomes for update
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_learning_outcomes.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_learning_outcomes.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_learning_outcomes.client_workspace_id, auth.uid())
    )
  );
