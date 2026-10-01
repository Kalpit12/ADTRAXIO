-- Phase 21.6: Non-destructive media edits (lineage + edit specification)

alter table public.ai_media_assets
  add column if not exists source_asset_id uuid references public.ai_media_assets (id) on delete set null;

alter table public.ai_media_assets
  add column if not exists edit_spec jsonb;

create index if not exists ai_media_assets_source_asset_idx
  on public.ai_media_assets (source_asset_id);
