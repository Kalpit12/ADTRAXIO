-- Phase 17.15: Normalized experiment evaluation on experiment record

alter table public.ai_experiments
  add column if not exists experiment_evaluation_json jsonb not null default '{}'::jsonb;

create index if not exists ai_experiments_experiment_evaluation_lifecycle_idx
  on public.ai_experiments ((experiment_evaluation_json #>> '{normalized,lifecycle}'));
