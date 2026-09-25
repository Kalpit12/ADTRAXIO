-- Phase 17.5: ADLY AI Proactive Growth Agent — growth briefs

create table if not exists public.ai_growth_briefs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  brief_type text not null check (brief_type in ('daily', 'weekly')),
  status text not null default 'generated'
    check (status in ('generated', 'reviewed', 'archived')),
  summary text not null,
  insights jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ai_growth_briefs_scope_period_uidx
  on public.ai_growth_briefs (
    organization_id,
    coalesce(client_workspace_id, '00000000-0000-0000-0000-000000000000'::uuid),
    brief_type,
    period_start,
    period_end
  );

create index if not exists ai_growth_briefs_org_idx
  on public.ai_growth_briefs (organization_id);

create index if not exists ai_growth_briefs_generated_idx
  on public.ai_growth_briefs (generated_at desc);

alter table public.ai_growth_briefs enable row level security;

create policy "Org members view growth briefs"
  on public.ai_growth_briefs for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_growth_briefs.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_growth_briefs.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_growth_briefs.client_workspace_id, auth.uid())
    )
  );

create policy "Org members manage growth briefs"
  on public.ai_growth_briefs for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_growth_briefs.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_growth_briefs.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_growth_briefs.client_workspace_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_growth_briefs.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_growth_briefs.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_growth_briefs.client_workspace_id, auth.uid())
    )
  );
