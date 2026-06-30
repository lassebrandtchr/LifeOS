-- =====================================================================
-- LifeOS – Migration 0007: Notion → Opgaver (Fase 9, Del 2)
-- ---------------------------------------------------------------------
-- Gør det muligt at importere opgaver fra Notion ind i "tasks" UDEN at
-- lave dubletter ved gen-synkronisering. Vi gemmer Notion-rækkens id på
-- opgaven (notion_id) + hvor den kom fra (source = 'notion'). Et partielt
-- unikt indeks pr. bruger sikrer, at samme Notion-opgave kun findes én gang.
-- Alt er idempotent og rører ikke eksisterende opgaver.
-- =====================================================================

alter table public.tasks
  add column if not exists source text,
  add column if not exists notion_id text;

-- Samme Notion-opgave må kun importeres én gang pr. bruger.
-- (Partielt indeks: gælder kun rækker, der rent faktisk kom fra Notion.)
create unique index if not exists tasks_user_notion_id_uidx
  on public.tasks (user_id, notion_id)
  where notion_id is not null;

-- Hurtigt opslag af allerede-importerede Notion-opgaver under sync.
create index if not exists tasks_source_idx
  on public.tasks (user_id, source)
  where source is not null;
