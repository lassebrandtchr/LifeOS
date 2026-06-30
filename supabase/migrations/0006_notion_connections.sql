-- =====================================================================
-- LifeOS – Migration 0006: Notion-forbindelse (intern integration-token)
-- ---------------------------------------------------------------------
-- Gemmer Notion-integrationens hemmelige token pr. bruger, så LifeOS selv
-- kan læse fra Notion. RLS sikrer, at hver bruger kun rører sin egen.
-- (Token i klartekst – acceptabelt for denne personlige app med RLS.)
-- =====================================================================

create table if not exists public.notion_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token text not null,
  workspace_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notion_connections enable row level security;

drop policy if exists "Egne data – fuld adgang" on public.notion_connections;
create policy "Egne data – fuld adgang"
  on public.notion_connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists trg_notion_connections_updated_at on public.notion_connections;
create trigger trg_notion_connections_updated_at
  before update on public.notion_connections
  for each row execute function public.set_updated_at();
