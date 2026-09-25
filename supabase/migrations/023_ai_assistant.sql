-- Adly Phase 17: AI Assistant conversations, messages, and pending actions

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_conversations_organization_id_idx
  on public.ai_conversations (organization_id);
create index ai_conversations_client_workspace_id_idx
  on public.ai_conversations (client_workspace_id);
create index ai_conversations_user_id_idx
  on public.ai_conversations (user_id);
create index ai_conversations_created_at_idx
  on public.ai_conversations (created_at desc);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool', 'system')),
  content text not null default '',
  tool_calls jsonb,
  tool_results jsonb,
  created_at timestamptz not null default now()
);

create index ai_messages_conversation_id_idx
  on public.ai_messages (conversation_id);
create index ai_messages_created_at_idx
  on public.ai_messages (created_at asc);

create table public.ai_pending_actions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  action_type text not null,
  payload jsonb not null default '{}'::jsonb,
  summary text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'expired')),
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create index ai_pending_actions_conversation_id_idx
  on public.ai_pending_actions (conversation_id);
create index ai_pending_actions_user_id_idx
  on public.ai_pending_actions (user_id);
create index ai_pending_actions_status_idx
  on public.ai_pending_actions (status);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_pending_actions enable row level security;

create policy "Org members view ai conversations"
  on public.ai_conversations for select
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_conversations.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_conversations.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_conversations.client_workspace_id, auth.uid())
    )
  );

create policy "Org members insert ai conversations"
  on public.ai_conversations for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_conversations.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_conversations.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_conversations.client_workspace_id, auth.uid())
    )
  );

create policy "Org members update ai conversations"
  on public.ai_conversations for update
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_conversations.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_conversations.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_conversations.client_workspace_id, auth.uid())
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_conversations.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_conversations.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_conversations.client_workspace_id, auth.uid())
    )
  );

create policy "Org members delete ai conversations"
  on public.ai_conversations for delete
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_conversations.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_conversations.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_conversations.client_workspace_id, auth.uid())
    )
  );

create policy "Org members view ai messages"
  on public.ai_messages for select
  using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = ai_messages.conversation_id
        and c.user_id = auth.uid()
        and exists (
          select 1 from public.organization_members om
          where om.organization_id = c.organization_id
            and om.user_id = auth.uid()
        )
        and (
          c.client_workspace_id is null
          or public.user_can_access_client_workspace(c.client_workspace_id, auth.uid())
        )
    )
  );

create policy "Org members insert ai messages"
  on public.ai_messages for insert
  with check (
    exists (
      select 1 from public.ai_conversations c
      where c.id = ai_messages.conversation_id
        and c.user_id = auth.uid()
        and exists (
          select 1 from public.organization_members om
          where om.organization_id = c.organization_id
            and om.user_id = auth.uid()
        )
        and (
          c.client_workspace_id is null
          or public.user_can_access_client_workspace(c.client_workspace_id, auth.uid())
        )
    )
  );

create policy "Org members view ai pending actions"
  on public.ai_pending_actions for select
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_pending_actions.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_pending_actions.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_pending_actions.client_workspace_id, auth.uid())
    )
  );

create policy "Org members insert ai pending actions"
  on public.ai_pending_actions for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_pending_actions.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_pending_actions.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_pending_actions.client_workspace_id, auth.uid())
    )
  );

create policy "Org members update ai pending actions"
  on public.ai_pending_actions for update
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_pending_actions.organization_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_pending_actions.organization_id
        and om.user_id = auth.uid()
    )
  );

create trigger ai_conversations_set_updated_at
  before update on public.ai_conversations
  for each row execute function public.set_updated_at();
