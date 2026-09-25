-- Phase 17.13: Experiment intelligence & decision support (extends 17.12)

alter table public.ai_experiments
  add column if not exists audience_context jsonb not null default '{}'::jsonb,
  add column if not exists platform_context jsonb not null default '{}'::jsonb,
  add column if not exists content_context jsonb not null default '{}'::jsonb,
  add column if not exists readiness_status text,
  add column if not exists evidence_quality text,
  add column if not exists interpretation_status text not null default 'pending',
  add column if not exists decision_notes text,
  add column if not exists related_experiment_ids jsonb not null default '[]'::jsonb;

create index if not exists ai_experiments_readiness_idx
  on public.ai_experiments (readiness_status);

create index if not exists ai_experiments_evidence_quality_idx
  on public.ai_experiments (evidence_quality);

create index if not exists ai_experiments_interpretation_status_idx
  on public.ai_experiments (interpretation_status);
