-- Adly Phase 13: Team collaboration & client approvals

create table public.content_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete set null,
  content_id uuid not null references public.content (id) on delete cascade,
  requested_by uuid not null references auth.users (id) on delete cascade,
  assigned_to uuid references auth.users (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'changes_requested', 'cancelled')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaign_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete set null,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  requested_by uuid not null references auth.users (id) on delete cascade,
  assigned_to uuid references auth.users (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'changes_requested', 'cancelled')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collaboration_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete set null,
  author_id uuid not null references auth.users (id) on delete cascade,
  content_id uuid references public.content (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete cascade,
  approval_id uuid,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    content_id is not null
    or campaign_id is not null
    or approval_id is not null
  )
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete set null,
  actor_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete set null,
  type text not null,
  title text not null,
  body text not null,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index content_approvals_org_idx on public.content_approvals (organization_id);
create index content_approvals_content_idx on public.content_approvals (content_id);
create index content_approvals_status_idx on public.content_approvals (status);
create index content_approvals_client_idx on public.content_approvals (client_workspace_id);
create index content_approvals_assigned_idx on public.content_approvals (assigned_to);

create index campaign_approvals_org_idx on public.campaign_approvals (organization_id);
create index campaign_approvals_campaign_idx on public.campaign_approvals (campaign_id);
create index campaign_approvals_status_idx on public.campaign_approvals (status);
create index campaign_approvals_client_idx on public.campaign_approvals (client_workspace_id);
create index campaign_approvals_assigned_idx on public.campaign_approvals (assigned_to);

create index collaboration_comments_org_idx on public.collaboration_comments (organization_id);
create index collaboration_comments_content_idx on public.collaboration_comments (content_id);
create index collaboration_comments_campaign_idx on public.collaboration_comments (campaign_id);
create index collaboration_comments_approval_idx on public.collaboration_comments (approval_id);
create index collaboration_comments_client_idx on public.collaboration_comments (client_workspace_id);

create index activity_log_org_idx on public.activity_log (organization_id);
create index activity_log_entity_idx on public.activity_log (entity_type, entity_id);
create index activity_log_client_idx on public.activity_log (client_workspace_id);
create index activity_log_created_idx on public.activity_log (created_at desc);

create index notifications_recipient_idx on public.notifications (recipient_id);
create index notifications_recipient_unread_idx on public.notifications (recipient_id, read_at)
  where read_at is null;
create index notifications_org_idx on public.notifications (organization_id);
create index notifications_client_idx on public.notifications (client_workspace_id);

-- One active approval per content/campaign
create unique index content_approvals_active_content_idx
  on public.content_approvals (content_id)
  where status in ('pending', 'changes_requested');

create unique index campaign_approvals_active_campaign_idx
  on public.campaign_approvals (campaign_id)
  where status in ('pending', 'changes_requested');

alter table public.content_approvals enable row level security;
alter table public.campaign_approvals enable row level security;
alter table public.collaboration_comments enable row level security;
alter table public.activity_log enable row level security;
alter table public.notifications enable row level security;

create policy "Org members view content approvals"
  on public.content_approvals for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = content_approvals.organization_id
        and om.user_id = auth.uid()
    )
    and (
      content_approvals.client_workspace_id is null
      or public.user_can_access_client_workspace(content_approvals.client_workspace_id, auth.uid())
    )
  );

create policy "Org members manage content approvals"
  on public.content_approvals for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = content_approvals.organization_id
        and om.user_id = auth.uid()
    )
    and (
      content_approvals.client_workspace_id is null
      or public.user_can_access_client_workspace(content_approvals.client_workspace_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = content_approvals.organization_id
        and om.user_id = auth.uid()
    )
    and (
      content_approvals.client_workspace_id is null
      or public.user_can_access_client_workspace(content_approvals.client_workspace_id, auth.uid())
    )
  );

create policy "Org members view campaign approvals"
  on public.campaign_approvals for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = campaign_approvals.organization_id
        and om.user_id = auth.uid()
    )
    and (
      campaign_approvals.client_workspace_id is null
      or public.user_can_access_client_workspace(campaign_approvals.client_workspace_id, auth.uid())
    )
  );

create policy "Org members manage campaign approvals"
  on public.campaign_approvals for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = campaign_approvals.organization_id
        and om.user_id = auth.uid()
    )
    and (
      campaign_approvals.client_workspace_id is null
      or public.user_can_access_client_workspace(campaign_approvals.client_workspace_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = campaign_approvals.organization_id
        and om.user_id = auth.uid()
    )
    and (
      campaign_approvals.client_workspace_id is null
      or public.user_can_access_client_workspace(campaign_approvals.client_workspace_id, auth.uid())
    )
  );

create policy "Org members view collaboration comments"
  on public.collaboration_comments for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = collaboration_comments.organization_id
        and om.user_id = auth.uid()
    )
    and (
      collaboration_comments.client_workspace_id is null
      or public.user_can_access_client_workspace(collaboration_comments.client_workspace_id, auth.uid())
    )
  );

create policy "Org members manage collaboration comments"
  on public.collaboration_comments for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = collaboration_comments.organization_id
        and om.user_id = auth.uid()
    )
    and (
      collaboration_comments.client_workspace_id is null
      or public.user_can_access_client_workspace(collaboration_comments.client_workspace_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = collaboration_comments.organization_id
        and om.user_id = auth.uid()
    )
    and (
      collaboration_comments.client_workspace_id is null
      or public.user_can_access_client_workspace(collaboration_comments.client_workspace_id, auth.uid())
    )
  );

create policy "Org members view activity log"
  on public.activity_log for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = activity_log.organization_id
        and om.user_id = auth.uid()
    )
    and (
      activity_log.client_workspace_id is null
      or public.user_can_access_client_workspace(activity_log.client_workspace_id, auth.uid())
    )
  );

create policy "Org members insert activity log"
  on public.activity_log for insert
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = activity_log.organization_id
        and om.user_id = auth.uid()
    )
    and (
      activity_log.client_workspace_id is null
      or public.user_can_access_client_workspace(activity_log.client_workspace_id, auth.uid())
    )
  );

create policy "Recipients view notifications"
  on public.notifications for select
  using (recipient_id = auth.uid());

create policy "Recipients update notifications"
  on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy "Org members insert notifications"
  on public.notifications for insert
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = notifications.organization_id
        and om.user_id = auth.uid()
    )
  );

create trigger content_approvals_updated_at
  before update on public.content_approvals
  for each row execute function public.set_updated_at();

create trigger campaign_approvals_updated_at
  before update on public.campaign_approvals
  for each row execute function public.set_updated_at();

create trigger collaboration_comments_updated_at
  before update on public.collaboration_comments
  for each row execute function public.set_updated_at();
