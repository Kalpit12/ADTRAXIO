-- Phase 17.17: Optimization readiness proposals (no execution)

create table if not exists public.ai_optimization_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete cascade,
  created_by uuid not null,
  source_type text not null,
  source_id uuid not null,
  proposal_type text not null
    check (
      proposal_type in (
        'allocation_change',
        'content_selection',
        'scheduling_change',
        'campaign_setting_change'
      )
    ),
  objective text not null default '',
  status text not null default 'draft'
    check (
      status in (
        'draft',
        'review',
        'approved',
        'expired',
        'rejected',
        'executed',
        'rolled_back',
        'cancelled'
      )
    ),
  current_state_json jsonb not null default '{}'::jsonb,
  proposed_state_json jsonb not null default '{}'::jsonb,
  projected_state_json jsonb not null default '{}'::jsonb,
  evidence_json jsonb not null default '{}'::jsonb,
  eligibility_json jsonb not null default '{}'::jsonb,
  risk_json jsonb not null default '{}'::jsonb,
  simulation_json jsonb not null default '{}'::jsonb,
  limitations_json jsonb not null default '[]'::jsonb,
  rollback_state_json jsonb not null default '{}'::jsonb,
  audit_log_json jsonb not null default '[]'::jsonb,
  approved_by uuid,
  approved_at timestamptz,
  expires_at timestamptz not null,
  executed_at timestamptz,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create index if not exists ai_optimization_proposals_org_idx
  on public.ai_optimization_proposals (organization_id);

create index if not exists ai_optimization_proposals_workspace_idx
  on public.ai_optimization_proposals (client_workspace_id);

create index if not exists ai_optimization_proposals_status_idx
  on public.ai_optimization_proposals (status);

create index if not exists ai_optimization_proposals_expires_idx
  on public.ai_optimization_proposals (expires_at);

alter table public.ai_optimization_proposals enable row level security;

create policy "Org members view optimization proposals"
  on public.ai_optimization_proposals for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_optimization_proposals.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_optimization_proposals.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_optimization_proposals.client_workspace_id, auth.uid())
    )
  );

create policy "Org members manage optimization proposals"
  on public.ai_optimization_proposals for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_optimization_proposals.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_optimization_proposals.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_optimization_proposals.client_workspace_id, auth.uid())
    )
  );
