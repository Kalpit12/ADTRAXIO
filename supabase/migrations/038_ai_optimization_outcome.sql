-- Phase 18.1: Optimization outcome intelligence (stored on proposals)

alter table public.ai_optimization_proposals
  add column if not exists outcome_json jsonb not null default '{}'::jsonb;

create index if not exists ai_optimization_proposals_outcome_status_idx
  on public.ai_optimization_proposals ((outcome_json ->> 'status'))
  where outcome_json is not null and outcome_json <> '{}'::jsonb;
