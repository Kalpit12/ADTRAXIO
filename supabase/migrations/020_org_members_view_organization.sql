-- Agency members (non-owner) must read organization.type for workspace routing.

create policy "Members view their organization"
  on public.organizations for select
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = organizations.id
        and om.user_id = auth.uid()
    )
  );
