-- Phase 17.4: ADLY AI Brand Brain & Memory

create table if not exists public.ai_brand_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete cascade,
  business_name text,
  industry text,
  description text,
  target_audience text,
  brand_voice text,
  tone text,
  content_pillars jsonb not null default '[]'::jsonb,
  preferred_platforms jsonb not null default '[]'::jsonb,
  preferred_ctas jsonb not null default '[]'::jsonb,
  keywords jsonb not null default '[]'::jsonb,
  avoid_words jsonb not null default '[]'::jsonb,
  brand_rules jsonb not null default '[]'::jsonb,
  goals jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ai_brand_profiles_scope_uidx
  on public.ai_brand_profiles (
    organization_id,
    coalesce(client_workspace_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create table if not exists public.ai_brand_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete cascade,
  name text not null,
  description text,
  audience text,
  key_benefits jsonb not null default '[]'::jsonb,
  differentiators jsonb not null default '[]'::jsonb,
  approved_claims jsonb not null default '[]'::jsonb,
  prohibited_claims jsonb not null default '[]'::jsonb,
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_brand_products_org_idx
  on public.ai_brand_products (organization_id);
create index if not exists ai_brand_products_client_idx
  on public.ai_brand_products (client_workspace_id);

create table if not exists public.ai_memory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_workspace_id uuid references public.client_workspaces (id) on delete cascade,
  category text not null check (
    category in ('preference', 'brand', 'audience', 'strategy', 'content', 'product')
  ),
  key text not null,
  value text not null,
  source text not null default 'explicit'
    check (source in ('explicit', 'user_confirmed')),
  confidence text,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_memory_org_idx on public.ai_memory (organization_id);
create index if not exists ai_memory_client_idx on public.ai_memory (client_workspace_id);
create index if not exists ai_memory_status_idx on public.ai_memory (status);

alter table public.ai_brand_profiles enable row level security;
alter table public.ai_brand_products enable row level security;
alter table public.ai_memory enable row level security;

create policy "Org members view brand profiles"
  on public.ai_brand_profiles for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_brand_profiles.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_brand_profiles.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_brand_profiles.client_workspace_id, auth.uid())
    )
  );

create policy "Org members manage brand profiles"
  on public.ai_brand_profiles for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_brand_profiles.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_brand_profiles.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_brand_profiles.client_workspace_id, auth.uid())
    )
  )
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_brand_profiles.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_brand_profiles.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_brand_profiles.client_workspace_id, auth.uid())
    )
  );

create policy "Org members view brand products"
  on public.ai_brand_products for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_brand_products.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_brand_products.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_brand_products.client_workspace_id, auth.uid())
    )
  );

create policy "Org members manage brand products"
  on public.ai_brand_products for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_brand_products.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_brand_products.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_brand_products.client_workspace_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_brand_products.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_brand_products.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_brand_products.client_workspace_id, auth.uid())
    )
  );

create policy "Org members view ai memory"
  on public.ai_memory for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_memory.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_memory.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_memory.client_workspace_id, auth.uid())
    )
  );

create policy "Org members manage ai memory"
  on public.ai_memory for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_memory.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_memory.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_memory.client_workspace_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_memory.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_memory.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_memory.client_workspace_id, auth.uid())
    )
  );
