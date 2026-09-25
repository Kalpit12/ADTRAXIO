-- Prevent infinite RLS recursion when policies call user_can_access_client_workspace
-- and the function reads client_workspace_members (same table as the policy).

create or replace function public.user_can_access_client_workspace(
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

  return exists (
    select 1
    from public.client_workspaces cw
    join public.organization_members om
      on om.organization_id = cw.agency_organization_id
     and om.user_id = p_user_id
    where cw.id = p_client_workspace_id
      and cw.status = 'active'
      and (
        om.role = 'owner'
        or exists (
          select 1
          from public.client_workspace_members cwm
          where cwm.client_workspace_id = cw.id
            and cwm.user_id = p_user_id
        )
      )
  );
end;
$$;

revoke all on function public.user_can_access_client_workspace(uuid, uuid) from public;
revoke execute on function public.user_can_access_client_workspace(uuid, uuid) from anon;
grant execute on function public.user_can_access_client_workspace(uuid, uuid) to authenticated;
