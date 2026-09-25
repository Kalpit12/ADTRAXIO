-- AUREVO onboarding schema

create type public.account_type as enum ('creator', 'business', 'agency');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  account_type public.account_type,
  profile_name text,
  industry text,
  category text,
  location text,
  website text,
  description text,
  client_count integer,
  industries_served text,
  onboarding_step integer not null default 0,
  onboarding_completed boolean not null default false,
  connect_platforms_later boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.account_type not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal text not null,
  created_at timestamptz not null default now(),
  unique (user_id, goal)
);

create table public.user_platforms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null,
  connected boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, platform)
);

create index profiles_onboarding_completed_idx on public.profiles (onboarding_completed);
create index organizations_owner_id_idx on public.organizations (owner_id);

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.user_goals enable row level security;
alter table public.user_platforms enable row level security;

create policy "Users manage own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users manage own organizations"
  on public.organizations for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Members view organizations"
  on public.organization_members for select
  using (auth.uid() = user_id);

create policy "Owners manage organization members"
  on public.organization_members for all
  using (
    exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.owner_id = auth.uid()
    )
  );

create policy "Users manage own goals"
  on public.user_goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own platforms"
  on public.user_platforms for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
