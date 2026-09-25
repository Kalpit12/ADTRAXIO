-- Fix organizations <-> organization_members RLS recursion (same pattern as 019).

create or replace function private.user_is_organization_member(
  p_organization_id uuid,
  p_user_id uuid default auth.uid()
) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);
  return exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = p_user_id
  );
end;
$$;

revoke all on function private.user_is_organization_member(uuid, uuid) from public;
grant execute on function private.user_is_organization_member(uuid, uuid) to authenticated;

drop policy if exists "Members view their organization" on public.organizations;

create policy "Members view their organization"
  on public.organizations for select
  using (
    private.user_is_organization_member(organizations.id, auth.uid())
  );

create or replace function private.is_organization_owner(
  p_organization_id uuid,
  p_user_id uuid default auth.uid()
) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);
  return exists (
    select 1
    from public.organizations o
    where o.id = p_organization_id
      and o.owner_id = p_user_id
  );
end;
$$;

revoke all on function private.is_organization_owner(uuid, uuid) from public;
grant execute on function private.is_organization_owner(uuid, uuid) to authenticated;

drop policy if exists "Owners manage organization members" on public.organization_members;

create policy "Owners insert organization members"
  on public.organization_members for insert
  with check (
    private.is_organization_owner(organization_members.organization_id, auth.uid())
  );

create policy "Owners update organization members"
  on public.organization_members for update
  using (
    private.is_organization_owner(organization_members.organization_id, auth.uid())
  )
  with check (
    private.is_organization_owner(organization_members.organization_id, auth.uid())
  );

create policy "Owners delete organization members"
  on public.organization_members for delete
  using (
    private.is_organization_owner(organization_members.organization_id, auth.uid())
  );
