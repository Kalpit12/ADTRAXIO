-- Phase 17.14: Experiment validation & evidence snapshots

alter table public.ai_experiments
  add column if not exists context_snapshot_json jsonb not null default '{}'::jsonb,
  add column if not exists measurement_snapshot_json jsonb not null default '{}'::jsonb;

create index if not exists ai_experiments_measurement_snapshot_idx
  on public.ai_experiments ((measurement_snapshot_json ->> 'measuredAt'));
