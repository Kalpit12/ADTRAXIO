-- Adly Phase 15: Harden ai_recommendations workspace isolation at RLS layer

drop policy if exists "Org members view ai recommendations" on public.ai_recommendations;
drop policy if exists "Org members manage ai recommendations" on public.ai_recommendations;

create policy "Org members view ai recommendations"
  on public.ai_recommendations for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_recommendations.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_recommendations.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_recommendations.client_workspace_id, auth.uid())
    )
  );

create policy "Org members manage ai recommendations"
  on public.ai_recommendations for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_recommendations.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_recommendations.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_recommendations.client_workspace_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_recommendations.organization_id
        and om.user_id = auth.uid()
    )
    and (
      ai_recommendations.client_workspace_id is null
      or public.user_can_access_client_workspace(ai_recommendations.client_workspace_id, auth.uid())
    )
  );
