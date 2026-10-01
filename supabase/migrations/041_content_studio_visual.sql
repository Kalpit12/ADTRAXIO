-- Phase 21.2: Attach generated visuals to Content Studio drafts

alter table public.content
  add column if not exists studio_visual jsonb not null default '{}'::jsonb;

create index if not exists content_studio_visual_idx
  on public.content using gin (studio_visual);
