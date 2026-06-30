-- =====================================================================
-- LifeOS – Migration 0004: Integration Center + connector-data
-- ---------------------------------------------------------------------
-- Fase 9-fundamentet. Tre ting:
--   1) `integrations`  – pr. bruger: hvilke connectors er tændt/forbundet.
--   2) `notion_items`  – synkroniserede Notion-sider/-emner (nyt domæne).
--   3) Et par ekstra kolonner på `emails`/`calendar_events`, så vi kan
--      gemme HVOR data kom fra (kilde) og kategorisere mails.
--
-- Alt får RLS (auth.uid() = user_id) og updated_at-trigger som de øvrige
-- tabeller. Migrationen er idempotent – kan køres flere gange uden skade.
-- =====================================================================

-- --------------------------------------------------------------------
-- 1) Connector-tilstand pr. bruger.
--    connector_id matcher id'erne i features/integrations/registry.ts
--    (fx 'gmail', 'google_calendar', 'notion').
--    status: 'disconnected' | 'connected' | 'syncing' | 'error'
-- --------------------------------------------------------------------
create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  connector_id text not null,
  enabled boolean not null default false,
  status text not null default 'disconnected',
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, connector_id)
);

-- --------------------------------------------------------------------
-- 2) Notion-emner (synkroniseret ind via connector – læses kun i appen).
-- --------------------------------------------------------------------
create table if not exists public.notion_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace public.workspace not null default 'shared',
  external_id text,
  title text,
  type text,
  url text,
  snippet text,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------------
-- 3) Udvid eksisterende tabeller (idempotent via "if not exists").
--    source  = hvilken connector dataen kom fra ('gmail', 'outlook', ...).
--    category = grov mail-kategori (sat af AI senere: 'kunde', 'faktura' ...).
-- --------------------------------------------------------------------
alter table public.emails
  add column if not exists source text,
  add column if not exists category text;

alter table public.calendar_events
  add column if not exists source text,
  add column if not exists description text,
  add column if not exists all_day boolean not null default false;

-- --------------------------------------------------------------------
-- Hjælpe-indekser (hurtig opslag på det, vi oftest filtrerer på).
-- --------------------------------------------------------------------
create index if not exists idx_emails_received_at
  on public.emails (user_id, received_at desc);
create index if not exists idx_calendar_events_starts_at
  on public.calendar_events (user_id, starts_at);
create index if not exists idx_notion_items_edited_at
  on public.notion_items (user_id, edited_at desc);
create unique index if not exists idx_emails_user_external
  on public.emails (user_id, external_id) where external_id is not null;
create unique index if not exists idx_calendar_user_external
  on public.calendar_events (user_id, external_id) where external_id is not null;
create unique index if not exists idx_notion_user_external
  on public.notion_items (user_id, external_id) where external_id is not null;

-- --------------------------------------------------------------------
-- RLS + standardpolitik + updated_at-trigger på de nye tabeller.
-- Samme mønster som migration 0002.
-- --------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array['integrations', 'notion_items'];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);

    execute format($f$
      drop policy if exists "Egne data – fuld adgang" on public.%I;
      create policy "Egne data – fuld adgang"
        on public.%I for all
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id);
    $f$, t, t);

    execute format($f$
      drop trigger if exists trg_%I_updated_at on public.%I;
      create trigger trg_%I_updated_at
        before update on public.%I
        for each row execute function public.set_updated_at();
    $f$, t, t, t, t);
  end loop;
end $$;
