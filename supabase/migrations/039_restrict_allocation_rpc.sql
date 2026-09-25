-- Phase 19: Restrict optimization allocation RPC to service role (server-only after auth checks)

revoke execute on function public.apply_experiment_allocation_change(uuid, uuid, jsonb)
  from authenticated;

revoke execute on function public.apply_experiment_allocation_change(uuid, uuid, jsonb)
  from anon;

grant execute on function public.apply_experiment_allocation_change(uuid, uuid, jsonb)
  to service_role;
