-- Phase 17.12: ADLY AI Controlled Experimentation

create table if not exists public.ai_experiments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  name text not null,
  objective text not null default '',
  hypothesis text not null default '',
  platform text,
  status text not null default 'draft'
    check (
      status in (
        'draft',
        'review',
        'approved',
        'running',
        'paused',
        'completed',
        'cancelled'
      )
    ),
  allocation_type text not null default 'fixed_split'
    check (allocation_type in ('manual', 'fixed_split')),
  allocation_json jsonb not null default '{}'::jsonb,
  success_metric text not null default 'engagement',
  secondary_metrics jsonb not null default '[]'::jsonb,
  sample_target integer,
  minimum_observation_days integer not null default 14,
  strategic_plan_id uuid references public.ai_strategic_plans (id) on delete set null,
  growth_brief_id uuid,
  interpretation_json jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_experiment_variants (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.ai_experiments (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete cascade,
  name text not null,
  description text not null default '',
  variant_key text not null,
  content_id uuid references public.content (id) on delete set null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  scheduled_post_id uuid references public.scheduled_posts (id) on delete set null,
  execution_plan_id uuid references public.ai_execution_plans (id) on delete set null,
  allocation_percent numeric not null check (allocation_percent > 0 and allocation_percent <= 100),
  baseline_json jsonb not null default '{}'::jsonb,
  outcome_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (
      status in ('draft', 'approved', 'active', 'completed', 'cancelled')
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (experiment_id, variant_key)
);

create index if not exists ai_experiments_org_idx on public.ai_experiments (organization_id);
create index if not exists ai_experiments_workspace_idx on public.ai_experiments (client_workspace_id);
create index if not exists ai_experiments_status_idx on public.ai_experiments (status);
create index if not exists ai_experiment_variants_experiment_idx
  on public.ai_experiment_variants (experiment_id);
create index if not exists ai_experiment_variants_org_idx
  on public.ai_experiment_variants (organization_id);

alter table public.ai_experiments enable row level security;
alter table public.ai_experiment_variants enable row level security;

create policy "Org members view experiments"
  on public.ai_experiments for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_experiments.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_experiments.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_experiments.client_workspace_id, auth.uid())
    )
  );

create policy "Org members manage experiments"
  on public.ai_experiments for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_experiments.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_experiments.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_experiments.client_workspace_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_experiments.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_experiments.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_experiments.client_workspace_id, auth.uid())
    )
  );

create policy "Org members view experiment variants"
  on public.ai_experiment_variants for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_experiment_variants.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_experiment_variants.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_experiment_variants.client_workspace_id, auth.uid())
    )
  );

create policy "Org members manage experiment variants"
  on public.ai_experiment_variants for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_experiment_variants.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_experiment_variants.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_experiment_variants.client_workspace_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_experiment_variants.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_experiment_variants.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_experiment_variants.client_workspace_id, auth.uid())
    )
  );

alter table public.ai_learning_outcomes
  add column if not exists experiment_id uuid references public.ai_experiments (id) on delete set null;

alter table public.ai_learning_outcomes
  add column if not exists experiment_variant_id uuid references public.ai_experiment_variants (id) on delete set null;

create index if not exists ai_learning_outcomes_experiment_idx
  on public.ai_learning_outcomes (experiment_id);
