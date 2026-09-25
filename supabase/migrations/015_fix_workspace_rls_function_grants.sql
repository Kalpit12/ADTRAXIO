-- Phase 16 remediation: migration 014 revoked EXECUTE from authenticated, which
-- breaks RLS policies that invoke this helper. Anon/public remain revoked.

grant execute on function public.user_can_access_client_workspace(uuid, uuid) to authenticated;
