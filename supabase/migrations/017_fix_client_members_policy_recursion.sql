-- client_workspace_members SELECT policy must not call user_can_access_client_workspace
-- (that function reads this table → infinite RLS recursion).

drop policy if exists "Client members view membership" on public.client_workspace_members;

create policy "Client members view membership"
  on public.client_workspace_members for select
  using (
    -- Agency org owners see all members in their client workspaces
    exists (
      select 1
      from public.client_workspaces cw
      join public.organization_members om
        on om.organization_id = cw.agency_organization_id
       and om.user_id = auth.uid()
       and om.role = 'owner'
      where cw.id = client_workspace_members.client_workspace_id
    )
    -- Users always see their own membership row
    or client_workspace_members.user_id = auth.uid()
    -- Co-members in the same client workspace
    or exists (
      select 1
      from public.client_workspace_members cwm
      where cwm.client_workspace_id = client_workspace_members.client_workspace_id
        and cwm.user_id = auth.uid()
    )
  );
