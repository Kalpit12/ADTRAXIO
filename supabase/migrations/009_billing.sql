-- Adly Phase 11: SaaS billing & subscriptions

create table public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan text not null check (plan in ('free', 'pro', 'agency')),
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.billing_usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  metric text not null check (metric in ('ai_generation')),
  created_at timestamptz not null default now()
);

create index billing_customers_organization_id_idx on public.billing_customers (organization_id);
create index billing_customers_stripe_customer_id_idx on public.billing_customers (stripe_customer_id);

create index subscriptions_organization_id_idx on public.subscriptions (organization_id);
create index subscriptions_stripe_customer_id_idx on public.subscriptions (stripe_customer_id);
create index subscriptions_stripe_subscription_id_idx on public.subscriptions (stripe_subscription_id);
create index subscriptions_status_idx on public.subscriptions (status);
create index subscriptions_plan_idx on public.subscriptions (plan);

create index billing_usage_events_org_metric_created_idx
  on public.billing_usage_events (organization_id, metric, created_at desc);

alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;
alter table public.billing_usage_events enable row level security;

create policy "Org members view billing customers"
  on public.billing_customers for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = billing_customers.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy "Org members view subscriptions"
  on public.subscriptions for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = subscriptions.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy "Org members view billing usage"
  on public.billing_usage_events for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = billing_usage_events.organization_id
        and om.user_id = auth.uid()
    )
  );

create trigger billing_customers_updated_at
  before update on public.billing_customers
  for each row execute function public.set_updated_at();

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();
