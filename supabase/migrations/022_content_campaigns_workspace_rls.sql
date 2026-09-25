-- Phase 16: workspace isolation at RLS for content + campaigns (mirrors ai_recommendations / reports).

drop policy if exists "Org members view content studio" on public.content;
drop policy if exists "Org members manage content studio" on public.content;

create policy "Org members view content studio"
  on public.content for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = content.organization_id
        and om.user_id = auth.uid()
    )
    and (
      content.client_workspace_id is null
      or public.user_can_access_client_workspace(content.client_workspace_id, auth.uid())
    )
  );

create policy "Org members insert content studio"
  on public.content for insert
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = content.organization_id
        and om.user_id = auth.uid()
    )
    and (
      content.client_workspace_id is null
      or public.user_can_access_client_workspace(content.client_workspace_id, auth.uid())
    )
  );

create policy "Org members update content studio"
  on public.content for update
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = content.organization_id
        and om.user_id = auth.uid()
    )
    and (
      content.client_workspace_id is null
      or public.user_can_access_client_workspace(content.client_workspace_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = content.organization_id
        and om.user_id = auth.uid()
    )
    and (
      content.client_workspace_id is null
      or public.user_can_access_client_workspace(content.client_workspace_id, auth.uid())
    )
  );

create policy "Org members delete content studio"
  on public.content for delete
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = content.organization_id
        and om.user_id = auth.uid()
    )
    and (
      content.client_workspace_id is null
      or public.user_can_access_client_workspace(content.client_workspace_id, auth.uid())
    )
  );

drop policy if exists "Org members view campaigns" on public.campaigns;
drop policy if exists "Org members manage campaigns" on public.campaigns;

create policy "Org members view campaigns"
  on public.campaigns for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = campaigns.organization_id
        and om.user_id = auth.uid()
    )
    and (
      campaigns.client_workspace_id is null
      or public.user_can_access_client_workspace(campaigns.client_workspace_id, auth.uid())
    )
  );

create policy "Org members insert campaigns"
  on public.campaigns for insert
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = campaigns.organization_id
        and om.user_id = auth.uid()
    )
    and (
      campaigns.client_workspace_id is null
      or public.user_can_access_client_workspace(campaigns.client_workspace_id, auth.uid())
    )
  );

create policy "Org members update campaigns"
  on public.campaigns for update
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = campaigns.organization_id
        and om.user_id = auth.uid()
    )
    and (
      campaigns.client_workspace_id is null
      or public.user_can_access_client_workspace(campaigns.client_workspace_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = campaigns.organization_id
        and om.user_id = auth.uid()
    )
    and (
      campaigns.client_workspace_id is null
      or public.user_can_access_client_workspace(campaigns.client_workspace_id, auth.uid())
    )
  );

create policy "Org members delete campaigns"
  on public.campaigns for delete
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = campaigns.organization_id
        and om.user_id = auth.uid()
    )
    and (
      campaigns.client_workspace_id is null
      or public.user_can_access_client_workspace(campaigns.client_workspace_id, auth.uid())
    )
  );
