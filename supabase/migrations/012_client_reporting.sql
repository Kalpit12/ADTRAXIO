-- Adly Phase 14: Agency client reporting & shared performance

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid not null references public.client_workspaces (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  date_from date not null,
  date_to date not null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  visibility text not null default 'internal'
    check (visibility in ('internal', 'client')),
  platforms jsonb not null default '[]'::jsonb,
  include_campaigns boolean not null default true,
  include_content boolean not null default true,
  include_platforms boolean not null default true,
  include_ai_summary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (date_from <= date_to)
);

create table public.report_snapshots (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid not null references public.client_workspaces (id) on delete cascade,
  generated_by uuid not null references auth.users (id) on delete cascade,
  generated_at timestamptz not null default now(),
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table public.report_views (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  viewer_id uuid references auth.users (id) on delete set null,
  client_workspace_id uuid not null references public.client_workspaces (id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create index reports_org_idx on public.reports (organization_id);
create index reports_client_idx on public.reports (client_workspace_id);
create index reports_status_idx on public.reports (status);
create index reports_created_idx on public.reports (created_at desc);

create index report_snapshots_report_idx on public.report_snapshots (report_id);
create index report_snapshots_org_idx on public.report_snapshots (organization_id);
create index report_snapshots_client_idx on public.report_snapshots (client_workspace_id);
create index report_snapshots_generated_idx on public.report_snapshots (generated_at desc);

create index report_views_report_idx on public.report_views (report_id);
create index report_views_client_idx on public.report_views (client_workspace_id);
create index report_views_viewed_idx on public.report_views (viewed_at desc);

alter table public.reports enable row level security;
alter table public.report_snapshots enable row level security;
alter table public.report_views enable row level security;

create policy "Org members view reports"
  on public.reports for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = reports.organization_id
        and om.user_id = auth.uid()
    )
    and public.user_can_access_client_workspace(reports.client_workspace_id, auth.uid())
  );

create policy "Org members manage reports"
  on public.reports for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = reports.organization_id
        and om.user_id = auth.uid()
    )
    and public.user_can_access_client_workspace(reports.client_workspace_id, auth.uid())
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = reports.organization_id
        and om.user_id = auth.uid()
    )
    and public.user_can_access_client_workspace(reports.client_workspace_id, auth.uid())
  );

create policy "Org members view report snapshots"
  on public.report_snapshots for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = report_snapshots.organization_id
        and om.user_id = auth.uid()
    )
    and public.user_can_access_client_workspace(report_snapshots.client_workspace_id, auth.uid())
  );

create policy "Org members insert report snapshots"
  on public.report_snapshots for insert
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = report_snapshots.organization_id
        and om.user_id = auth.uid()
    )
    and public.user_can_access_client_workspace(report_snapshots.client_workspace_id, auth.uid())
  );

create policy "Org members insert report views"
  on public.report_views for insert
  with check (
    exists (
      select 1 from public.reports r
      join public.organization_members om
        on om.organization_id = r.organization_id
        and om.user_id = auth.uid()
      where r.id = report_views.report_id
        and r.client_workspace_id = report_views.client_workspace_id
    )
    and public.user_can_access_client_workspace(report_views.client_workspace_id, auth.uid())
  );

create policy "Org members view report views"
  on public.report_views for select
  using (
    exists (
      select 1 from public.reports r
      join public.organization_members om
        on om.organization_id = r.organization_id
        and om.user_id = auth.uid()
      where r.id = report_views.report_id
    )
    and public.user_can_access_client_workspace(report_views.client_workspace_id, auth.uid())
  );

create trigger reports_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();
