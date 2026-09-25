-- "Client managers manage membership" was FOR ALL (includes SELECT) and self-recursed on cwm.

create or replace function private.can_manage_client_workspace_members(
  p_client_workspace_id uuid,
  p_user_id uuid default auth.uid()
) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);

  if private.is_agency_owner_for_client(p_client_workspace_id, p_user_id) then
    return true;
  end if;

  return exists (
    select 1
    from public.client_workspace_members cwm
    where cwm.client_workspace_id = p_client_workspace_id
      and cwm.user_id = p_user_id
      and cwm.role in ('owner', 'manager')
  );
end;
$$;

revoke all on function private.can_manage_client_workspace_members(uuid, uuid) from public;
grant execute on function private.can_manage_client_workspace_members(uuid, uuid) to authenticated;

drop policy if exists "Client managers manage membership" on public.client_workspace_members;

create policy "Client managers insert membership"
  on public.client_workspace_members for insert
  with check (
    private.can_manage_client_workspace_members(
      client_workspace_members.client_workspace_id,
      auth.uid()
    )
  );

create policy "Client managers update membership"
  on public.client_workspace_members for update
  using (
    private.can_manage_client_workspace_members(
      client_workspace_members.client_workspace_id,
      auth.uid()
    )
  )
  with check (
    private.can_manage_client_workspace_members(
      client_workspace_members.client_workspace_id,
      auth.uid()
    )
  );

create policy "Client managers delete membership"
  on public.client_workspace_members for delete
  using (
    private.can_manage_client_workspace_members(
      client_workspace_members.client_workspace_id,
      auth.uid()
    )
  );
