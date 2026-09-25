-- Adly Phase 10: AI Growth Intelligence

create table public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  generated_at timestamptz not null default now(),
  period_start date not null,
  period_end date not null,
  type text not null check (
    type in ('growth', 'content', 'platform', 'campaign', 'timing')
  ),
  title text not null,
  observation text,
  recommendation text,
  evidence jsonb not null default '[]'::jsonb,
  confidence text check (confidence in ('high', 'medium', 'low')),
  priority text check (priority in ('high', 'medium', 'low')),
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'dismissed', 'acted_on')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_recommendations_organization_id_idx
  on public.ai_recommendations (organization_id);
create index ai_recommendations_generated_at_idx
  on public.ai_recommendations (generated_at desc);
create index ai_recommendations_status_idx
  on public.ai_recommendations (status);
create index ai_recommendations_type_idx
  on public.ai_recommendations (type);
create index ai_recommendations_period_idx
  on public.ai_recommendations (period_start, period_end);

alter table public.ai_recommendations enable row level security;

create policy "Org members view ai recommendations"
  on public.ai_recommendations for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_recommendations.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy "Org members manage ai recommendations"
  on public.ai_recommendations for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_recommendations.organization_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_recommendations.organization_id
        and om.user_id = auth.uid()
    )
  );

create trigger ai_recommendations_updated_at
  before update on public.ai_recommendations
  for each row execute function public.set_updated_at();
