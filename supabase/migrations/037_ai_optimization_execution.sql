-- Phase 18.0: Controlled optimization execution (allocation_change only)

alter table public.ai_optimization_proposals
  add column if not exists execution_id uuid,
  add column if not exists execution_json jsonb not null default '{}'::jsonb,
  add column if not exists execution_lock_at timestamptz;

create unique index if not exists ai_optimization_proposals_execution_id_idx
  on public.ai_optimization_proposals (execution_id)
  where execution_id is not null;

create or replace function public.apply_experiment_allocation_change(
  p_experiment_id uuid,
  p_organization_id uuid,
  p_allocations jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_key text;
  v_pct numeric;
  v_total numeric := 0;
  v_expected int;
  v_updated int := 0;
  v_splits jsonb := '[]'::jsonb;
begin
  select status into v_status
  from ai_experiments
  where id = p_experiment_id and organization_id = p_organization_id;

  if v_status is null then
    raise exception 'experiment_not_found';
  end if;

  if v_status <> 'running' then
    raise exception 'experiment_not_running';
  end if;

  select count(*) into v_expected
  from ai_experiment_variants
  where experiment_id = p_experiment_id and organization_id = p_organization_id;

  if v_expected < 2 then
    raise exception 'insufficient_variants';
  end if;

  if (select count(*) from jsonb_object_keys(p_allocations)) <> v_expected then
    raise exception 'variant_key_mismatch';
  end if;

  for v_key, v_pct in
    select key, value::text::numeric from jsonb_each_text(p_allocations)
  loop
    if v_pct <= 0 or v_pct > 100 then
      raise exception 'invalid_allocation_percent';
    end if;
    v_total := v_total + v_pct;
    update ai_experiment_variants
    set allocation_percent = v_pct, updated_at = now()
    where experiment_id = p_experiment_id
      and organization_id = p_organization_id
      and variant_key = v_key;
    if not found then
      raise exception 'unexpected_variant';
    end if;
    v_updated := v_updated + 1;
    v_splits := v_splits || jsonb_build_object('variantKey', v_key, 'percent', v_pct);
  end loop;

  if abs(v_total - 100) > 0.01 then
    raise exception 'allocation_total_not_100';
  end if;

  update ai_experiments
  set
    allocation_json = jsonb_build_object('version', 1, 'splits', v_splits),
    allocation_type = 'fixed_split',
    updated_at = now()
  where id = p_experiment_id and organization_id = p_organization_id;

  return jsonb_build_object(
    'experimentId', p_experiment_id,
    'allocations', p_allocations,
    'total', v_total
  );
end;
$$;

revoke all on function public.apply_experiment_allocation_change(uuid, uuid, jsonb) from public;
grant execute on function public.apply_experiment_allocation_change(uuid, uuid, jsonb) to authenticated;
grant execute on function public.apply_experiment_allocation_change(uuid, uuid, jsonb) to service_role;
