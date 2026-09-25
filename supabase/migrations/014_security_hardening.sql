-- Adly Phase 16: Security hardening from audit findings

-- billing_events is webhook/service-role only; explicit deny for client roles
create policy "No client access to billing events"
  on public.billing_events for all
  using (false)
  with check (false);

-- user_can_access_client_workspace is for RLS policies only, not public RPC
revoke execute on function public.user_can_access_client_workspace(uuid, uuid) from public;
revoke execute on function public.user_can_access_client_workspace(uuid, uuid) from anon;
revoke execute on function public.user_can_access_client_workspace(uuid, uuid) from authenticated;
