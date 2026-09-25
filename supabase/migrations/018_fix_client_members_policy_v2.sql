-- Use a SECURITY DEFINER helper that bypasses RLS (no client_workspace_members reads).

create schema if not exists private;

create or replace function private.is_agency_owner_for_client(
  p_client_workspace_id uuid,
  p_user_id uuid default auth.uid()
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.client_workspaces cw
    inner join public.organization_members om
      on om.organization_id = cw.agency_organization_id
     and om.user_id = p_user_id
     and om.role = 'owner'
    where cw.id = p_client_workspace_id
      and cw.status = 'active'
  );
$$;

revoke all on function private.is_agency_owner_for_client(uuid, uuid) from public;
grant execute on function private.is_agency_owner_for_client(uuid, uuid) to authenticated;

drop policy if exists "Client members view membership" on public.client_workspace_members;

create policy "Client members view membership"
  on public.client_workspace_members for select
  using (
    private.is_agency_owner_for_client(
      client_workspace_members.client_workspace_id,
      auth.uid()
    )
    or client_workspace_members.user_id = auth.uid()
  );
