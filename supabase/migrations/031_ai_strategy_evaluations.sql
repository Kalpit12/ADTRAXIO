-- Phase 17.11: ADLY AI Strategy Evaluation & Experimentation

create table if not exists public.ai_strategy_evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete cascade,
  strategic_plan_id uuid not null references public.ai_strategic_plans (id) on delete cascade,
  execution_plan_id uuid references public.ai_execution_plans (id) on delete set null,
  objective text not null default 'growth',
  idempotency_key text not null,
  evaluation_status text not null default 'pending'
    check (
      evaluation_status in (
        'pending',
        'measuring',
        'evaluated',
        'insufficient_data',
        'inconclusive',
        'failed'
      )
    ),
  baseline_json jsonb not null default '{}'::jsonb,
  outcome_json jsonb not null default '{}'::jsonb,
  comparison_json jsonb not null default '{}'::jsonb,
  attribution_json jsonb not null default '{}'::jsonb,
  evaluation_json jsonb not null default '{}'::jsonb,
  confidence text not null default 'low'
    check (confidence in ('high', 'medium', 'low')),
  experiment_id uuid,
  variant_id text,
  experiment_label text,
  measure_after timestamptz not null,
  measured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create index if not exists ai_strategy_evaluations_org_idx
  on public.ai_strategy_evaluations (organization_id);

create index if not exists ai_strategy_evaluations_workspace_idx
  on public.ai_strategy_evaluations (client_workspace_id);

create index if not exists ai_strategy_evaluations_strategic_plan_idx
  on public.ai_strategy_evaluations (strategic_plan_id);

create index if not exists ai_strategy_evaluations_execution_plan_idx
  on public.ai_strategy_evaluations (execution_plan_id);

create index if not exists ai_strategy_evaluations_measured_at_idx
  on public.ai_strategy_evaluations (measured_at);

create index if not exists ai_strategy_evaluations_measure_after_idx
  on public.ai_strategy_evaluations (measure_after);

alter table public.ai_strategy_evaluations enable row level security;

create policy "Org members view strategy evaluations"
  on public.ai_strategy_evaluations for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_strategy_evaluations.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_strategy_evaluations.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_strategy_evaluations.client_workspace_id, auth.uid())
    )
  );

create policy "Org members manage strategy evaluations"
  on public.ai_strategy_evaluations for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_strategy_evaluations.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_strategy_evaluations.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_strategy_evaluations.client_workspace_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_strategy_evaluations.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_strategy_evaluations.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_strategy_evaluations.client_workspace_id, auth.uid())
    )
  );
